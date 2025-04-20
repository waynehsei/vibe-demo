from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, status, Query
from app.graph import GRAPH
from app.clients import CONVERSATION_DB
from app.evaluate import evaluate_answer, summarize_messages
from typing import List, Optional
from datetime import datetime
from app.constant import BOT_ID

class Conversation(BaseModel):
    user_id: str

class Message(BaseModel):
    user_id: str
    content: str

class MessageResponse(BaseModel):
    id: str
    user_id: str
    content: str
    created_at: datetime

class MessagesResponse(BaseModel):
    conversation_id: str
    messages: List[MessageResponse]
    total_messages: int

class ConversationSummaryResponse(BaseModel):
    conversation_id: str
    summary: str
    message_count: int

router = APIRouter(
    prefix="/v1",
    tags=["conversations"],
    responses={404: {"description": "Not found"}},
)

@router.get("/conversations/{conversation_id}/messages", response_model=MessagesResponse)
async def get_messages(
    conversation_id: str,
    keywords: Optional[List[str]] = Query(None, description="Filter messages by keywords")
):
    """
    Get all messages for a conversation with optional keyword filtering.
    Args:
        conversation_id: ID of the conversation
        keywords: Optional list of keywords to filter messages
    Returns:
        List of messages ordered by timestamp
    """
    conversation = CONVERSATION_DB.get_conversation(conversation_id)
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    try:
        messages = CONVERSATION_DB.get_messages(conversation_id, keywords)
        return MessagesResponse(
            conversation_id=conversation_id,
            messages=[
                MessageResponse(
                    id=msg['id'],
                    user_id=msg['user_id'],
                    content=msg['content'],
                    created_at=datetime.fromisoformat(msg['created_at'])
                ) for msg in messages
            ],
            total_messages=len(messages),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get messages: {str(e)}"
        )

@router.post("/conversations")
async def post_conversation(
    req: Conversation,
):
    try:
        conversation_id = CONVERSATION_DB.create_conversation(req.user_id)
        return {"conversation_id": conversation_id}
    except Exception as e:
        print(e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create conversation: {str(e)}"
        )

@router.post("/conversations/{conversation_id}/messages", status_code=201)
async def post_messages(
    conversation_id: str,
    payload: Message,
):
    conversation = CONVERSATION_DB.get_conversation(conversation_id)
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )

    # Process with graph
    last_ai_message = None
    for step in GRAPH.stream(
        {"messages": [{"role": "user", "content": payload.content}]},
        stream_mode="values",
        config = {"configurable": {"thread_id": conversation_id}},
    ):
        step["messages"][-1].pretty_print()
        last_ai_message = step["messages"][-1]

    citations = last_ai_message.additional_kwargs.get("citations", [])
    context = last_ai_message.additional_kwargs.get("context", None)
    score = evaluate_answer(payload.content, last_ai_message.content, context)

    if not last_ai_message:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process message"
        )
    
    content =  f"{last_ai_message.content}\n\nsource: {''.join([f"[{c}]" for c in citations])}" if citations else last_ai_message.content
    
    try:
        CONVERSATION_DB.add_message_with_response_and_event(
            conversation_id=conversation_id,
            user_message=payload.content,
            user_id=payload.user_id,
            bot_message=content,
            query=payload.content,
            score=score,
            citations=citations
        )
        return {"message": content}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save messages and event: {str(e)}"
        )

@router.get("/conversations/{conversation_id}/summary", response_model=ConversationSummaryResponse)
async def get_conversation_summary(conversation_id: str):
    """
    Get a summary of all messages in a conversation.
    Args:
        conversation_id: ID of the conversation to summarize
    Returns:
        A summary of the conversation and total message count
    """
    conversation = CONVERSATION_DB.get_conversation(conversation_id)
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    try:
        messages = CONVERSATION_DB.get_messages(conversation_id)
        summary = summarize_messages(messages)
        return ConversationSummaryResponse(
            conversation_id=conversation_id,
            summary=summary,
            message_count=len(messages)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get conversation summary: {str(e)}"
        )
