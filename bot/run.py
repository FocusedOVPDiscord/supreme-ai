"""
Main entry point for the Discord AI Ticket Bot
Loads all commands and cogs
"""
import discord
from discord.ext import commands
import logging
import asyncio
from pathlib import Path
import sys

# Add bot directory to path
sys.path.insert(0, str(Path(__file__).parent))

from config import Config
from memory import TrainingDatabase
from ai import OllamaClient

# Setup logging
logging.basicConfig(
    level=getattr(logging, Config.LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/bot.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class TicketBot(commands.Bot):
    """Main bot class"""
    
    def __init__(self):
        intents = discord.Intents.default()
        intents.message_content = True
        intents.guilds = True
        intents.guild_messages = True
        intents.dm_messages = True
        intents.members = True
        
        super().__init__(command_prefix=Config.BOT_PREFIX, intents=intents)
        
        self.db = TrainingDatabase(Config.DB_PATH)
        self.ai = OllamaClient(Config.OLLAMA_URL, Config.OLLAMA_MODEL)
        self.ollama_ready = False
    
    async def setup_hook(self):
        """Setup bot before connecting"""
        logger.info("Setting up bot...")
        
        # Check Ollama
        self.ollama_ready = await self.ai.check_health()
        if self.ollama_ready:
            logger.info("✓ Ollama connection successful")
            models = await self.ai.get_available_models()
            logger.info(f"Available models: {models}")
        else:
            logger.warning("✗ Ollama connection failed - AI features will be limited")
        
        # Load cogs
        cogs_dir = Path(__file__).parent / "commands"
        if cogs_dir.exists():
            for cog_file in cogs_dir.glob("*.py"):
                if cog_file.name.startswith("_"):
                    continue
                
                cog_name = cog_file.stem
                try:
                    await self.load_extension(f"commands.{cog_name}")
                    logger.info(f"Loaded cog: {cog_name}")
                except Exception as e:
                    logger.error(f"Failed to load cog {cog_name}: {e}")
        
        # Load main ticket cog
        try:
            await self.load_extension("main")
            logger.info("Loaded main ticket cog")
        except Exception as e:
            logger.error(f"Failed to load main cog: {e}")
    
    async def on_ready(self):
        """Bot ready event"""
        logger.info(f"✓ Bot logged in as {self.user}")
        logger.info(f"✓ Bot is in {len(self.guilds)} guild(s)")
        
        # Log database stats
        stats = self.db.get_stats()
        logger.info(f"Database: {stats['total_training_entries']} training entries, "
                   f"{stats['total_conversations']} conversations, "
                   f"{stats['open_tickets']} open tickets")
        
        # Set status
        await self.change_presence(
            activity=discord.Activity(
                type=discord.ActivityType.watching,
                name="support tickets | /help"
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
        logger.info("Configuration validated")
        
        # Create and run bot
        bot = TicketBot()
        
        async with bot:
            await bot.start(Config.DISCORD_TOKEN)
    
    except KeyboardInterrupt:
        logger.info("Bot shutting down...")
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
