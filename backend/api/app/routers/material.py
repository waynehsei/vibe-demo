import os
import random
from pydantic import BaseModel
from fastapi import APIRouter, UploadFile, File, HTTPException, status
from app.repository import save_vector, MATERIAL_STORE
from typing import Optional, List
from app.constant import DATA_DIR

class FileResponse(BaseModel):
    file_id: str
    status: str
    error: Optional[str] = None

class MaterialInfo(BaseModel):
    file_id: str
    file_name: str

class MaterialListResponse(BaseModel):
    materials: List[MaterialInfo]

router = APIRouter(
    prefix="/v1",
    tags=["material"],
    responses={404: {"description": "Not found"}},
)

@router.get("/materials", response_model=MaterialListResponse)
async def list_materials():
    """List all available materials from the material store."""
    material_list = MATERIAL_STORE.get_materials()
    return MaterialListResponse(
        materials=[
            MaterialInfo(file_id=file_id, file_name=file_name)
            for file_id, file_name in material_list
        ]
    )

@router.post("/files", response_model=FileResponse)
async def upload_file(file: UploadFile = File(...)):
    """Upload and process a file (PDF, CSV, or text)."""
    # Generate file_id with 5 random digits + original filename
    file_id = ''.join(str(random.randint(0, 9)) for _ in range(5))
    file_name = f"{file_id}_{file.filename}"
    file_path = os.path.join(DATA_DIR, file_name)
    
    # Check if file already exists
    if os.path.exists(file_path):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File with ID '{file_name}' already exists"
        )
    
    try:
        # Save file
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # Process file and save to vector store
        error = save_vector(file_id, file_path)
        
        if error:
            # If processing failed, delete the file
            os.remove(file_path)
            return FileResponse(
                file_id=file_id,
                status="failed",
                error=error
            )
        
        # Add to material store
        MATERIAL_STORE.add_material(file_id, file.filename)
        
        return FileResponse(
            file_id=file_id,
            status="success"
        )
        
    except Exception as e:
        # If any error occurs, ensure file is deleted
        if os.path.exists(file_path):
            os.remove(file_path)
        return FileResponse(
            file_id=file_id,
            status="failed",
            error=str(e)
        )
