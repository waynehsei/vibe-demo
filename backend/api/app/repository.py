import os
from typing import Optional, List, Tuple
from langchain_community.document_loaders import (
    TextLoader,
    PyPDFLoader,
    CSVLoader
)
from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.clients import VECTOR_STORE

class MaterialStore:
    
    def __init__(self):
        self.materials: List[Tuple[str, str]] = []
    
    def add_material(self, file_id: str, file_name: str):
        self.materials.append((file_id, file_name))
    
    def get_materials(self) -> List[Tuple[str, str]]:
        return self.materials

# Initialize material store
MATERIAL_STORE = MaterialStore()

def save_vector(file_id: str, file_path: str) -> Optional[str]:
    """
    Load file, chunk it, and save to vector store.
    Returns error message if failed, None if successful.
    """
    def get_file_loader(file_path: str):
        """Get appropriate loader based on file extension."""
        ext = os.path.splitext(file_path)[1].lower()
        if ext == '.pdf':
            return PyPDFLoader(file_path)
        elif ext == '.csv':
            return CSVLoader(file_path)
        elif ext in ['.txt', '.md']:
            return TextLoader(file_path)
        else:
            raise ValueError(f"Unsupported file type: {ext}")
    try:
        # Get appropriate loader
        loader = get_file_loader(file_path)
        
        # Load documents
        documents = loader.load()

        # Overwrite the `source` metadata
        for doc in documents:
            doc.metadata["source"] = file_id
        
        # Split into chunks
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200
        )
        chunks = text_splitter.split_documents(documents)
        
        # Add to vector store
        VECTOR_STORE.add_documents(chunks)
        
        return None
    except Exception as e:
        return str(e)

def fetch_docs(query: str):
    """Fetch relevant documents from vector store."""
    return VECTOR_STORE.similarity_search(query, k=2)

