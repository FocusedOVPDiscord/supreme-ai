"""
Supreme AI Bot - Prefix Command Version (!) - Final Help Fix
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

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

class SupremeAIBot(commands.Bot):
    def __init__(self):
        prefix = Config.BOT_PREFIX if Config.BOT_PREFIX else "!"
        intents = discord.Intents.all() 
        
        # CRITICAL: help_command=None disables the default help command
        super().__init__(command_prefix=prefix, intents=intents, help_command=None)
        
        self.db = TrainingDatabase(Config.DB_PATH)
        self.ai = GroqClient(Config.GROQ_API_KEY)
        self.groq_ready = False

    async def setup_hook(self):
        print(f"🚀 Starting Bot Setup (Prefix: {self.command_prefix})...")
        
        # Import and setup prefix commands
        from commands_v2 import setup_commands
        setup_commands(self)
        
        # Load listener
        try:
            from ticket_listener import TicketListener
            await self.add_cog(TicketListener(self))
            print("✓ Ticket listener loaded")
        except Exception as e:
            print(f"✗ Listener failed: {e}")

    async def on_ready(self):
        print(f"✅ Logged in as {self.user}")
        print(f"✅ Ready for prefix commands using '{self.command_prefix}'")
        
        self.groq_ready = await self.ai.check_health()
        
        await self.change_presence(
            activity=discord.Activity(
                type=discord.ActivityType.watching, 
                name=f"tickets | {self.command_prefix}help"
            )
        )

    async def on_message(self, message):
        if message.author == self.user:
            return
        
        # Process commands
        await self.process_commands(message)

    async def on_command_error(self, ctx, error):
        if isinstance(error, commands.CommandNotFound):
            return
        logger.error(f"Command Error: {error}")
        try:
            await ctx.send(f"❌ Error: {str(error)}")
        except:
            pass
