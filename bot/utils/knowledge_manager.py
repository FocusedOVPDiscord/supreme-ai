"""
Knowledge base management utilities
"""
import json
from pathlib import Path
from typing import List, Dict, Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class KnowledgeManager:
    """Manages knowledge base operations"""
    
    def __init__(self, db):
        self.db = db
        self.knowledge_dir = Path("./data/knowledge")
        self.knowledge_dir.mkdir(exist_ok=True)
    
    def create_knowledge_base(self, name: str, description: str = "") -> bool:
        """Create a new knowledge base"""
        try:
            kb_file = self.knowledge_dir / f"{name}.json"
            
            if kb_file.exists():
                logger.warning(f"Knowledge base {name} already exists")
                return False
            
            kb_data = {
                "name": name,
                "description": description,
                "created_at": datetime.now().isoformat(),
                "entries": []
            }
            
            with open(kb_file, 'w') as f:
                json.dump(kb_data, f, indent=2)
            
            logger.info(f"Created knowledge base: {name}")
            return True
        
        except Exception as e:
            logger.error(f"Error creating knowledge base: {e}")
            return False
    
    def add_to_knowledge_base(self, kb_name: str, query: str, response: str,
                             category: str = "general", tags: List[str] = None) -> bool:
        """Add entry to knowledge base"""
        try:
            kb_file = self.knowledge_dir / f"{kb_name}.json"
            
            if not kb_file.exists():
                logger.warning(f"Knowledge base {kb_name} not found")
                return False
            
            with open(kb_file, 'r') as f:
                kb_data = json.load(f)
            
            # Check for duplicate
            for entry in kb_data["entries"]:
                if entry["query"].lower() == query.lower():
                    logger.warning(f"Duplicate entry in {kb_name}: {query}")
                    return False
            
            # Add new entry
            entry = {
                "id": len(kb_data["entries"]) + 1,
                "query": query,
                "response": response,
                "category": category,
                "tags": tags or [],
                "created_at": datetime.now().isoformat(),
                "usage_count": 0
            }
            
            kb_data["entries"].append(entry)
            
            with open(kb_file, 'w') as f:
                json.dump(kb_data, f, indent=2)
            
            # Also add to database
            self.db.add_training(query, response, category, tags)
            
            logger.info(f"Added entry to {kb_name}: {query}")
            return True
        
        except Exception as e:
            logger.error(f"Error adding to knowledge base: {e}")
            return False
    
    def get_knowledge_base(self, kb_name: str) -> Optional[Dict]:
        """Get knowledge base content"""
        try:
            kb_file = self.knowledge_dir / f"{kb_name}.json"
            
            if not kb_file.exists():
                return None
            
            with open(kb_file, 'r') as f:
                return json.load(f)
        
        except Exception as e:
            logger.error(f"Error reading knowledge base: {e}")
            return None
    
    def list_knowledge_bases(self) -> List[str]:
        """List all knowledge bases"""
        try:
            return [f.stem for f in self.knowledge_dir.glob("*.json")]
        except Exception as e:
            logger.error(f"Error listing knowledge bases: {e}")
            return []
    
    def export_knowledge_base(self, kb_name: str, export_path: str = None) -> Optional[str]:
        """Export knowledge base to file"""
        try:
            kb_file = self.knowledge_dir / f"{kb_name}.json"
            
            if not kb_file.exists():
                return None
            
            if export_path is None:
                export_path = f"./exports/{kb_name}_export.json"
            
            Path(export_path).parent.mkdir(parents=True, exist_ok=True)
            
            with open(kb_file, 'r') as f:
                kb_data = json.load(f)
            
            with open(export_path, 'w') as f:
                json.dump(kb_data, f, indent=2)
            
            logger.info(f"Exported knowledge base {kb_name} to {export_path}")
            return export_path
        
        except Exception as e:
            logger.error(f"Error exporting knowledge base: {e}")
            return None
    
    def import_knowledge_base(self, kb_name: str, import_path: str) -> bool:
        """Import knowledge base from file"""
        try:
            import_file = Path(import_path)
            
            if not import_file.exists():
                logger.warning(f"Import file not found: {import_path}")
                return False
            
            with open(import_file, 'r') as f:
                kb_data = json.load(f)
            
            # Validate structure
            if "entries" not in kb_data:
                logger.warning("Invalid knowledge base format")
                return False
            
            # Save to knowledge base
            kb_file = self.knowledge_dir / f"{kb_name}.json"
            
            with open(kb_file, 'w') as f:
                json.dump(kb_data, f, indent=2)
            
            # Import to database
            for entry in kb_data.get("entries", []):
                self.db.add_training(
                    query=entry.get("query"),
                    response=entry.get("response"),
                    category=entry.get("category", "general"),
                    tags=entry.get("tags", [])
                )
            
            logger.info(f"Imported knowledge base {kb_name}")
            return True
        
        except Exception as e:
            logger.error(f"Error importing knowledge base: {e}")
            return False
    
    def search_knowledge_base(self, kb_name: str, query: str, limit: int = 5) -> List[Dict]:
        """Search within a knowledge base"""
        try:
            kb_data = self.get_knowledge_base(kb_name)
            
            if not kb_data:
                return []
            
            import difflib
            
            matches = []
            for entry in kb_data.get("entries", []):
                similarity = difflib.SequenceMatcher(
                    None,
                    query.lower(),
                    entry["query"].lower()
                ).ratio()
                
                if similarity > 0.5:
                    entry["similarity"] = similarity
                    matches.append(entry)
            
            # Sort by similarity
            matches.sort(key=lambda x: x["similarity"], reverse=True)
            return matches[:limit]
        
        except Exception as e:
            logger.error(f"Error searching knowledge base: {e}")
            return []
    
    def get_kb_stats(self, kb_name: str) -> Optional[Dict]:
        """Get statistics for a knowledge base"""
        try:
            kb_data = self.get_knowledge_base(kb_name)
            
            if not kb_data:
                return None
            
            entries = kb_data.get("entries", [])
            categories = {}
            total_usage = 0
            
            for entry in entries:
                cat = entry.get("category", "general")
                categories[cat] = categories.get(cat, 0) + 1
                total_usage += entry.get("usage_count", 0)
            
            return {
                "name": kb_name,
                "total_entries": len(entries),
                "categories": categories,
                "total_usage": total_usage,
                "created_at": kb_data.get("created_at")
            }
        
        except Exception as e:
            logger.error(f"Error getting KB stats: {e}")
            return None
    
    def delete_knowledge_base(self, kb_name: str) -> bool:
        """Delete a knowledge base"""
        try:
            kb_file = self.knowledge_dir / f"{kb_name}.json"
            
            if not kb_file.exists():
                return False
            
            kb_file.unlink()
            logger.info(f"Deleted knowledge base: {kb_name}")
            return True
        
        except Exception as e:
            logger.error(f"Error deleting knowledge base: {e}")
            return False
