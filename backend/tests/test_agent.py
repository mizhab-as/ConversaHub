import pytest
from httpx import AsyncClient

from app.services.ai.agent import agent_app
from langchain_core.messages import HumanMessage


@pytest.mark.asyncio
async def test_langgraph_router_classification():
    """
    Test individual routing nodes inside the LangGraph state machine.
    Verifies classification boundaries.
    """
    # 1. RAG query
    state_rag = {"messages": [HumanMessage(content="How do I reset my password?")]}
    result = await agent_app.ainvoke(state_rag)
    assert result["routing_target"] == "rag"
    
    # 2. Escalation request
    state_esc = {"messages": [HumanMessage(content="I want to speak with a human manager, I demand a refund!")]}
    result = await agent_app.ainvoke(state_esc)
    assert result["routing_target"] == "escalate"

    # 3. General chat
    state_gen = {"messages": [HumanMessage(content="Hello! Nice to meet you.")]}
    result = await agent_app.ainvoke(state_gen)
    assert result["routing_target"] == "general"


@pytest.mark.asyncio
async def test_agent_api_chat_flow(client: AsyncClient):
    """
    Test the FastAPI endpoint connecting the client to the LangGraph Agent.
    """
    # 1. Sign up and login to get customer token
    email = "agent_test@example.com"
    password = "password123"
    await client.post("/api/v1/auth/signup", json={"email": email, "password": password})
    login_resp = await client.post("/api/v1/auth/login", data={"username": email, "password": password})
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Test general greeting chat
    chat_payload = {"message": "Hi, who are you?"}
    response = await client.post("/api/v1/chat/message", json=chat_payload, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "Mock AI" in data["response"] or "ConversaHub" in data["response"]
    assert data["routing_target"] == "general"

    # 3. Test RAG document question routing
    chat_payload_rag = {"message": "I need help troubleshooting my setup."}
    response = await client.post("/api/v1/chat/message", json=chat_payload_rag, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "troubleshoot" in data["response"] or "restart" in data["response"]
    assert data["routing_target"] == "rag"

    # 4. Test tool calling: human escalation
    chat_payload_esc = {"message": "Get me a human agent immediately!"}
    response = await client.post("/api/v1/chat/message", json=chat_payload_esc, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "Success: Support ticket generated" in data["response"]
    assert data["routing_target"] == "escalate"

    # 5. Test tool calling: appointment booking
    chat_payload_book = {"message": "I want to book an appointment with support."}
    response = await client.post("/api/v1/chat/message", json=chat_payload_book, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "Success: Appointment successfully booked" in data["response"]
