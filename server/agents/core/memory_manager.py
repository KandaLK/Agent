"""
Enhanced Memory Management System
Handles short-term, long-term, and user interaction memory
"""

import json
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import redis
import asyncpg
from dataclasses import dataclass, asdict

@dataclass
class UserInteraction:
    user_id: str
    thread_id: str
    query: str
    response: str
    feedback_type: Optional[str]
    confidence: float
    timestamp: datetime
    language: str

@dataclass
class UserPreferences:
    user_id: str
    language: str
    web_search_enabled: bool
    detailed_responses: bool
    preferred_cloud_provider: str
    response_style: str
    updated_at: datetime

class EnhancedMemoryManager:
    """
    Manages all memory operations for the Agentic RAG system
    Provides user-specific memory isolation and cross-language consistency
    """
    
    def __init__(self):
        # Redis for session/short-term memory
        self.redis_client = redis.Redis(
            host='localhost', 
            port=6379, 
            decode_responses=True,
            db=0
        )
        
        # PostgreSQL connection will be initialized async
        self.pg_pool = None
        
        # Memory configuration
        self.session_ttl = 3600  # 1 hour
        self.max_session_history = 50
        self.max_long_term_interactions = 1000
        
    async def initialize_postgres(self):
        """Initialize PostgreSQL connection pool"""
        try:
            self.pg_pool = await asyncpg.create_pool(
                host='localhost',
                port=5432,
                user='postgres',
                password='password',
                database='chatbot_memory',
                min_size=5,
                max_size=20
            )
            
            # Create tables if they don't exist
            await self._create_tables()
            
        except Exception as e:
            print(f"Failed to initialize PostgreSQL: {e}")
            # Fallback to file-based storage or in-memory
            self.pg_pool = None

    async def _create_tables(self):
        """Create necessary tables for memory storage"""
        
        create_interactions_table = """
        CREATE TABLE IF NOT EXISTS user_interactions (
            id SERIAL PRIMARY KEY,
            user_id VARCHAR(255) NOT NULL,
            thread_id VARCHAR(255) NOT NULL,
            query TEXT NOT NULL,
            response TEXT NOT NULL,
            feedback_type VARCHAR(50),
            confidence FLOAT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            language VARCHAR(10) DEFAULT 'en',
            tool_results JSONB,
            success_pattern TEXT,
            domain_relevance FLOAT
        );
        """
        
        create_preferences_table = """
        CREATE TABLE IF NOT EXISTS user_preferences (
            user_id VARCHAR(255) PRIMARY KEY,
            language VARCHAR(10) DEFAULT 'en',
            web_search_enabled BOOLEAN DEFAULT TRUE,
            detailed_responses BOOLEAN DEFAULT FALSE,
            preferred_cloud_provider VARCHAR(50),
            response_style VARCHAR(50) DEFAULT 'professional',
            preferences_json JSONB,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """
        
        create_feedback_patterns_table = """
        CREATE TABLE IF NOT EXISTS feedback_patterns (
            id SERIAL PRIMARY KEY,
            user_id VARCHAR(255) NOT NULL,
            pattern_type VARCHAR(100) NOT NULL,
            pattern_data JSONB NOT NULL,
            confidence FLOAT DEFAULT 0.0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """
        
        create_indexes = [
            "CREATE INDEX IF NOT EXISTS idx_interactions_user_id ON user_interactions(user_id);",
            "CREATE INDEX IF NOT EXISTS idx_interactions_thread_id ON user_interactions(thread_id);",
            "CREATE INDEX IF NOT EXISTS idx_interactions_timestamp ON user_interactions(timestamp);",
            "CREATE INDEX IF NOT EXISTS idx_feedback_patterns_user_id ON feedback_patterns(user_id);"
        ]
        
        if self.pg_pool:
            async with self.pg_pool.acquire() as conn:
                await conn.execute(create_interactions_table)
                await conn.execute(create_preferences_table)
                await conn.execute(create_feedback_patterns_table)
                
                for index_sql in create_indexes:
                    await conn.execute(index_sql)

    async def store_interaction(self, user_id: str, thread_id: str, 
                              interaction_data: Dict[str, Any]):
        """Store user interaction in both short-term and long-term memory"""
        
        # Store in Redis for short-term access
        session_key = f"session:{user_id}:{thread_id}"
        
        # Add to session history
        session_data = {
            "timestamp": datetime.now().isoformat(),
            "query": interaction_data.get("query", ""),
            "response": interaction_data.get("response", ""),
            "confidence": interaction_data.get("confidence", 0.0),
            "tool_results": json.dumps(interaction_data.get("tool_results", {}))
        }
        
        # Store in Redis list (FIFO with max length)
        self.redis_client.lpush(session_key, json.dumps(session_data))
        self.redis_client.ltrim(session_key, 0, self.max_session_history - 1)
        self.redis_client.expire(session_key, self.session_ttl)
        
        # Store in PostgreSQL for long-term memory
        if self.pg_pool:
            await self._store_interaction_postgres(user_id, thread_id, interaction_data)

    async def _store_interaction_postgres(self, user_id: str, thread_id: str, 
                                        interaction_data: Dict[str, Any]):
        """Store interaction in PostgreSQL"""
        
        insert_query = """
        INSERT INTO user_interactions 
        (user_id, thread_id, query, response, confidence, tool_results, language)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        """
        
        try:
            async with self.pg_pool.acquire() as conn:
                await conn.execute(
                    insert_query,
                    user_id,
                    thread_id,
                    interaction_data.get("query", ""),
                    interaction_data.get("response", ""),
                    interaction_data.get("confidence", 0.0),
                    json.dumps(interaction_data.get("tool_results", {})),
                    interaction_data.get("language", "en")
                )
        except Exception as e:
            print(f"Failed to store interaction in PostgreSQL: {e}")

    async def get_session_history(self, user_id: str, thread_id: str) -> List[Dict]:
        """Retrieve session history from Redis"""
        
        session_key = f"session:{user_id}:{thread_id}"
        
        try:
            history_data = self.redis_client.lrange(session_key, 0, -1)
            history = []
            
            for item in reversed(history_data):  # Reverse to get chronological order
                try:
                    parsed_item = json.loads(item)
                    history.append(parsed_item)
                except json.JSONDecodeError:
                    continue
            
            return history
            
        except Exception as e:
            print(f"Failed to retrieve session history: {e}")
            return []

    async def get_user_preferences(self, user_id: str) -> Dict[str, Any]:
        """Retrieve user preferences"""
        
        # Try Redis cache first
        cache_key = f"preferences:{user_id}"
        cached_prefs = self.redis_client.get(cache_key)
        
        if cached_prefs:
            try:
                return json.loads(cached_prefs)
            except json.JSONDecodeError:
                pass
        
        # Fallback to PostgreSQL
        if self.pg_pool:
            try:
                async with self.pg_pool.acquire() as conn:
                    row = await conn.fetchrow(
                        "SELECT * FROM user_preferences WHERE user_id = $1",
                        user_id
                    )
                    
                    if row:
                        preferences = dict(row)
                        # Cache in Redis
                        self.redis_client.setex(
                            cache_key, 
                            3600, 
                            json.dumps(preferences, default=str)
                        )
                        return preferences
            except Exception as e:
                print(f"Failed to retrieve user preferences: {e}")
        
        # Return default preferences
        return {
            "language": "en",
            "web_search_enabled": True,
            "detailed_responses": False,
            "preferred_cloud_provider": "aws",
            "response_style": "professional"
        }

    async def update_user_preferences(self, user_id: str, preferences: Dict[str, Any]):
        """Update user preferences"""
        
        # Update PostgreSQL
        if self.pg_pool:
            try:
                upsert_query = """
                INSERT INTO user_preferences 
                (user_id, language, web_search_enabled, detailed_responses, 
                 preferred_cloud_provider, response_style, preferences_json, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                ON CONFLICT (user_id) 
                DO UPDATE SET
                    language = EXCLUDED.language,
                    web_search_enabled = EXCLUDED.web_search_enabled,
                    detailed_responses = EXCLUDED.detailed_responses,
                    preferred_cloud_provider = EXCLUDED.preferred_cloud_provider,
                    response_style = EXCLUDED.response_style,
                    preferences_json = EXCLUDED.preferences_json,
                    updated_at = EXCLUDED.updated_at
                """
                
                async with self.pg_pool.acquire() as conn:
                    await conn.execute(
                        upsert_query,
                        user_id,
                        preferences.get("language", "en"),
                        preferences.get("web_search_enabled", True),
                        preferences.get("detailed_responses", False),
                        preferences.get("preferred_cloud_provider", "aws"),
                        preferences.get("response_style", "professional"),
                        json.dumps(preferences),
                        datetime.now()
                    )
                    
            except Exception as e:
                print(f"Failed to update user preferences: {e}")
        
        # Update Redis cache
        cache_key = f"preferences:{user_id}"
        self.redis_client.setex(
            cache_key, 
            3600, 
            json.dumps(preferences, default=str)
        )

    async def get_user_interaction_history(self, user_id: str, 
                                         limit: int = 100) -> List[Dict]:
        """Retrieve user's interaction history from PostgreSQL"""
        
        if not self.pg_pool:
            return []
        
        try:
            async with self.pg_pool.acquire() as conn:
                rows = await conn.fetch(
                    """
                    SELECT * FROM user_interactions 
                    WHERE user_id = $1 
                    ORDER BY timestamp DESC 
                    LIMIT $2
                    """,
                    user_id, limit
                )
                
                return [dict(row) for row in rows]
                
        except Exception as e:
            print(f"Failed to retrieve interaction history: {e}")
            return []

    async def store_feedback_pattern(self, user_id: str, pattern_type: str, 
                                   pattern_data: Dict[str, Any], confidence: float = 0.0):
        """Store identified feedback patterns"""
        
        if not self.pg_pool:
            return
        
        try:
            insert_query = """
            INSERT INTO feedback_patterns 
            (user_id, pattern_type, pattern_data, confidence)
            VALUES ($1, $2, $3, $4)
            """
            
            async with self.pg_pool.acquire() as conn:
                await conn.execute(
                    insert_query,
                    user_id,
                    pattern_type,
                    json.dumps(pattern_data),
                    confidence
                )
                
        except Exception as e:
            print(f"Failed to store feedback pattern: {e}")

    async def get_feedback_patterns(self, user_id: str) -> List[Dict]:
        """Retrieve user's feedback patterns"""
        
        if not self.pg_pool:
            return []
        
        try:
            async with self.pg_pool.acquire() as conn:
                rows = await conn.fetch(
                    """
                    SELECT * FROM feedback_patterns 
                    WHERE user_id = $1 
                    ORDER BY confidence DESC, updated_at DESC
                    """,
                    user_id
                )
                
                patterns = []
                for row in rows:
                    pattern = dict(row)
                    pattern['pattern_data'] = json.loads(pattern['pattern_data'])
                    patterns.append(pattern)
                
                return patterns
                
        except Exception as e:
            print(f"Failed to retrieve feedback patterns: {e}")
            return []

    async def cleanup_old_data(self, days_to_keep: int = 30):
        """Clean up old interaction data"""
        
        if not self.pg_pool:
            return
        
        cutoff_date = datetime.now() - timedelta(days=days_to_keep)
        
        try:
            async with self.pg_pool.acquire() as conn:
                # Clean up old interactions
                await conn.execute(
                    "DELETE FROM user_interactions WHERE timestamp < $1",
                    cutoff_date
                )
                
                # Clean up old feedback patterns
                await conn.execute(
                    "DELETE FROM feedback_patterns WHERE created_at < $1",
                    cutoff_date
                )
                
        except Exception as e:
            print(f"Failed to cleanup old data: {e}")

    async def get_memory_stats(self, user_id: str) -> Dict[str, Any]:
        """Get memory usage statistics for a user"""
        
        stats = {
            "session_interactions": 0,
            "total_interactions": 0,
            "feedback_patterns": 0,
            "preferences_set": False
        }
        
        # Session stats from Redis
        session_keys = self.redis_client.keys(f"session:{user_id}:*")
        for key in session_keys:
            stats["session_interactions"] += self.redis_client.llen(key)
        
        # Long-term stats from PostgreSQL
        if self.pg_pool:
            try:
                async with self.pg_pool.acquire() as conn:
                    # Total interactions
                    total_count = await conn.fetchval(
                        "SELECT COUNT(*) FROM user_interactions WHERE user_id = $1",
                        user_id
                    )
                    stats["total_interactions"] = total_count or 0
                    
                    # Feedback patterns
                    pattern_count = await conn.fetchval(
                        "SELECT COUNT(*) FROM feedback_patterns WHERE user_id = $1",
                        user_id
                    )
                    stats["feedback_patterns"] = pattern_count or 0
                    
                    # Check if preferences exist
                    prefs_exist = await conn.fetchval(
                        "SELECT EXISTS(SELECT 1 FROM user_preferences WHERE user_id = $1)",
                        user_id
                    )
                    stats["preferences_set"] = bool(prefs_exist)
                    
            except Exception as e:
                print(f"Failed to get memory stats: {e}")
        
        return stats

    def clear_session_memory(self, user_id: str, thread_id: str = None):
        """Clear session memory for user or specific thread"""
        
        if thread_id:
            # Clear specific thread
            session_key = f"session:{user_id}:{thread_id}"
            self.redis_client.delete(session_key)
        else:
            # Clear all sessions for user
            session_keys = self.redis_client.keys(f"session:{user_id}:*")
            if session_keys:
                self.redis_client.delete(*session_keys)
        
        # Clear preferences cache
        cache_key = f"preferences:{user_id}"
        self.redis_client.delete(cache_key)