from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Form
from pydantic import BaseModel, Field

from app.api.deps import RoleChecker, get_current_active_user
from app.models.user import User
from app.services.rag_service import (
    ingest_text,
    search_knowledge_base,
    clear_knowledge_base,
    COLLECTION_NAME,
    list_kb_documents,
    delete_kb_document,
    extract_text_from_file
)
from app.services.vector_store import get_chroma_client

router = APIRouter()

# Schema models
class IngestionResponse(BaseModel):
    message: str
    chunks: int


class CollectionStatus(BaseModel):
    collection_name: str
    total_chunks: int


# Access control dependencies
get_admin_user = RoleChecker(["admin"])
get_staff_user = RoleChecker(["admin", "agent"])


@router.post("/upload", response_model=IngestionResponse, status_code=status.HTTP_201_CREATED)
async def upload_help_article(
    title: str = Form(..., min_length=2, max_length=100),
    file: UploadFile = File(...),
    current_user: User = Depends(get_admin_user)
):
    """
    Upload a help document (PDF, DOCX, TXT, MD) to the RAG knowledge base.
    Restricted to Admin users.
    """
    import uuid
    import os
    from datetime import datetime

    filename = file.filename or "uploaded_file"
    file_type = filename.split(".")[-1].lower()

    if file_type not in ("pdf", "docx", "txt", "md"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format: .{file_type}. Supported: .pdf, .docx, .txt, .md"
        )

    doc_id = str(uuid.uuid4())
    uploads_dir = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "..", "uploads")
    )
    os.makedirs(uploads_dir, exist_ok=True)
    file_path = os.path.join(uploads_dir, f"{doc_id}_{filename}")

    try:
        file_content = await file.read()
        
        # Save raw file locally
        with open(file_path, "wb") as f:
            f.write(file_content)

        # Extract text
        extracted_text = extract_text_from_file(file_content, filename)
        
        # Prepare metadata
        metadata = {
            "doc_id": doc_id,
            "title": title,
            "filename": filename,
            "file_type": file_type,
            "uploaded_by": current_user.email,
            "uploaded_at": datetime.now().isoformat()
        }

        # Ingest to ChromaDB
        chunks = await ingest_text(extracted_text, metadata)

        return {
            "message": f"Document '{filename}' successfully ingested.",
            "chunks": chunks
        }
    except Exception as e:
        # Clean up local file on failure
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception:
                pass
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to process file: {str(e)}"
        )


@router.get("/documents", response_model=List[Dict[str, Any]])
async def get_documents(
    current_user: User = Depends(get_staff_user)
):
    """
    List all uploaded documents in the knowledge base.
    Restricted to Admins and Support Agents.
    """
    return await list_kb_documents()


@router.delete("/documents/{doc_id}")
async def delete_document(
    doc_id: str,
    current_user: User = Depends(get_admin_user)
):
    """
    Delete an individual document and all its chunks from the knowledge base.
    Restricted to Admin users.
    """
    await delete_kb_document(doc_id)
    return {"message": "Document deleted successfully."}


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


@router.post("/clear", response_model=Dict[str, str])
async def clear_kb(
    current_user: User = Depends(get_admin_user)
):
    """
    Wipe out all vector records in the knowledge base and clear uploaded files.
    Restricted to Admin users.
    """
    await clear_knowledge_base()
    return {"message": "Knowledge base index and raw documents wiped successfully."}

