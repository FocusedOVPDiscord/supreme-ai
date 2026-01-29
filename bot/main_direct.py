"""
Direct command registration without cogs
"""
import discord
from discord.ext import commands
import logging
import sys
import traceback
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from config import Config
from memory import TrainingDatabase
from ai.groq_client import GroqClient
from commands_v2 import setup_commands

logger = logging.getLogger(__name__)


class SupremeAIBot(commands.Bot):
    """Main bot with direct command registration"""
    
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
            
            print("✓ Bot initialized successfully")
            logger.info("✓ Bot initialized successfully")
            
        except Exception as e:
            print(f"✗ Error in __init__: {e}")
            logger.error(f"✗ Error in __init__: {e}")
            traceback.print_exc()
            raise
    
    async def setup_hook(self):
        """Setup before connecting"""
        try:
            print("🚀 Setting up bot...")
            logger.info("🚀 Setting up bot...")
            
            # Setup commands
            print("Setting up commands...")
            setup_commands(self)
            print("Commands setup done")
            
            # Check Groq connection
            self.groq_ready = await self.ai.check_health()
            if self.groq_ready:
                print("✓ Groq AI ready")
                logger.info("✓ Groq AI ready")
            else:
                print("✗ Groq AI not ready")
                logger.warning("✗ Groq AI not ready")
            
            # Load ticket listener
            try:
                from ticket_listener import TicketListener
                await self.add_cog(TicketListener(self))
                print("✓ Ticket listener loaded")
                logger.info("✓ Ticket listener loaded")
            except Exception as e:
                print(f"✗ Failed to load listener: {e}")
                logger.error(f"✗ Failed to load listener: {e}")
                traceback.print_exc()
            
            # Sync commands
            try:
                print("Syncing commands...")
                synced = await self.tree.sync()
                print(f"✓ Synced {len(synced)} commands")
                logger.info(f"✓ Synced {len(synced)} commands")
                for cmd in synced:
                    print(f"  - /{cmd.name}")
                    logger.info(f"  - /{cmd.name}")
            except Exception as e:
                print(f"✗ Sync failed: {e}")
                logger.error(f"✗ Sync failed: {e}")
                traceback.print_exc()
        
        except Exception as e:
            print(f"✗ Error in setup_hook: {e}")
            logger.error(f"✗ Error in setup_hook: {e}")
            traceback.print_exc()
    
    async def on_ready(self):
        """Bot ready"""
        try:
            print(f"✓ Bot logged in as {self.user}")
            logger.info(f"✓ Bot logged in as {self.user}")
            print(f"✓ Bot in {len(self.guilds)} guild(s)")
            logger.info(f"✓ Bot in {len(self.guilds)} guild(s)")
            
            try:
                stats = self.db.get_stats()
                msg = f"📊 DB: {stats['total_training_entries']} training, {stats['total_conversations']} conversations"
                print(msg)
                logger.info(msg)
            except Exception as e:
                print(f"Could not get stats: {e}")
                logger.warning(f"Could not get stats: {e}")
            
            await self.change_presence(
                activity=discord.Activity(
                    type=discord.ActivityType.watching,
                    name="tickets | Groq AI"
                )
            )
        except Exception as e:
            print(f"✗ Error in on_ready: {e}")
            logger.error(f"✗ Error in on_ready: {e}")
            traceback.print_exc()
