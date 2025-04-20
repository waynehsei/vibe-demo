import uvicorn
import os
import shutil
from fastapi import FastAPI
from app.routers import material, conversations, analytics, auth
from app.constant import DATA_DIR
from fastapi.middleware.cors import CORSMiddleware

def init_data_directory():
    """Initialize data directory by removing existing one and creating fresh."""
    # Remove existing data directory if it exists
    if os.path.exists(DATA_DIR):
        shutil.rmtree(DATA_DIR)
    # Create fresh data directory
    os.makedirs(DATA_DIR, exist_ok=True)

app = FastAPI(
    docs_url="/docs",
    redoc_url=None,
    openapi_url="/openapi.json"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize data directory on startup
init_data_directory()

app.include_router(auth.router)  # Include auth router first
app.include_router(material.router)
app.include_router(conversations.router)
app.include_router(analytics.router)


if __name__ == "__main__":
    uvicorn.run(app="main:app", host="0.0.0.0", port=8000, reload=True)
