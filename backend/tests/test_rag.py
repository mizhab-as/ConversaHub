import pytest
from httpx import AsyncClient

from app.services.rag_service import clear_knowledge_base, search_knowledge_base, ingest_text


@pytest.fixture(autouse=True)
async def cleanup_rag():
    """
    Ensure the vector store is clean before and after each RAG test.
    """
    await clear_knowledge_base()
    yield
    await clear_knowledge_base()


@pytest.mark.asyncio
async def test_rag_upload_and_permissions(client: AsyncClient):
    """
    Test permissions (RBAC) on the knowledge base upload and clear endpoints.
    """
    # 1. Sign up/login Admin and Customer
    admin_email = "admin_rag@example.com"
    cust_email = "cust_rag@example.com"
    password = "password123"

    # Create admin
    await client.post("/api/v1/auth/signup", json={"email": admin_email, "password": password, "role": "Admin"})
    admin_login = await client.post("/api/v1/auth/login", data={"username": admin_email, "password": password})
    admin_token = admin_login.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Create customer
    await client.post("/api/v1/auth/signup", json={"email": cust_email, "password": password, "role": "Customer"})
    cust_login = await client.post("/api/v1/auth/login", data={"username": cust_email, "password": password})
    cust_token = cust_login.json()["access_token"]
    cust_headers = {"Authorization": f"Bearer {cust_token}"}

    # 2. Upload article as Customer (should return 403)
    payload = {
        "title": "Unauthorized Article",
        "content": "This is content uploaded by an unauthorized user."
    }
    resp = await client.post("/api/v1/kb/upload", json=payload, headers=cust_headers)
    assert resp.status_code == 403

    # 3. Upload article as Admin (should return 201)
    payload_admin = {
        "title": "Password Reset Guide",
        "content": "To reset your password, visit the login page and click 'Forgot Password'. Follow the link sent to your email."
    }
    resp_admin = await client.post("/api/v1/kb/upload", json=payload_admin, headers=admin_headers)
    assert resp_admin.status_code == 201
    assert resp_admin.json()["chunks"] > 0

    # 4. Check status as Customer (should return 403 - Customer is not staff)
    resp_status = await client.get("/api/v1/kb/status", headers=cust_headers)
    assert resp_status.status_code == 403

    # 5. Check status as Admin (should return 200)
    resp_status_admin = await client.get("/api/v1/kb/status", headers=admin_headers)
    assert resp_status_admin.status_code == 200
    assert resp_status_admin.json()["total_chunks"] > 0


@pytest.mark.asyncio
async def test_direct_similarity_search():
    """
    Test direct ingestion and similarity search methods of rag_service.
    """
    # Ingest text
    title = "Refund Policy"
    content = "Customers can request a full refund within 14 days of purchase. Refund processing takes 3-5 business days."
    chunks_added = await ingest_text(content, {"title": title})
    assert chunks_added > 0

    # Search knowledge base
    context = await search_knowledge_base("How many days do I have to request a refund?")
    assert "refund within 14 days" in context


@pytest.mark.asyncio
async def test_end_to_end_agent_rag_chat(client: AsyncClient):
    """
    Verify that user queries matching RAG routing target correctly retrieve
    context chunks and inject them into the LLM prompt.
    """
    # 1. Sign up/login Admin to upload article
    admin_email = "admin_rag_chat@example.com"
    cust_email = "cust_rag_chat@example.com"
    password = "password123"

    await client.post("/api/v1/auth/signup", json={"email": admin_email, "password": password, "role": "Admin"})
    admin_login = await client.post("/api/v1/auth/login", data={"username": admin_email, "password": password})
    admin_token = admin_login.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Upload document
    payload = {
        "title": "Password Support",
        "content": "To reset your password, visit the login page and click 'Forgot Password'. Follow the link sent to your email."
    }
    await client.post("/api/v1/kb/upload", json=payload, headers=admin_headers)

    # 2. Login customer and ask password query
    await client.post("/api/v1/auth/signup", json={"email": cust_email, "password": password, "role": "Customer"})
    cust_login = await client.post("/api/v1/auth/login", data={"username": cust_email, "password": password})
    cust_token = cust_login.json()["access_token"]
    cust_headers = {"Authorization": f"Bearer {cust_token}"}

    chat_payload = {"message": "How do I reset my password?"}
    chat_resp = await client.post("/api/v1/chat/message", json=chat_payload, headers=cust_headers)
    assert chat_resp.status_code == 200
    
    data = chat_resp.json()
    assert data["routing_target"] == "rag"
    # Verify that RAG context was retrieved and returned by the MockLLM parser
    assert "Forgot Password" in data["response"]
    assert "Sourced from KB" in data["response"]
