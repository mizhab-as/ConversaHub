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
    await client.post("/api/v1/auth/signup", json={"email": admin_email, "password": password, "role": "admin"})
    admin_login = await client.post("/api/v1/auth/login", data={"username": admin_email, "password": password})
    admin_token = admin_login.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Create customer
    await client.post("/api/v1/auth/signup", json={"email": cust_email, "password": password, "role": "customer"})
    cust_login = await client.post("/api/v1/auth/login", data={"username": cust_email, "password": password})
    cust_token = cust_login.json()["access_token"]
    cust_headers = {"Authorization": f"Bearer {cust_token}"}

    # 2. Upload article as Customer (should return 403)
    data = {"title": "Unauthorized Article"}
    files = {"file": ("test_doc.txt", b"This is content uploaded by an unauthorized user.", "text/plain")}
    resp = await client.post("/api/v1/kb/upload", data=data, files=files, headers=cust_headers)
    assert resp.status_code == 403

    # 3. Upload article as Admin (should return 201)
    data_admin = {"title": "Password Reset Guide"}
    files_admin = {"file": ("test_doc.txt", b"To reset your password, visit the login page and click 'Forgot Password'. Follow the link sent to your email.", "text/plain")}
    resp_admin = await client.post("/api/v1/kb/upload", data=data_admin, files=files_admin, headers=admin_headers)
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

    await client.post("/api/v1/auth/signup", json={"email": admin_email, "password": password, "role": "admin"})
    admin_login = await client.post("/api/v1/auth/login", data={"username": admin_email, "password": password})
    admin_token = admin_login.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Upload document
    data = {"title": "Password Support"}
    files = {"file": ("test_doc.txt", b"To reset your password, visit the login page and click 'Forgot Password'. Follow the link sent to your email.", "text/plain")}
    await client.post("/api/v1/kb/upload", data=data, files=files, headers=admin_headers)

    # 2. Login customer and ask password query
    await client.post("/api/v1/auth/signup", json={"email": cust_email, "password": password, "role": "customer"})
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


@pytest.mark.asyncio
async def test_kb_documents_list_and_delete(client: AsyncClient):
    """
    Test listing and deleting documents in KB.
    """
    # 1. Sign up/login Admin
    admin_email = "admin_kb_list@example.com"
    password = "password123"
    await client.post("/api/v1/auth/signup", json={"email": admin_email, "password": password, "role": "admin"})
    admin_login = await client.post("/api/v1/auth/login", data={"username": admin_email, "password": password})
    admin_token = admin_login.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 2. Upload document
    data = {"title": "Doc to List"}
    files = {"file": ("list_doc.txt", b"This document will be listed and then deleted.", "text/plain")}
    await client.post("/api/v1/kb/upload", data=data, files=files, headers=admin_headers)

    # 3. List documents
    list_resp = await client.get("/api/v1/kb/documents", headers=admin_headers)
    assert list_resp.status_code == 200
    docs = list_resp.json()
    assert len(docs) == 1
    assert docs[0]["title"] == "Doc to List"
    assert docs[0]["filename"] == "list_doc.txt"
    doc_id = docs[0]["doc_id"]

    # 4. Delete document
    del_resp = await client.delete(f"/api/v1/kb/documents/{doc_id}", headers=admin_headers)
    assert del_resp.status_code == 200

    # 5. List again (should be empty)
    list_resp_2 = await client.get("/api/v1/kb/documents", headers=admin_headers)
    assert list_resp_2.status_code == 200
    assert len(list_resp_2.json()) == 0
