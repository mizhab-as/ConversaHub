import uuid
import logging
from typing import List, Dict, Any
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.services.vector_store import get_chroma_client, get_embedding_model

logger = logging.getLogger(__name__)

COLLECTION_NAME = "kb_articles"


async def ingest_text(text: str, source_metadata: Dict[str, Any]) -> int:
    """
    Splits text into chunks, computes embeddings, and stores them in ChromaDB.
    Returns the number of chunks successfully ingested.
    """
    client = get_chroma_client()
    collection = client.get_or_create_collection(name=COLLECTION_NAME)
    
    # 1. Chunk document
    splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
    chunks = splitter.split_text(text)
    
    if not chunks:
        logger.warning("Empty document text passed for RAG ingestion.")
        return 0
        
    # 2. Generate embeddings
    embeddings_model = get_embedding_model()
    embeddings = embeddings_model.embed_documents(chunks)
    
    # 3. Save to vector collection
    ids = [str(uuid.uuid4()) for _ in chunks]
    metadatas = [{**source_metadata, "chunk_index": i} for i, _ in enumerate(chunks)]
    
    collection.add(
        ids=ids,
        embeddings=embeddings,
        metadatas=metadatas,
        documents=chunks
    )
    logger.info(f"Ingested {len(chunks)} chunks from document metadata: {source_metadata}")
    return len(chunks)


async def search_knowledge_base(query: str, limit: int = 3) -> str:
    """
    Performs vector similarity search on the knowledge base collection.
    Returns matching document chunks concatenated as a single string.
    """
    client = get_chroma_client()
    collection = client.get_or_create_collection(name=COLLECTION_NAME)
    
    count = collection.count()
    if count == 0:
        logger.info("ChromaDB knowledge base collection is currently empty.")
        return ""
        
    # Generate query embedding
    embeddings_model = get_embedding_model()
    query_vector = embeddings_model.embed_query(query)
    
    # Query Chroma
    results = collection.query(
        query_embeddings=[query_vector],
        n_results=min(limit, count)
    )
    
    documents = results.get("documents", [])
    if not documents or not documents[0]:
        return ""
        
    # Concatenate matching segments
    return "\n---\n".join(documents[0])


async def clear_knowledge_base() -> None:
    """
    Helper function to wipe out the collection index. Useful for resets/testing.
    """
    client = get_chroma_client()
    try:
        client.delete_collection(name=COLLECTION_NAME)
        logger.info("Cleared RAG knowledge base collection successfully.")
    except Exception:
        pass

    # Also clean up uploads folder
    import os
    import shutil
    uploads_dir = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "..", "uploads")
    )
    if os.path.exists(uploads_dir):
        for filename in os.listdir(uploads_dir):
            file_path = os.path.join(uploads_dir, filename)
            try:
                if os.path.isfile(file_path) or os.path.islink(file_path):
                    os.unlink(file_path)
                elif os.path.isdir(file_path):
                    shutil.rmtree(file_path)
            except Exception as e:
                logger.error(f"Failed to delete {file_path}. Reason: {e}")


async def list_kb_documents() -> List[Dict[str, Any]]:
    """
    Retrieves all indexed documents by grouping ChromaDB chunk metadatas.
    """
    client = get_chroma_client()
    collection = client.get_or_create_collection(name=COLLECTION_NAME)
    results = collection.get(include=["metadatas"])
    metadatas = results.get("metadatas") or []

    docs = {}
    for meta in metadatas:
        if not meta or "doc_id" not in meta:
            continue
        doc_id = meta["doc_id"]
        if doc_id not in docs:
            docs[doc_id] = {
                "doc_id": doc_id,
                "title": meta.get("title", "Untitled"),
                "filename": meta.get("filename", "Unknown"),
                "file_type": meta.get("file_type", "Unknown"),
                "uploaded_by": meta.get("uploaded_by", "Unknown"),
                "uploaded_at": meta.get("uploaded_at", ""),
                "chunks": 0
            }
        docs[doc_id]["chunks"] += 1
    return list(docs.values())


async def delete_kb_document(doc_id: str) -> None:
    """
    Deletes all chunks of a document from ChromaDB and removes the physical file.
    """
    client = get_chroma_client()
    collection = client.get_or_create_collection(name=COLLECTION_NAME)

    # 1. Get filename from metadata before deleting
    results = collection.get(where={"doc_id": doc_id}, limit=1, include=["metadatas"])
    metadatas = results.get("metadatas") or []
    filename = None
    if metadatas and metadatas[0]:
        filename = metadatas[0].get("filename")

    # 2. Delete from Chroma
    collection.delete(where={"doc_id": doc_id})

    # 3. Delete physical file if found
    if filename:
        import os
        uploads_dir = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "..", "uploads")
        )
        file_path = os.path.join(uploads_dir, f"{doc_id}_{filename}")
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
                logger.info(f"Deleted physical file at: {file_path}")
            except Exception as e:
                logger.error(f"Failed to delete physical file {file_path}: {e}")


def extract_text_from_file(file_content: bytes, filename: str) -> str:
    """
    Extracts text from PDF, DOCX, TXT, or MD files.
    """
    import fitz  # PyMuPDF
    import docx
    import io

    ext = filename.split(".")[-1].lower()
    if ext in ("txt", "md"):
        return file_content.decode("utf-8", errors="ignore")
    elif ext == "pdf":
        doc = fitz.open(stream=file_content, filetype="pdf")
        text = ""
        for page in doc:
            text += page.get_text()
        return text
    elif ext == "docx":
        doc = docx.Document(io.BytesIO(file_content))
        text = "\n".join([paragraph.text for paragraph in doc.paragraphs])
        return text
    else:
        raise ValueError(f"Unsupported file format: {ext}")

