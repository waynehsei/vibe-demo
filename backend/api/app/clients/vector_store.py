import bs4
from app.constant import OPENAI_API_KEY
from langchain_openai import OpenAIEmbeddings
from langchain_core.vectorstores import InMemoryVectorStore

def get_vector_store():
    # Initialize embeddings and vector store
    embeddings = OpenAIEmbeddings(openai_api_key=OPENAI_API_KEY)
    vector_store = InMemoryVectorStore(embeddings)
    return vector_store

VECTOR_STORE = get_vector_store()
