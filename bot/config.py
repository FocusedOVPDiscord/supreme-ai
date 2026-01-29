"""
Bot configuration management
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class Config:
    """Base configuration"""
    
    # Discord
    DISCORD_TOKEN = os.getenv("DISCORD_TOKEN", "")
    DISCORD_GUILD_ID = os.getenv("DISCORD_GUILD_ID", 0)
    
    # Groq API (Cloud AI)
    GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
    GROQ_MODEL = os.getenv("GROQ_MODEL", "mixtral-8x7b-32768")
    
    # Ollama (Local - optional fallback)
    OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
    OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3")
    
    # Bot
    BOT_PREFIX = os.getenv("BOT_PREFIX", "!")
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
    
    # Memory & Training
    DB_PATH = os.getenv("DB_PATH", "./data/training.db")
    SIMILARITY_THRESHOLD = float(os.getenv("SIMILARITY_THRESHOLD", "0.7"))
    MAX_CONTEXT_LENGTH = int(os.getenv("MAX_CONTEXT_LENGTH", "2000"))
    MAX_TRAINING_ENTRIES = int(os.getenv("MAX_TRAINING_ENTRIES", "10000"))
    
    # Features
    ENABLE_AUTO_RESPONSE = os.getenv("ENABLE_AUTO_RESPONSE", "true").lower() == "true"
    ENABLE_TRAINING = os.getenv("ENABLE_TRAINING", "true").lower() == "true"
    RESPONSE_TIMEOUT = int(os.getenv("RESPONSE_TIMEOUT", "30"))
    
    # Paths
    DATA_DIR = Path("./data")
    LOGS_DIR = Path("./logs")
    
    @classmethod
    def validate(cls):
        """Validate configuration"""
        if not cls.DISCORD_TOKEN:
            raise ValueError("DISCORD_TOKEN environment variable not set")
        if not cls.GROQ_API_KEY:
            raise ValueError("GROQ_API_KEY environment variable not set")
        
        # Create directories if they don't exist
        cls.DATA_DIR.mkdir(exist_ok=True)
        cls.LOGS_DIR.mkdir(exist_ok=True)
        
        return True
