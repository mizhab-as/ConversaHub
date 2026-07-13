import os
import logging
import hashlib
from typing import List, Union
import chromadb
from langchain_core.embeddings import Embeddings
from langchain_google_genai import GoogleGenerativeAIEmbeddings

from app.core.config import settings

logger = logging.getLogger(__name__)

# Persistent ChromaDB location within the workspace
CHROMA_PERSIST_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "chroma_db")
)


class MockEmbeddings(Embeddings):
    """
    Deterministic mock embedding generator for local/offline testing.
    Outputs standard 768-dimensional float arrays from SHA-256 hashes.
    """
    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        results = []
        for text in texts:
            # Generate a SHA-256 hash of the text
            hasher = hashlib.sha256(text.encode("utf-8"))
            hex_digest = hasher.hexdigest()
            # Construct a 768-dimension vector by cycling through the hex values
            # and mapping them to float values in [0.0, 1.0]
            vector = []
            for i in range(768):
                char = hex_digest[i % len(hex_digest)]
                val = int(char, 16) / 15.0
                # Add index-based variance to distinguish overlapping cycles
                vector.append(val * (1.0 + (i / 768.0) * 0.1))
            results.append(vector)
        return results

    def embed_query(self, text: str) -> List[float]:
        return self.embed_documents([text])[0]


def get_embedding_model() -> Union[GoogleGenerativeAIEmbeddings, MockEmbeddings]:
    """
    Returns active GoogleGenerativeAIEmbeddings if a valid API key is present.
    Otherwise, returns MockEmbeddings for offline/test environments.
    """
    api_key = settings.GEMINI_API_KEY
    if api_key and api_key.startswith("AIzaSy"):
        logger.info("Initializing active GoogleGenerativeAIEmbeddings model...")
        return GoogleGenerativeAIEmbeddings(
            model="models/text-embedding-004",
            google_api_key=api_key
        )
    else:
        if api_key:
            logger.warning("Detected invalid/dummy GEMINI_API_KEY format (must start with 'AIzaSy'). Falling back to MockEmbeddings.")
        else:
            logger.warning("No GEMINI_API_KEY detected. Initializing MockEmbeddings...")
        return MockEmbeddings()


def get_chroma_client() -> chromadb.PersistentClient:
    """
    Initializes and returns a persistent ChromaDB client inside the workspace.
    """
    os.makedirs(CHROMA_PERSIST_DIR, exist_ok=True)
    logger.info(f"Connecting to persistent ChromaDB at: {CHROMA_PERSIST_DIR}")
    return chromadb.PersistentClient(path=CHROMA_PERSIST_DIR)
