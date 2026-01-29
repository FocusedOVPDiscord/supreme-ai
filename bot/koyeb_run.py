"""
Main entry point for Koyeb deployment
Groq AI integration with Discord bot
"""
import discord
from discord.ext import commands
import logging
import asyncio
from pathlib import Path
import sys
import os

# Add bot directory to path
sys.path.insert(0, str(Path(__file__).parent))

from config import Config
from memory import TrainingDatabase
from ai.groq_client import GroqClient

# Setup logging
logging.basicConfig(
    level=getattr(logging, Config.LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()  # Only console for Koyeb
    ]
)
logger = logging.getLogger(__name__)


class SupremeAIBot(commands.Bot):
    """Main bot class for Koyeb deployment"""
    
    def __init__(self):
        intents = discord.Intents.default()
        intents.message_content = True
        intents.guilds = True
        intents.guild_messages = True
        intents.direct_messages = True
        intents.members = True
        
        super().__init__(command_prefix=Config.BOT_PREFIX, intents=intents)
        
        self.db = TrainingDatabase(Config.DB_PATH)
        self.ai = GroqClient(Config.GROQ_API_KEY)
        self.groq_ready = False
    
    async def setup_hook(self):
        """Setup bot before connecting"""
        logger.info("🚀 Setting up Supreme AI Bot for Koyeb...")
        
        # Check Groq connection
        self.groq_ready = await self.ai.check_health()
        if self.groq_ready:
            logger.info("✓ Groq AI connection successful")
        else:
            logger.warning("✗ Groq AI connection failed - check API key")
        
        # Load cogs
        cogs_dir = Path(__file__).parent / "commands"
        if cogs_dir.exists():
            for cog_file in cogs_dir.glob("*.py"):
                if cog_file.name.startswith("_"):
                    continue
                
                cog_name = cog_file.stem
                try:
                    await self.load_extension(f"commands.{cog_name}")
                    logger.info(f"✓ Loaded cog: {cog_name}")
                except Exception as e:
                    logger.error(f"✗ Failed to load cog {cog_name}: {e}")
        
        # Load main ticket cog
        try:
            await self.load_extension("main")
            logger.info("✓ Loaded main ticket cog")
        except Exception as e:
            logger.error(f"✗ Failed to load main cog: {e}")
    
    async def on_ready(self):
        """Bot ready event"""
        logger.info(f"✓ Bot logged in as {self.user}")
        logger.info(f"✓ Bot is in {len(self.guilds)} guild(s)")
        
        # Log database stats
        stats = self.db.get_stats()
        logger.info(f"📊 Database: {stats['total_training_entries']} training entries, "
                   f"{stats['total_conversations']} conversations, "
                   f"{stats['open_tickets']} open tickets")
        
        # Set status
        await self.change_presence(
            activity=discord.Activity(
                type=discord.ActivityType.watching,
                name="support tickets | Powered by Groq AI"
            )
        )
    
    async def on_error(self, event, *args, **kwargs):
        """Error handler"""
        logger.exception(f"Error in {event}")


async def main():
    """Main entry point"""
    try:
        # Validate config
        Config.validate()
        logger.info("✓ Configuration validated")
        
        # Check required env vars
        if not Config.DISCORD_TOKEN:
            raise ValueError("DISCORD_TOKEN not set")
        if not Config.GROQ_API_KEY:
            raise ValueError("GROQ_API_KEY not set")
        
        logger.info("✓ All required environment variables set")
        
        # Create and run bot
        bot = SupremeAIBot()
        
        async with bot:
            await bot.start(Config.DISCORD_TOKEN)
    
    except KeyboardInterrupt:
        logger.info("🛑 Bot shutting down...")
    except Exception as e:
        logger.error(f"💥 Fatal error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
