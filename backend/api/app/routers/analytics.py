from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, status, Query
from app.clients import CONVERSATION_DB
from typing import List, Optional
from enum import Enum

class HotKeyword(BaseModel):
    keyword: str
    frequency: int

class HotKeywordsResponse(BaseModel):
    keywords: List[HotKeyword]

class TimeInterval(str, Enum):
    hour = "hour"
    day = "day"
    week = "week"
    month = "month"
    all = "all"

class HourlyCount(BaseModel):
    hour: str
    count: int

class HourlyQueryCountResponse(BaseModel):
    days: int
    trend: List[HourlyCount]

class KeywordHourlyCount(BaseModel):
    keyword: str
    hour: str
    count: int

class HourlyKeywordCountResponse(BaseModel):
    days: int
    trend: List[KeywordHourlyCount]

class UserCount(BaseModel):
    user_id: str
    count: int

class TopUsersResponse(BaseModel):
    days: Optional[int]
    users: List[UserCount]

class UserQuery(BaseModel):
    hour: str
    query: str
    score: Optional[float] = None

class UserQueriesResponse(BaseModel):
    user_id: str
    days: int
    hourly_counts: List[HourlyCount]
    total_queries: int

class UserHourlyCount(BaseModel):
    user_id: str
    hour: str
    count: int

class AllUserQueriesResponse(BaseModel):
    days: int
    queries: List[UserHourlyCount]

class DailyScore(BaseModel):
    date: str
    avg_score: float

class DailyScoresResponse(BaseModel):
    days: int
    scores: List[DailyScore]
    overall_avg: float

class CitationCount(BaseModel):
    citation: str
    count: int

class CitationCountsResponse(BaseModel):
    citations: List[CitationCount]

class DailyKeyword(BaseModel):
    keyword: str
    count: int

class DailyTopKeywords(BaseModel):
    date: str
    keywords: List[DailyKeyword]

class DailyTopKeywordsResponse(BaseModel):
    days: int
    daily_keywords: List[DailyTopKeywords]

class DailyUserEngagement(BaseModel):
    user_id: str
    count: int

class DailyEngagement(BaseModel):
    date: str
    users: List[DailyUserEngagement]

class DailyUserEngagementResponse(BaseModel):
    days: int
    daily_engagement: List[DailyEngagement]

router = APIRouter(
    prefix="/v1/analytics",
    tags=["analytics"],
    responses={404: {"description": "Not found"}},
)

@router.get("/hot-keywords", response_model=HotKeywordsResponse)
async def get_hot_keywords(
    limit: int = Query(10, description="Maximum number of hot keywords to return", ge=1, le=100),
    conversation_id: Optional[str] = Query(None, description="Optional conversation ID to filter results")
):
    """
    Get the most frequently used keywords across all queries.
    Args:
        limit: Maximum number of hot keywords to return (default: 10)
        conversation_id: Optional conversation ID to filter results
    Returns:
        List of hot keywords with their frequencies
    """
    try:
        hot_keywords = CONVERSATION_DB.get_hot_keywords(limit=limit, conversation_id=conversation_id)
        return HotKeywordsResponse(
            keywords=[
                HotKeyword(keyword=kw, frequency=freq)
                for kw, freq in hot_keywords
            ]
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get hot keywords: {str(e)}"
        )

@router.get("/hourly-query-count", response_model=HourlyQueryCountResponse)
async def get_hourly_query_count(
    days: int = Query(7, description="Number of days to look back", ge=1, le=30)
):
    """
    Get hourly query counts for the past N days.
    Args:
        days: Number of days to look back (1-30)
    Returns:
        Hourly query counts
    """
    try:
        counts = CONVERSATION_DB.get_hourly_query_count(days)
        return HourlyQueryCountResponse(
            days=days,
            trend=[HourlyCount(hour=c['hour'], count=c['count']) for c in counts]
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get hourly query counts: {str(e)}"
        )

@router.get("/top-users", response_model=TopUsersResponse)
async def get_top_users(
    days: Optional[int] = Query(None, description="Number of days to look back (None for all time)", ge=1, le=365),
    limit: int = Query(10, description="Maximum number of users to return", ge=1, le=100),
    conversation_id: Optional[str] = Query(None, description="Optional conversation ID to filter results")
):
    """
    Get top users ranked by number of queries.
    Args:
        days: Optional number of days to look back (None for all time)
        limit: Maximum number of users to return (1-100)
        conversation_id: Optional conversation ID to filter results
    Returns:
        List of users with their query counts, ordered by count descending
    """
    try:
        users = CONVERSATION_DB.get_top_users(days=days, limit=limit, conversation_id=conversation_id)
        return TopUsersResponse(
            days=days,
            users=[
                UserCount(
                    user_id=u['user_id'],
                    count=u['count']
                ) for u in users
            ]
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get top users: {str(e)}"
        )

@router.get("/citation-counts", response_model=CitationCountsResponse)
async def get_citation_counts():
    """
    Get total query counts grouped by citation.
    Returns:
        List of citations with their query counts
    """
    try:
        counts = CONVERSATION_DB.get_citation_counts()
        return CitationCountsResponse(
            citations=[
                CitationCount(
                    citation=c['citation'],
                    count=c['count']
                ) for c in counts
            ]
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get citation counts: {str(e)}"
        )

@router.get("/daily-scores", response_model=DailyScoresResponse)
async def get_daily_scores():
    """
    Get average query scores grouped by day for the past 7 days.
    Returns:
        Daily average scores and overall average
    """
    try:
        daily_scores = CONVERSATION_DB.get_daily_average_scores()
        
        # Calculate overall average
        if daily_scores:
            overall_avg = round(
                sum(day['avg_score'] for day in daily_scores) / len(daily_scores),
                2
            )
        else:
            overall_avg = 0.0
        
        return DailyScoresResponse(
            days=7,
            scores=[
                DailyScore(
                    date=day['date'],
                    avg_score=day['avg_score']
                ) for day in daily_scores
            ],
            overall_avg=overall_avg
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get daily scores: {str(e)}"
        )

@router.get("/daily-top-keywords", response_model=DailyTopKeywordsResponse)
async def get_daily_top_keywords():
    """
    Get top 10 keywords for each day in the past 7 days.
    Returns:
        Daily top keywords with their counts
    """
    try:
        daily_keywords = CONVERSATION_DB.get_daily_top_keywords(days=7, limit=10)
        return DailyTopKeywordsResponse(
            days=7,
            daily_keywords=[
                DailyTopKeywords(
                    date=day['date'],
                    keywords=[
                        DailyKeyword(
                            keyword=kw['keyword'],
                            count=kw['count']
                        ) for kw in day['keywords']
                    ]
                ) for day in daily_keywords
            ]
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get daily top keywords: {str(e)}"
        )

@router.get("/daily-user-engagement", response_model=DailyUserEngagementResponse)
async def get_daily_user_engagement():
    """
    Get daily user engagement stats for the past 7 days.
    Returns:
        Daily user event counts grouped by user and date
    """
    try:
        engagement_data = CONVERSATION_DB.get_daily_user_engagement(days=7)
        return DailyUserEngagementResponse(
            days=7,
            daily_engagement=[
                DailyEngagement(
                    date=day['date'],
                    users=[
                        DailyUserEngagement(
                            user_id=user['user_id'],
                            count=user['count']
                        ) for user in day['users']
                    ]
                ) for day in engagement_data
            ]
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get daily user engagement: {str(e)}"
        )
