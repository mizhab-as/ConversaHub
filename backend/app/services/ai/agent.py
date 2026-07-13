import json
import logging
from typing import Any, Dict, List, Optional, TypedDict, Union
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage, ToolMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.graph import END, StateGraph

from app.core.config import settings
from app.services.ai.prompts import RESPONDER_SYSTEM_PROMPT, ROUTER_SYSTEM_PROMPT
from app.services.ai.tools import tools, book_appointment_tool, escalate_to_human_tool
from app.services.rag_service import search_knowledge_base

logger = logging.getLogger(__name__)

# 1. State definition
class AgentState(TypedDict):
    messages: List[BaseMessage]
    routing_target: str       # "rag", "escalate", "general"
    routing_reason: str
    rag_context: str
    response: str
    db: Optional[Any]
    user_id: Optional[int]


# 2. Mock LLM for offline testing / fallback
class MockLLM:
    """
    Mock LLM Client that simulates ChatGoogleGenerativeAI's behavior.
    Ensures tests pass and the system runs locally without requiring active API keys.
    """
    def bind_tools(self, tools_list: List[Any]):
        return self  # Return self to allow chaining

    def invoke(self, messages: List[BaseMessage], *args, **kwargs) -> AIMessage:
        # Find the user's last message
        last_message = ""
        for m in reversed(messages):
            if isinstance(m, HumanMessage):
                last_message = m.content.lower()
                break
                
        # Identify if we are running the Router prompt
        is_router = False
        for m in messages:
            if isinstance(m, SystemMessage) and "incoming request triage manager" in m.content.lower():
                is_router = True
                break

        if is_router:
            # Simulate classification
            if any(k in last_message for k in ["human", "agent", "refund", "frustrated", "manager"]):
                target = "escalate"
            elif any(k in last_message for k in ["help", "troubleshoot", "how", "password", "reset", "docs", "kb", "knowledge"]):
                target = "rag"
            else:
                target = "general"
            return AIMessage(content=json.dumps({"routing_target": target, "reason": "Rule-based mock routing decision"}))

        # Simulate responder logic (including function calls)
        if any(k in last_message for k in ["human", "agent", "escalate", "person"]):
            return AIMessage(
                content="",
                additional_kwargs={
                    "tool_calls": [
                        {
                            "id": "call_mock_esc",
                            "type": "function",
                            "function": {
                                "name": "escalate_to_human_tool",
                                "arguments": json.dumps({"reason": "Customer requested human support agent."})
                            }
                        }
                    ]
                }
            )
        elif any(k in last_message for k in ["book", "schedule", "appointment", "meeting"]):
            return AIMessage(
                content="",
                additional_kwargs={
                    "tool_calls": [
                        {
                            "id": "call_mock_book",
                            "type": "function",
                            "function": {
                                "name": "book_appointment_tool",
                                "arguments": json.dumps({"date": "2026-07-08", "time": "14:00", "details": "Dev test booking"})
                            }
                        }
                    ]
                }
            )
        elif "troubleshoot" in last_message:
            return AIMessage(content="[Mock AI] Based on the docs, try restarting your server. Did that help?")
        elif "password" in last_message:
            rag_val = ""
            for m in messages:
                if isinstance(m, SystemMessage) and "RAG Context" in m.content:
                    parts = m.content.split("to answer the query:\n")
                    if len(parts) > 1:
                        rag_val = parts[1].strip()
            content = f"[Mock AI] Sourced from KB: {rag_val}" if rag_val else "[Mock AI] Sourced from KB: Password reset help page."
            return AIMessage(content=content)
        else:
            return AIMessage(content="[Mock AI] Welcome to ConversaHub Support! How can I assist you today?")


# 3. Model Loader Factory
def get_llm(temperature: float = 0.0) -> Union[ChatGoogleGenerativeAI, MockLLM]:
    """
    Returns ChatGoogleGenerativeAI if a valid API key is present.
    Otherwise, returns MockLLM for local development.
    """
    api_key = settings.GEMINI_API_KEY
    if api_key and api_key.startswith("AIzaSy"):
        logger.info("Initializing active ChatGoogleGenerativeAI engine...")
        return ChatGoogleGenerativeAI(
            model="gemini-1.5-flash",
            temperature=temperature,
            google_api_key=api_key
        )
    else:
        if api_key:
            logger.warning("Detected invalid/dummy GEMINI_API_KEY format (must start with 'AIzaSy'). Falling back to MockLLM.")
        else:
            logger.warning("No GEMINI_API_KEY detected. Initializing MockLLM engine...")
        return MockLLM()


