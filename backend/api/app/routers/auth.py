from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, status, Depends
from app.clients import CONVERSATION_DB
from typing import List, Optional

class UserRegistration(BaseModel):
    user_id: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)

class UserLogin(BaseModel):
    user_id: str
    password: str

class AuthResponse(BaseModel):
    user_id: str
    conversation_id: str

router = APIRouter(
    prefix="/v1/auth",
    tags=["authentication"],
    responses={404: {"description": "Not found"}},
)

@router.post("/register", response_model=AuthResponse)
async def register_user(registration: UserRegistration):
    """
    Register a new user with a password.
    This automatically creates a single conversation for the user.
    
    Args:
        registration: User registration details including user_id and password
        
    Returns:
        User ID and a new conversation ID
    """
    if conversation_id := CONVERSATION_DB.register_user(registration.user_id, registration.password):
        return AuthResponse(
            user_id=registration.user_id,
            conversation_id=conversation_id
        )

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="User ID already exists or registration failed"
    )

@router.post("/login", response_model=AuthResponse)
async def login_user(login: UserLogin):
    """
    Authenticate a user and return their conversation ID.
    Each user has exactly one conversation.
    
    Args:
        login: User login credentials including user_id and password
        
    Returns:
        User ID and conversation ID if authentication is successful
    """
    if not CONVERSATION_DB.authenticate_user(login.user_id, login.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    try:
        # Get the user's conversation ID
        conversation_id = CONVERSATION_DB.get_user_conversation_id(login.user_id)
        
        if not conversation_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found for this user. Please contact support."
            )
        
        return AuthResponse(
            user_id=login.user_id,
            conversation_id=conversation_id
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to login: {str(e)}"
        )
