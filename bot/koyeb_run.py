"""
Main entry point for Koyeb deployment
Direct command registration approach
"""
import logging
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from config import Config
from main_direct import SupremeAIBot

# Setup logging
logging.basicConfig(
    level=getattr(logging, Config.LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)


async def main():
    """Main entry point"""
    try:
        # Validate config
        Config.validate()
        logger.info("✓ Configuration validated")
        
        # Check env vars
        if not Config.DISCORD_TOKEN:
            raise ValueError("DISCORD_TOKEN not set")
        if not Config.GROQ_API_KEY:
            raise ValueError("GROQ_API_KEY not set")
        
        logger.info("✓ All required environment variables set")
        
        # Create and run bot
        bot = SupremeAIBot()
        
        async with bot:
            logger.info("🚀 Starting bot...")
            await bot.start(Config.DISCORD_TOKEN)
    
    except KeyboardInterrupt:
        logger.info("🛑 Bot shutting down...")
    except Exception as e:
        logger.error(f"💥 Fatal error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as e:
        logger.error(f"💥 Asyncio error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
