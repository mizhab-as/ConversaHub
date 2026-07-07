from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.api.deps import RoleChecker, get_current_active_user
from app.models.user import User
from app.services.rag_service import ingest_text, search_knowledge_base, clear_knowledge_base, COLLECTION_NAME
from app.services.vector_store import get_chroma_client

router = APIRouter()

# Schema models
class KnowledgeBaseUpload(BaseModel):
    title: str = Field(..., min_length=2, max_length=100, description="Title of the help article.")
    content: str = Field(..., min_length=10, description="Raw markdown/text content of the help article.")


class IngestionResponse(BaseModel):
    message: str
    chunks: int


class CollectionStatus(BaseModel):
    collection_name: str
    total_chunks: int


# Access control dependencies
get_admin_user = RoleChecker(["Admin"])
get_staff_user = RoleChecker(["Admin", "Support Agent"])


@router.post("/upload", response_model=IngestionResponse, status_code=status.HTTP_201_CREATED)
async def upload_help_article(
    article: KnowledgeBaseUpload,
    current_user: User = Depends(get_admin_user)
):
    """
    Upload a help article to the RAG knowledge base.
    Restricted to Admin users.
    """
    metadata = {
        "title": article.title,
        "author": current_user.email
    }
    chunks = await ingest_text(article.content, metadata)
    return {
        "message": f"Help article '{article.title}' successfully ingested.",
        "chunks": chunks
    }


@router.get("/status", response_model=CollectionStatus)
async def get_kb_status(
    current_user: User = Depends(get_staff_user)
):
    """
    Check the total count of vector chunks indexed in the knowledge base.
    Restricted to Admins and Support Agents.
    """
    client = get_chroma_client()
    collection = client.get_or_create_collection(name=COLLECTION_NAME)
    return {
        "collection_name": COLLECTION_NAME,
        "total_chunks": collection.count()
    }


@router.post("/clear", response_model=Dict[str, str] if False else Any)
async def clear_kb(
    current_user: User = Depends(get_admin_user)
):
    """
    Wipe out all vector records in the knowledge base.
    Restricted to Admin users.
    """
    await clear_knowledge_base()
    return {"message": "Knowledge base index wiped successfully."}
