import sqlite3
from datetime import datetime, timedelta
import uuid
from typing import List, Dict, Optional, Tuple
from app.constant import DEFAULT_CONVERSATION_ID, SLACK_CONVERSATION_ID, USER_ID, BOT_ID

class ConversationDB:
    def __init__(self, db_path: str = 'conversations.db'):
        self.conn = sqlite3.connect(db_path)
        self.cursor = self.conn.cursor()
        self._init_tables()
    
    def _init_tables(self):
        # Drop existing tables to recreate with correct schema
        self.cursor.execute('DROP TABLE IF EXISTS messages')
        self.cursor.execute('DROP TABLE IF EXISTS conversations')
        self.cursor.execute('DROP TABLE IF EXISTS events')
        
        # Create conversations table
        self.cursor.execute('''
        CREATE TABLE IF NOT EXISTS conversations (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        ''')
        
        # Create messages table with new schema
        self.cursor.execute('''
        CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            conversation_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (conversation_id) REFERENCES conversations (id)
        )
        ''')

        # Create events table
        self.cursor.execute('''
        CREATE TABLE IF NOT EXISTS events (
            event_id TEXT PRIMARY KEY,
            conversation_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            query TEXT NOT NULL,
            score REAL,
            citations TEXT,
            key_words TEXT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (conversation_id) REFERENCES conversations (id)
        )
        ''')
        
        # Initialize default conversations
        self.cursor.execute(
            'INSERT INTO conversations (id, user_id) VALUES (?, ?)',
            (DEFAULT_CONVERSATION_ID, USER_ID)
        )
        self.cursor.execute(
            'INSERT INTO conversations (id, user_id) VALUES (?, ?)',
            (SLACK_CONVERSATION_ID, USER_ID)
        )
        
        # Add welcome message to default conversation
        self.cursor.execute(
            'INSERT INTO messages (id, conversation_id, user_id, content) VALUES (?, ?, ?, ?)',
            (str(uuid.uuid4()), DEFAULT_CONVERSATION_ID, BOT_ID, "Hello! How can I help you today?")
        )
        
        self.conn.commit()
    
    def create_conversation(self, user_id: str) -> str:
        conversation_id = str(uuid.uuid4())
        self.cursor.execute(
            'INSERT INTO conversations (id, user_id) VALUES (?, ?)',
            (conversation_id, user_id)
        )
        self.conn.commit()
        return conversation_id
    
    def get_conversation(self, conversation_id: str) -> Optional[Dict]:
        self.cursor.execute(
            'SELECT * FROM conversations WHERE id = ?',
            (conversation_id,)
        )
        result = self.cursor.fetchone()
        if not result:
            return None
        return {
            'id': result[0],
            'user_id': result[1],
            'created_at': result[2],
            'updated_at': result[3]
        }
    
    def add_message(self, conversation_id: str, user_id: str, content: str):
        message_id = str(uuid.uuid4())
        
        self.cursor.execute(
            'INSERT INTO messages (id, conversation_id, user_id, content) VALUES (?, ?, ?, ?)',
            (message_id, conversation_id, user_id, content)
        )
        self.cursor.execute(
            'UPDATE conversations SET updated_at = ? WHERE id = ?',
            (datetime.now(), conversation_id)
        )
        self.conn.commit()
    
    def get_messages(self, conversation_id: str, keywords: Optional[List[str]] = None) -> List[Dict]:
        """
        Get messages for a conversation with optional keyword filtering.
        Args:
            conversation_id: ID of the conversation
            keywords: Optional list of keywords to filter messages
        Returns:
            List of messages ordered by creation timestamp
        """
        if keywords:
            placeholders = ','.join('?' * len(keywords))
            keyword_conditions = ' OR '.join(['content LIKE ?' for _ in keywords])
            keyword_params = [f'%{keyword}%' for keyword in keywords]
            
            self.cursor.execute(f'''
                SELECT 
                    id,
                    user_id,
                    content,
                    created_at
                FROM messages 
                WHERE conversation_id = ?
                AND ({keyword_conditions})
                ORDER BY created_at ASC
            ''', [conversation_id] + keyword_params)
        else:
            self.cursor.execute('''
                SELECT 
                    id,
                    user_id,
                    content,
                    created_at
                FROM messages 
                WHERE conversation_id = ?
                ORDER BY created_at ASC
            ''', (conversation_id,))
        
        return [
            {
                'id': row[0],
                'user_id': row[1],
                'content': row[2],
                'created_at': row[3]
            }
            for row in self.cursor.fetchall()
        ]
    
    def create_event(self, user_id: str, conversation_id: str, query: str, score: float, citations: List[str] = None) -> str:
        """Create a new event entry with citations and key_words."""
        event_id = str(uuid.uuid4())
        
        # Process citations
        citations_str = "|".join(citations) if citations else ""
        
        # Process key_words from query
        key_words = "|".join(query.split())
        
        self.cursor.execute(
            'INSERT INTO events (event_id, conversation_id, user_id, query, score, citations, key_words) VALUES (?, ?, ?, ?, ?, ?, ?)',
            (event_id, conversation_id, user_id, query, score, citations_str, key_words)
        )
        self.conn.commit()
        return event_id
    
    def get_hot_keywords(self, limit: int = 10, conversation_id: Optional[str] = None) -> List[Tuple[str, int]]:
        """
        Get the most frequently used keywords across all queries.
        Args:
            limit: Maximum number of hot keywords to return
            conversation_id: Optional conversation ID to filter results
        Returns:
            List of tuples (keyword, frequency) ordered by frequency desc
        """
        base_query = '''
            WITH RECURSIVE
            split(keyword, rest, key_words) AS (
                SELECT 
                    '',
                    key_words || '|',
                    key_words
                FROM events
                {where_clause}
                UNION ALL
                SELECT
                    substr(rest, 0, instr(rest, '|')),
                    substr(rest, instr(rest, '|') + 1),
                    key_words
                FROM split
                WHERE rest <> ''
            )
            SELECT 
                keyword,
                COUNT(*) as frequency
            FROM split
            WHERE keyword <> ''
            GROUP BY keyword
            ORDER BY frequency DESC, keyword
            LIMIT ?
        '''
        
        if conversation_id:
            where_clause = "WHERE key_words IS NOT NULL AND conversation_id = ?"
            query = base_query.format(where_clause=where_clause)
            self.cursor.execute(query, (conversation_id, limit))
        else:
            where_clause = "WHERE key_words IS NOT NULL"
            query = base_query.format(where_clause=where_clause)
            self.cursor.execute(query, (limit,))
        
        return [(row[0], row[1]) for row in self.cursor.fetchall()]
    
    def get_hourly_query_count(self, days: int = 7) -> List[Dict]:
        """
        Get hourly query counts for the past N days.
        Args:
            days: Number of days to look back
        Returns:
            List of dicts with hour and count
        """
        cutoff_date = datetime.now() - timedelta(days=days)
        
        self.cursor.execute('''
            SELECT 
                strftime('%Y-%m-%d %H:00:00', timestamp) as hour,
                COUNT(*) as count
            FROM events
            WHERE timestamp >= ?
            GROUP BY hour
            ORDER BY hour
        ''', (cutoff_date.isoformat(),))
        
        return [{'hour': row[0], 'count': row[1]} for row in self.cursor.fetchall()]
    
    def get_top_users(self, days: Optional[int] = None, limit: int = 10, conversation_id: Optional[str] = None) -> List[Dict]:
        """
        Get top users ranked by number of queries.
        Args:
            days: Optional number of days to look back (None for all time)
            limit: Maximum number of users to return
            conversation_id: Optional conversation ID to filter results
        Returns:
            List of dicts with user_id and count
        """
        conditions = []
        params = []
        
        if days is not None:
            cutoff_date = datetime.now() - timedelta(days=days)
            conditions.append("timestamp >= ?")
            params.append(cutoff_date.isoformat())
        
        if conversation_id:
            conditions.append("conversation_id = ?")
            params.append(conversation_id)
        
        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        
        query = f'''
            SELECT 
                user_id,
                COUNT(*) as count
            FROM events
            {where_clause}
            GROUP BY user_id
            ORDER BY count DESC
            LIMIT ?
        '''
        
        params.append(limit)
        self.cursor.execute(query, params)
        
        return [
            {
                'user_id': row[0],
                'count': row[1]
            }
            for row in self.cursor.fetchall()
        ]
    
    def get_daily_average_scores(self, days: int = 7) -> List[Dict]:
        """
        Get average query scores grouped by day for the past N days.
        Only includes events where score is NOT NULL and greater than 0.
        Args:
            days: Number of days to look back
        Returns:
            List of dicts with date and average score
        """
        cutoff_date = datetime.now() - timedelta(days=days)
        
        self.cursor.execute('''
            SELECT 
                date(timestamp) as day,
                ROUND(AVG(score), 2) as avg_score
            FROM events
            WHERE timestamp >= ?
            AND score IS NOT NULL 
            AND score > 0
            GROUP BY day
            ORDER BY day DESC
        ''', (cutoff_date.isoformat(),))
        
        return [
            {
                'date': row[0],
                'avg_score': float(row[1]) if row[1] is not None else None
            }
            for row in self.cursor.fetchall()
        ]
    
    def get_citation_counts(self) -> List[Dict]:
        """
        Get total query counts grouped by citation.
        Returns:
            List of dicts with citation and count
        """
        self.cursor.execute('''
            WITH RECURSIVE
            split(citation, rest, citations) AS (
                SELECT 
                    '',
                    citations || '|',
                    citations
                FROM events
                WHERE citations IS NOT NULL
                UNION ALL
                SELECT
                    substr(rest, 0, instr(rest, '|')),
                    substr(rest, instr(rest, '|') + 1),
                    citations
                FROM split
                WHERE rest <> ''
            )
            SELECT 
                citation,
                COUNT(*) as count
            FROM split
            WHERE citation <> ''
            GROUP BY citation
            ORDER BY count DESC, citation
        ''')
        
        return [
            {
                'citation': row[0],
                'count': row[1]
            }
            for row in self.cursor.fetchall()
        ]
    
    def get_daily_top_keywords(self, days: int = 7, limit: int = 10) -> List[Dict]:
        """
        Get top keywords for each day in the past N days.
        Args:
            days: Number of days to look back
            limit: Maximum number of keywords per day
        Returns:
            List of dicts with date and top keywords
        """
        cutoff_date = datetime.now() - timedelta(days=days)
        
        self.cursor.execute('''
            WITH RECURSIVE
            split(keyword, rest, key_words, day) AS (
                SELECT 
                    '',
                    key_words || '|',
                    key_words,
                    date(timestamp)
                FROM events
                WHERE key_words IS NOT NULL
                AND timestamp >= ?
                UNION ALL
                SELECT
                    substr(rest, 0, instr(rest, '|')),
                    substr(rest, instr(rest, '|') + 1),
                    key_words,
                    day
                FROM split
                WHERE rest <> ''
            ),
            daily_keywords AS (
                SELECT 
                    day,
                    keyword,
                    COUNT(*) as count,
                    ROW_NUMBER() OVER (PARTITION BY day ORDER BY COUNT(*) DESC, keyword) as rank
                FROM split
                WHERE keyword <> ''
                GROUP BY day, keyword
            )
            SELECT 
                day,
                keyword,
                count
            FROM daily_keywords
            WHERE rank <= ?
            ORDER BY day DESC, count DESC, keyword
        ''', (cutoff_date.isoformat(), limit))
        
        results = []
        current_day = None
        day_keywords = []
        
        for row in self.cursor.fetchall():
            day, keyword, count = row
            
            if current_day != day and current_day is not None:
                results.append({
                    'date': current_day,
                    'keywords': day_keywords
                })
                day_keywords = []
            
            current_day = day
            day_keywords.append({
                'keyword': keyword,
                'count': count
            })
        
        if day_keywords:  # Add the last day
            results.append({
                'date': current_day,
                'keywords': day_keywords
            })
        
        return results
    
    def get_daily_user_engagement(self, days: int = 7) -> List[Dict]:
        """
        Get daily user engagement stats for the past N days.
        Args:
            days: Number of days to look back
        Returns:
            List of dicts with date, user_id, and event count
        """
        cutoff_date = datetime.now() - timedelta(days=days)
        
        self.cursor.execute('''
            SELECT 
                date(timestamp) as day,
                user_id,
                COUNT(*) as event_count
            FROM events
            WHERE timestamp >= ?
            GROUP BY day, user_id
            ORDER BY day DESC, event_count DESC
        ''', (cutoff_date.isoformat(),))
        
        results = []
        current_day = None
        day_users = []
        
        for row in self.cursor.fetchall():
            day, user_id, count = row
            
            if current_day != day and current_day is not None:
                results.append({
                    'date': current_day,
                    'users': day_users
                })
                day_users = []
            
            current_day = day
            day_users.append({
                'user_id': user_id,
                'count': count
            })
        
        if day_users:  # Add the last day
            results.append({
                'date': current_day,
                'users': day_users
            })
        
        return results
    
    def close(self):
        self.conn.close()

    def add_message_with_response_and_event(self, conversation_id: str, user_message: str, user_id: str, bot_message: str, query: str, score: float, citations: List[str] = None):
        """Add user message, bot response, and create event in a single transaction."""
        try:
            self.conn.execute('BEGIN TRANSACTION')
            
            # Add user message
            user_message_id = str(uuid.uuid4())
            self.cursor.execute(
                'INSERT INTO messages (id, conversation_id, user_id, content) VALUES (?, ?, ?, ?)',
                (user_message_id, conversation_id, user_id, user_message)
            )
            
            # Add bot message
            bot_message_id = str(uuid.uuid4())
            self.cursor.execute(
                'INSERT INTO messages (id, conversation_id, user_id, content) VALUES (?, ?, ?, ?)',
                (bot_message_id, conversation_id, BOT_ID, bot_message)
            )
            
            # Update conversation timestamp
            self.cursor.execute(
                'UPDATE conversations SET updated_at = ? WHERE id = ?',
                (datetime.now(), conversation_id)
            )
            
            # Create event
            event_id = str(uuid.uuid4())
            citations_str = "|".join(citations) if citations else ""
            key_words = "|".join(query.split())
            
            self.cursor.execute(
                'INSERT INTO events (event_id, conversation_id, user_id, query, score, citations, key_words) VALUES (?, ?, ?, ?, ?, ?, ?)',
                (event_id, conversation_id, user_id, query, score, citations_str, key_words)
            )
            
            self.conn.commit()
        except Exception as e:
            self.conn.rollback()
            raise e

# Initialize conversation database
CONVERSATION_DB = ConversationDB()
