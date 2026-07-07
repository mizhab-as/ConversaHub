import pytest
from httpx import AsyncClient
from sqlalchemy import select

from app.models.ticket import Ticket
from app.repositories.ticket import TicketRepository


@pytest.mark.asyncio
async def test_create_and_query_tickets(client: AsyncClient, db_session):
    """
    Test direct ticket creation and visibility boundaries (RBAC/Multi-tenant).
    - Customers see only their own tickets.
    - Staff (Agents/Admins) see all active tickets.
    """
    # 1. Sign up users
    cust_a = "cust_a@example.com"
    cust_b = "cust_b@example.com"
    agent_s = "agent_s@example.com"
    password = "password123"

    await client.post("/api/v1/auth/signup", json={"email": cust_a, "password": password, "role": "customer"})
    login_a = await client.post("/api/v1/auth/login", data={"username": cust_a, "password": password})
    token_a = login_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    await client.post("/api/v1/auth/signup", json={"email": cust_b, "password": password, "role": "customer"})
    login_b = await client.post("/api/v1/auth/login", data={"username": cust_b, "password": password})
    token_b = login_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    await client.post("/api/v1/auth/signup", json={"email": agent_s, "password": password, "role": "agent"})
    login_s = await client.post("/api/v1/auth/login", data={"username": agent_s, "password": password})
    token_s = login_s.json()["access_token"]
    headers_s = {"Authorization": f"Bearer {token_s}"}

    # 2. Customer A creates a ticket
    payload_a = {
        "subject": "Billing Glitch",
        "description": "I was double charged for the enterprise subscription.",
        "priority": "high"
    }
    resp_create_a = await client.post("/api/v1/tickets", json=payload_a, headers=headers_a)
    assert resp_create_a.status_code == 201
    ticket_id_a = resp_create_a.json()["id"]

    # 3. Customer B creates a ticket
    payload_b = {
        "subject": "Connection Lag",
        "description": "AI agent connection is dropping during live chat sessions.",
        "priority": "medium"
    }
    resp_create_b = await client.post("/api/v1/tickets", json=payload_b, headers=headers_b)
    assert resp_create_b.status_code == 201

    # 4. Customer A queries tickets (should see 1 ticket)
    resp_list_a = await client.get("/api/v1/tickets", headers=headers_a)
    assert resp_list_a.status_code == 200
    assert len(resp_list_a.json()) == 1
    assert resp_list_a.json()[0]["subject"] == "Billing Glitch"

    # 5. Customer B queries tickets (should see 1 ticket)
    resp_list_b = await client.get("/api/v1/tickets", headers=headers_b)
    assert resp_list_b.status_code == 200
    assert len(resp_list_b.json()) == 1
    assert resp_list_b.json()[0]["subject"] == "Connection Lag"

    # 6. Support Agent S queries tickets (should see 2 active tickets)
    resp_list_s = await client.get("/api/v1/tickets", headers=headers_s)
    assert resp_list_s.status_code == 200
    assert len(resp_list_s.json()) == 2


@pytest.mark.asyncio
async def test_assign_and_resolve_tickets(client: AsyncClient, db_session):
    """
    Test staff-only routes: assigning tickets and closing/resolving tickets.
    """
    # 1. Sign up Customer and Agent
    cust_email = "cust_perm@example.com"
    agent_email = "agent_perm@example.com"
    password = "password123"

    await client.post("/api/v1/auth/signup", json={"email": cust_email, "password": password, "role": "customer"})
    login_c = await client.post("/api/v1/auth/login", data={"username": cust_email, "password": password})
    token_c = login_c.json()["access_token"]
    headers_c = {"Authorization": f"Bearer {token_c}"}

    await client.post("/api/v1/auth/signup", json={"email": agent_email, "password": password, "role": "agent"})
    login_a = await client.post("/api/v1/auth/login", data={"username": agent_email, "password": password})
    token_a = login_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # 2. Customer creates a ticket
    payload = {"subject": "Need refund", "description": "Wrong charge on invoice.", "priority": "low"}
    resp_create = await client.post("/api/v1/tickets", json=payload, headers=headers_c)
    ticket_id = resp_create.json()["id"]

    # 3. Customer attempts to assign ticket (should yield 403)
    resp_assign_c = await client.put(f"/api/v1/tickets/{ticket_id}/assign", headers=headers_c)
    assert resp_assign_c.status_code == 403

    # 4. Support Agent assigns ticket to self
    resp_assign_a = await client.put(f"/api/v1/tickets/{ticket_id}/assign", headers=headers_a)
    assert resp_assign_a.status_code == 200
    assert resp_assign_a.json()["status"] == "assigned"
    assert resp_assign_a.json()["assigned_agent_id"] is not None

    # 5. Support Agent resolves the ticket
    update_payload = {"status": "resolved"}
    resp_resolve = await client.put(f"/api/v1/tickets/{ticket_id}/status", json=update_payload, headers=headers_a)
    assert resp_resolve.status_code == 200
    assert resp_resolve.json()["status"] == "resolved"


@pytest.mark.asyncio
async def test_ai_agent_escalation_triggers_database_ticket(client: AsyncClient, db_session):
    """
    Verify that if a customer triggers AI escalation via chat,
    the LangGraph agent creates an actual ticket inside the SQL database.
    """
    # 1. Sign up Customer
    cust_email = "escalation_chat@example.com"
    password = "password123"

    await client.post("/api/v1/auth/signup", json={"email": cust_email, "password": password, "role": "customer"})
    login_c = await client.post("/api/v1/auth/login", data={"username": cust_email, "password": password})
    token_c = login_c.json()["access_token"]
    headers_c = {"Authorization": f"Bearer {token_c}"}

    # 2. Customer sends escalation query to AI agent
    chat_payload = {"message": "Please connect me to a human manager immediately! I am very angry."}
    chat_resp = await client.post("/api/v1/chat/message", json=chat_payload, headers=headers_c)
    assert chat_resp.status_code == 200
    
    data = chat_resp.json()
    assert data["routing_target"] == "escalate"
    assert "Support ticket generated for human agent review" in data["response"]
    assert "Ticket ID:" in data["response"]

    # 3. Verify ticket was actually created in database and is visible to the customer
    resp_list = await client.get("/api/v1/tickets", headers=headers_c)
    assert resp_list.status_code == 200
    assert len(resp_list.json()) == 1
    assert "AI Escalation" in resp_list.json()[0]["subject"]
    assert "angry" in resp_list.json()[0]["description"]
    assert resp_list.json()[0]["status"] == "open"