# 4. LangGraph Node Definitions

async def router_node(state: AgentState) -> Dict[str, Any]:
    """
    Analyzes user message and routes to the appropriate next node.
    """
    llm = get_llm(temperature=0.0)
    messages = [
        SystemMessage(content=ROUTER_SYSTEM_PROMPT),
        HumanMessage(content=state["messages"][-1].content)
    ]
    
    response = llm.invoke(messages)
    try:
        routing_data = json.loads(response.content)
        target = routing_data.get("routing_target", "general")
        reason = routing_data.get("reason", "")
    except Exception:
        target = "general"
        reason = "Failed to parse model response"
        
    return {
        "routing_target": target,
        "routing_reason": reason
    }


async def retriever_node(state: AgentState) -> Dict[str, Any]:
    """
    Queries vector database (RAG) using similarity search.
    """
    query = state["messages"][-1].content
    logger.info(f"Querying vector database context for: {query}")
    context = await search_knowledge_base(query, limit=3)
    return {"rag_context": context}


async def responder_node(state: AgentState) -> Dict[str, Any]:
    """
    Invokes the LLM to generate response, handling tools if returned.
    """
    llm = get_llm(temperature=0.2)
    # Bind our appointment and escalation tools to the model
    llm_with_tools = llm.bind_tools(tools)
    
    # 1. Construct messages with prompt context
    system_prompt = RESPONDER_SYSTEM_PROMPT
    if state.get("rag_context"):
        system_prompt += f"\n\nHere is RAG Context from the knowledge base to answer the query:\n{state['rag_context']}"
        
    messages = [SystemMessage(content=system_prompt)] + state["messages"]
    
    response = llm_with_tools.invoke(messages)
    
    # 2. Check if the model requested any tool calls
    tool_calls = response.additional_kwargs.get("tool_calls", [])
    if tool_calls:
        logger.info(f"Model requested tool calls: {tool_calls}")
        tool_outputs = []
        for call in tool_calls:
            func_name = call["function"]["name"]
            arguments = json.loads(call["function"]["arguments"])
            
            # Execute the tool function
            if func_name == "book_appointment_tool":
                output = book_appointment_tool.invoke(arguments)
            elif func_name == "escalate_to_human_tool":
                db = state.get("db")
                user_id = state.get("user_id")
                if db and user_id:
                    from app.repositories.ticket import TicketRepository
                    ticket_repo = TicketRepository(db)
                    ticket_data = {
                        "user_id": user_id,
                        "subject": f"AI Escalation: {arguments.get('reason', 'General Support Request')}",
                        "description": f"AI support conversation escalated.\\nUser query: {state['messages'][-1].content}\\nReason: {arguments.get('reason')}",
                        "priority": "high",
                        "status": "open",
                        "assigned_agent_id": None
                    }
                    db_ticket = await ticket_repo.create(obj_in=ticket_data)
                    output = f"Success: Support ticket generated for human agent review. Ticket ID: {db_ticket.id}. Reason: {arguments.get('reason')}"
                else:
                    output = escalate_to_human_tool.invoke(arguments)
            else:
                output = f"Error: Tool {func_name} not found."
                
            tool_outputs.append(output)
            
        # Return the tool execution status to user
        final_text = "\n".join(tool_outputs)
    else:
        final_text = response.content
        
    return {"response": final_text}


# 5. Graph Compilation

def route_after_router(state: AgentState) -> str:
    """
    Conditional edge router node.
    """
    target = state["routing_target"]
    if target == "rag":
        return "retriever"
    return "responder"


# Set up state graph workflow
workflow = StateGraph(AgentState)

# Add nodes
workflow.add_node("router", router_node)
workflow.add_node("retriever", retriever_node)
workflow.add_node("responder", responder_node)

# Connect edges
workflow.set_entry_point("router")

workflow.add_conditional_edges(
    "router",
    route_after_router,
    {
        "retriever": "retriever",
        "responder": "responder"
    }
)

workflow.add_edge("retriever", "responder")
workflow.add_edge("responder", END)

# Compile the agent state graph
agent_app = workflow.compile()
