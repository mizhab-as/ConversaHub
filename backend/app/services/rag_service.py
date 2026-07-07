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
