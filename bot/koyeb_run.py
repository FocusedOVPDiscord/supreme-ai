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
import traceback

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
        try:
            intents = discord.Intents.default()
            intents.message_content = True
            intents.guilds = True
            intents.guild_messages = True
            intents.dm_messages = True
            intents.members = True
            
            super().__init__(command_prefix=Config.BOT_PREFIX, intents=intents)
            
            self.db = TrainingDatabase(Config.DB_PATH)
            self.ai = GroqClient(Config.GROQ_API_KEY)
            self.groq_ready = False
            
            logger.info("✓ Bot initialized successfully")
        except Exception as e:
            logger.error(f"✗ Failed to initialize bot: {e}")
            traceback.print_exc()
            raise
    
    async def setup_hook(self):
        """Setup bot before connecting"""
        try:
            logger.info("🚀 Setting up Supreme AI Bot for Koyeb...")
            
            # Check Groq connection
            self.groq_ready = await self.ai.check_health()
            if self.groq_ready:
                logger.info("✓ Groq AI connection successful")
            else:
                logger.warning("✗ Groq AI connection failed - check API key")
            
            # Load slash commands cog
            try:
                from slash_commands import TrainingCommands, TicketCommands
                await self.add_cog(TrainingCommands(self))
                await self.add_cog(TicketCommands(self))
                logger.info("✓ Loaded slash commands")
            except Exception as e:
                logger.error(f"✗ Failed to load slash commands: {e}")
                traceback.print_exc()
            
            # Load ticket listener cog
            try:
                from ticket_listener import TicketListener
                await self.add_cog(TicketListener(self))
                logger.info("✓ Loaded ticket listener")
            except Exception as e:
                logger.error(f"✗ Failed to load ticket listener: {e}")
                traceback.print_exc()
            
            # Sync commands with Discord
            try:
                synced = await self.tree.sync()
                logger.info(f"✓ Synced {len(synced)} command(s)")
            except Exception as e:
                logger.error(f"✗ Failed to sync commands: {e}")
                traceback.print_exc()
        
        except Exception as e:
            logger.error(f"✗ Error in setup_hook: {e}")
            traceback.print_exc()
    
    async def on_ready(self):
        """Bot ready event"""
        try:
            logger.info(f"✓ Bot logged in as {self.user}")
            logger.info(f"✓ Bot is in {len(self.guilds)} guild(s)")
            
            # Log database stats
            try:
                stats = self.db.get_stats()
                logger.info(f"📊 Database: {stats['total_training_entries']} training entries, "
                           f"{stats['total_conversations']} conversations, "
                           f"{stats['open_tickets']} open tickets")
            except Exception as e:
                logger.warning(f"Could not get database stats: {e}")
            
            # Set status
            await self.change_presence(
                activity=discord.Activity(
                    type=discord.ActivityType.watching,
                    name="support tickets | Powered by Groq AI"
                )
            )
        except Exception as e:
            logger.error(f"✗ Error in on_ready: {e}")
            traceback.print_exc()
    
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
            logger.info("🚀 Starting bot...")
            await bot.start(Config.DISCORD_TOKEN)
    
    except KeyboardInterrupt:
        logger.info("🛑 Bot shutting down...")
    except Exception as e:
        logger.error(f"💥 Fatal error: {e}")
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as e:
        logger.error(f"💥 Asyncio error: {e}")
        traceback.print_exc()
        sys.exit(1)
