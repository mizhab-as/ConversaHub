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
def get_llm(temperature: float = 0.0) -> Any:
    """
    Dynamically loads and returns the appropriate LLM client based on the active environment keys:
    1. Anthropic (Claude 3.5 Sonnet) if ANTHROPIC_API_KEY is present
    2. OpenAI (GPT-4o mini) if OPENAI_API_KEY is present
    3. Groq (Llama-3.3 70B) if GROQ_API_KEY is present
    4. Google Gemini (Gemini Flash) if GEMINI_API_KEY is present
    5. Fallback to MockLLM if no key is present.
    """
    # 1. Anthropic
    anthropic_key = settings.ANTHROPIC_API_KEY
    if anthropic_key:
        logger.info("Initializing active ChatAnthropic engine (claude-3-5-sonnet-latest)...")
        from langchain_anthropic import ChatAnthropic
        return ChatAnthropic(
            model="claude-3-5-sonnet-latest",
            temperature=temperature,
            api_key=anthropic_key,
            max_retries=1
        )

    # 2. OpenAI
    openai_key = settings.OPENAI_API_KEY
    if openai_key:
        logger.info("Initializing active ChatOpenAI engine (gpt-4o-mini)...")
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            model="gpt-4o-mini",
            temperature=temperature,
            api_key=openai_key,
            max_retries=1
        )

    # 3. Groq
    groq_key = settings.GROQ_API_KEY
    if groq_key:
        logger.info("Initializing active ChatGroq engine (llama-3.3-70b-versatile)...")
        from langchain_groq import ChatGroq
        return ChatGroq(
            model="llama-3.3-70b-versatile",
            temperature=temperature,
            api_key=groq_key,
            max_retries=1
        )

    # 4. Google Gemini — supports both legacy AIzaSy and new AQ. format keys
    gemini_key = settings.GEMINI_API_KEY
    if gemini_key:
        logger.info("Initializing active ChatGoogleGenerativeAI engine (key format: %s)...", gemini_key[:6])
        return ChatGoogleGenerativeAI(
            model="gemini-2.0-flash",
            temperature=temperature,
            google_api_key=gemini_key,
            max_retries=1
        )

    # 5. Local Mock Fallback
    logger.warning("No active LLM provider keys detected in .env. Initializing MockLLM engine...")
    return MockLLM()


# 4. LangGraph Node Definitions

def get_message_text(content: Any) -> str:
    """
    Safely extracts string text from AIMessage.content, which can be a string or a list of blocks.
    """
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        text_parts = []
        for block in content:
            if isinstance(block, dict) and block.get("type") == "text":
                text_parts.append(block.get("text", ""))
            elif isinstance(block, str):
                text_parts.append(block)
        return "".join(text_parts)
    return str(content)


def clean_json_response(content: str) -> str:
    """
    Cleans markdown code block wrappers (e.g. ```json ... ```) from JSON response content if present.
    """
    content = content.strip()
    if content.startswith("```json"):
        content = content[7:]
    elif content.startswith("```"):
        content = content[3:]
    if content.endswith("```"):
        content = content[:-3]
    return content.strip()


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
        raw_text = get_message_text(response.content)
        cleaned_content = clean_json_response(raw_text)
        routing_data = json.loads(cleaned_content)
        target = routing_data.get("routing_target", "general")
        reason = routing_data.get("reason", "")
    except Exception as e:
        logger.error(f"Router node failed to parse model JSON: {e}. Raw content: {response.content}")
        target = "general"
        reason = f"Failed to parse model response: {str(e)}"
        
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
        final_text = get_message_text(response.content)
        
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
