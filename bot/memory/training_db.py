"""
Training database management - SQLite-based persistent memory system
"""
import sqlite3
import json
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional, Tuple
import difflib


class TrainingDatabase:
    """Manages training data persistence and retrieval"""
    
    def __init__(self, db_path: str = "./data/training.db"):
        self.db_path = db_path
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)
        self._init_db()
    
    def _init_db(self):
        """Initialize database schema"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS training_data (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    query TEXT NOT NULL UNIQUE,
                    response TEXT NOT NULL,
                    category TEXT DEFAULT 'general',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    usage_count INTEGER DEFAULT 0,
                    confidence REAL DEFAULT 1.0,
                    tags TEXT,
                    metadata TEXT
                )
            """)
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS conversation_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    ticket_id TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    message TEXT NOT NULL,
                    response TEXT,
                    is_ai_generated BOOLEAN DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    metadata TEXT
                )
            """)
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS ticket_context (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    ticket_id TEXT NOT NULL UNIQUE,
                    user_id TEXT NOT NULL,
                    category TEXT,
                    status TEXT DEFAULT 'open',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    closed_at TIMESTAMP,
                    context TEXT,
                    metadata TEXT
                )
            """)
            
            conn.commit()
    
    def add_training(self, query: str, response: str, category: str = "general", 
                     tags: Optional[List[str]] = None, metadata: Optional[Dict] = None) -> bool:
        """Add or update training data"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                tags_str = json.dumps(tags) if tags else None
                metadata_str = json.dumps(metadata) if metadata else None
                
                conn.execute("""
                    INSERT OR REPLACE INTO training_data 
                    (query, response, category, tags, metadata, updated_at)
                    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                """, (query, response, category, tags_str, metadata_str))
                
                conn.commit()
                return True
        except Exception as e:
            print(f"Error adding training data: {e}")
            return False
    
    def get_training(self, query_id: int) -> Optional[Dict]:
        """Get training data by ID"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute(
                "SELECT * FROM training_data WHERE id = ?", (query_id,)
            )
            row = cursor.fetchone()
            if row:
                return self._row_to_dict(row, cursor.description)
        return None
    
    def search_similar(self, query: str, threshold: float = 0.7, limit: int = 5) -> List[Dict]:
        """Search for similar training entries using fuzzy matching"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("SELECT * FROM training_data ORDER BY usage_count DESC")
            all_entries = cursor.fetchall()
            
            matches = []
            for row in all_entries:
                entry = self._row_to_dict(row, cursor.description)
                similarity = difflib.SequenceMatcher(None, query.lower(), 
                                                    entry['query'].lower()).ratio()
                
                if similarity >= threshold:
                    entry['similarity_score'] = similarity
                    matches.append(entry)
            
            # Sort by similarity and return top matches
            matches.sort(key=lambda x: x['similarity_score'], reverse=True)
            return matches[:limit]
    
    def get_all_training(self, category: Optional[str] = None) -> List[Dict]:
        """Get all training data, optionally filtered by category"""
        with sqlite3.connect(self.db_path) as conn:
            if category:
                cursor = conn.execute(
                    "SELECT * FROM training_data WHERE category = ? ORDER BY usage_count DESC",
                    (category,)
                )
            else:
                cursor = conn.execute("SELECT * FROM training_data ORDER BY usage_count DESC")
            
            rows = cursor.fetchall()
            return [self._row_to_dict(row, cursor.description) for row in rows]
    
    def delete_training(self, query_id: int) -> bool:
        """Delete training data by ID"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("DELETE FROM training_data WHERE id = ?", (query_id,))
                conn.commit()
                return True
        except Exception as e:
            print(f"Error deleting training data: {e}")
            return False
    
    def increment_usage(self, query_id: int):
        """Increment usage count for a training entry"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                "UPDATE training_data SET usage_count = usage_count + 1 WHERE id = ?",
                (query_id,)
            )
            conn.commit()
    
    def add_conversation(self, ticket_id: str, user_id: str, message: str, 
                        response: Optional[str] = None, is_ai_generated: bool = False) -> bool:
        """Store conversation message"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("""
                    INSERT INTO conversation_history 
                    (ticket_id, user_id, message, response, is_ai_generated)
                    VALUES (?, ?, ?, ?, ?)
                """, (ticket_id, user_id, message, response, is_ai_generated))
                conn.commit()
                return True
        except Exception as e:
            print(f"Error adding conversation: {e}")
            return False
    
    def get_ticket_context(self, ticket_id: str, limit: int = 20) -> List[Dict]:
        """Get conversation history for a ticket"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("""
                SELECT * FROM conversation_history 
                WHERE ticket_id = ? 
                ORDER BY created_at DESC 
                LIMIT ?
            """, (ticket_id, limit))
            
            rows = cursor.fetchall()
            messages = [self._row_to_dict(row, cursor.description) for row in rows]
            # Reverse to get chronological order
            return list(reversed(messages))
    
    def get_all_training(self, category: Optional[str] = None) -> List[Dict]:
        """Get all training data, optionally filtered by category"""
        with sqlite3.connect(self.db_path) as conn:
            if category:
                cursor = conn.execute(
                    "SELECT * FROM training_data WHERE category = ? ORDER BY created_at DESC",
                    (category,)
                )
            else:
                cursor = conn.execute(
                    "SELECT * FROM training_data ORDER BY created_at DESC"
                )
            
            rows = cursor.fetchall()
            return [self._row_to_dict(row, cursor.description) for row in rows]
    
    def create_ticket_context(self, ticket_id: str, user_id: str, category: str = "general") -> bool:
        """Create ticket context entry"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("""
                    INSERT INTO ticket_context (ticket_id, user_id, category)
                    VALUES (?, ?, ?)
                """, (ticket_id, user_id, category))
                conn.commit()
                return True
        except Exception as e:
            print(f"Error creating ticket context: {e}")
            return False
    
    def close_ticket(self, ticket_id: str) -> bool:
        """Mark ticket as closed"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("""
                    UPDATE ticket_context 
                    SET status = 'closed', closed_at = CURRENT_TIMESTAMP
                    WHERE ticket_id = ?
                """, (ticket_id,))
                conn.commit()
                return True
        except Exception as e:
            print(f"Error closing ticket: {e}")
            return False
    
    def update_ticket_status(self, ticket_id: str, status: str) -> bool:
        """Update ticket status"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                if status == 'closed':
                    conn.execute("""
                        UPDATE ticket_context 
                        SET status = ?, closed_at = CURRENT_TIMESTAMP
                        WHERE ticket_id = ?
                    """, (status, ticket_id))
                else:
                    conn.execute("""
                        UPDATE ticket_context 
                        SET status = ?
                        WHERE ticket_id = ?
                    """, (status, ticket_id))
                conn.commit()
                return True
        except Exception as e:
            print(f"Error updating ticket status: {e}")
            return False
    
    def get_ticket_context_info(self, ticket_id: str) -> Optional[Dict]:
        """Get ticket context info (not conversation history)"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute(
                "SELECT * FROM ticket_context WHERE ticket_id = ?",
                (ticket_id,)
            )
            row = cursor.fetchone()
            if row:
                return self._row_to_dict(row, cursor.description)
        return None
    
    def add_conversation_message(self, ticket_id: str, user_id: str, message: str, 
                                is_ai_generated: bool = False) -> bool:
        """Add a message to conversation history"""
        return self.add_conversation(ticket_id, user_id, message, None, is_ai_generated)
    
    def get_conversation_history(self, ticket_id: str, limit: int = 10) -> List[Dict]:
        """Get conversation history for a ticket"""
        return self.get_ticket_context(ticket_id, limit)
    
    def get_stats(self) -> Dict:
        """Get database statistics"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("SELECT COUNT(*) FROM training_data")
            total_training = cursor.fetchone()[0]
            
            cursor = conn.execute("SELECT COUNT(*) FROM conversation_history")
            total_conversations = cursor.fetchone()[0]
            
            cursor = conn.execute("SELECT COUNT(*) FROM ticket_context WHERE status = 'open'")
            open_tickets = cursor.fetchone()[0]
            
            cursor = conn.execute("SELECT SUM(usage_count) FROM training_data")
            total_usage = cursor.fetchone()[0] or 0
            
            return {
                "total_training_entries": total_training,
                "total_conversations": total_conversations,
                "open_tickets": open_tickets,
                "total_usage": total_usage
            }
    
    @staticmethod
    def _row_to_dict(row: Tuple, description) -> Dict:
        """Convert database row to dictionary"""
        d = {}
        for idx, col in enumerate(description):
            value = row[idx]
            # Parse JSON fields
            if col[0] in ['tags', 'metadata'] and value:
                try:
                    value = json.loads(value)
                except:
                    pass
            d[col[0]] = value
        return d
