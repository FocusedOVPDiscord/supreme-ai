"""
Direct command registration without cogs - Simplified Version
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

logger = logging.getLogger(__name__)

class SupremeAIBot(commands.Bot):
    def __init__(self):
        intents = discord.Intents.default()
        intents.message_content = True
        intents.guilds = True
        intents.members = True
        
        super().__init__(command_prefix=Config.BOT_PREFIX, intents=intents)
        
        self.db = TrainingDatabase(Config.DB_PATH)
        self.ai = GroqClient(Config.GROQ_API_KEY)
        self.groq_ready = False

    async def setup_hook(self):
        print("🚀 Starting Bot Setup...")
        
        # Import and setup commands
        from commands_v2 import setup_commands
        setup_commands(self)
        
        # Load listener
        try:
            from ticket_listener import TicketListener
            await self.add_cog(TicketListener(self))
            print("✓ Ticket listener loaded")
        except Exception as e:
            print(f"✗ Listener failed: {e}")

        # Sync logic
        print("🔄 Syncing commands...")
        try:
            if Config.DISCORD_GUILD_ID and str(Config.DISCORD_GUILD_ID) != "0":
                guild = discord.Object(id=int(Config.DISCORD_GUILD_ID))
                self.tree.copy_global_to(guild=guild)
                synced = await self.tree.sync(guild=guild)
                print(f"✅ Synced {len(synced)} commands to guild {Config.DISCORD_GUILD_ID}")
            
            synced_global = await self.tree.sync()
            print(f"✅ Synced {len(synced_global)} commands globally")
        except Exception as e:
            print(f"✗ Sync failed: {e}")

    async def on_ready(self):
        print(f"✅ Logged in as {self.user}")
        self.groq_ready = await self.ai.check_health()
        await self.change_presence(activity=discord.Activity(type=discord.ActivityType.watching, name="tickets"))
