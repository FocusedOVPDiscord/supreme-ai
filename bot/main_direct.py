"""
Direct command registration without cogs
"""
import discord
from discord.ext import commands
from discord import app_commands
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
            
            # Initialize bot with tree_cls to ensure proper command tree handling
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
            
            # 1. Setup commands FIRST
            print("Setting up commands...")
            setup_commands(self)
            print("✓ Commands setup done")
            logger.info("✓ Commands setup done")
            
            # 2. Check Groq connection
            self.groq_ready = await self.ai.check_health()
            if self.groq_ready:
                print("✓ Groq AI ready")
                logger.info("✓ Groq AI ready")
            else:
                print("✗ Groq AI not ready")
                logger.warning("✗ Groq AI not ready")
            
            # 3. Load ticket listener
            try:
                from ticket_listener import TicketListener
                await self.add_cog(TicketListener(self))
                print("✓ Ticket listener loaded")
                logger.info("✓ Ticket listener loaded")
            except Exception as e:
                print(f"✗ Failed to load listener: {e}")
                logger.error(f"✗ Failed to load listener: {e}")
                traceback.print_exc()
            
            # 4. Sync commands - FIXED: Ensure commands are in the tree before syncing
            try:
                print("🔄 Syncing commands...")
                logger.info("🔄 Syncing commands...")
                
                # Log the number of commands in the tree for debugging
                all_commands = self.tree.get_commands()
                print(f"DEBUG: Commands in tree: {[cmd.name for cmd in all_commands]}")
                logger.info(f"DEBUG: Commands in tree: {[cmd.name for cmd in all_commands]}")
                
                # If DISCORD_GUILD_ID is set, sync to that guild for instant registration
                if Config.DISCORD_GUILD_ID and str(Config.DISCORD_GUILD_ID) != "0":
                    try:
                        guild_id = int(Config.DISCORD_GUILD_ID)
                        guild = discord.Object(id=guild_id)
                        
                        # Copy global commands to guild for instant sync
                        self.tree.copy_global_to(guild=guild)
                        
                        # Sync to specific guild (instant)
                        synced = await self.tree.sync(guild=guild)
                        print(f"✓ Synced {len(synced)} commands to guild {guild_id} (instant)")
                        logger.info(f"✓ Synced {len(synced)} commands to guild {guild_id} (instant)")
                        
                        for cmd in synced:
                            print(f"  - /{cmd.name}")
                            logger.info(f"  - /{cmd.name}")
                    except ValueError:
                        print(f"⚠️ Invalid DISCORD_GUILD_ID: {Config.DISCORD_GUILD_ID}")
                        logger.warning(f"⚠️ Invalid DISCORD_GUILD_ID: {Config.DISCORD_GUILD_ID}")
                    except Exception as e:
                        print(f"⚠️ Guild sync failed: {e}, falling back to global sync")
                        logger.warning(f"⚠️ Guild sync failed: {e}, falling back to global sync")
                        traceback.print_exc()
                
                # Also sync globally (takes up to 1 hour to propagate)
                print("🌍 Syncing commands globally (may take up to 1 hour)...")
                logger.info("🌍 Syncing commands globally...")
                synced_global = await self.tree.sync()
                print(f"✓ Synced {len(synced_global)} commands globally")
                logger.info(f"✓ Synced {len(synced_global)} commands globally")
                
            except Exception as e:
                print(f"✗ Command sync failed: {e}")
                logger.error(f"✗ Command sync failed: {e}")
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
            
            # List guilds
            for guild in self.guilds:
                print(f"  - {guild.name} (ID: {guild.id})")
                logger.info(f"  - {guild.name} (ID: {guild.id})")
            
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
            
            print("✅ Bot is ready and commands are registered!")
            logger.info("✅ Bot is ready and commands are registered!")
            
        except Exception as e:
            print(f"✗ Error in on_ready: {e}")
            logger.error(f"✗ Error in on_ready: {e}")
            traceback.print_exc()
