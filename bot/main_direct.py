"""
Supreme AI Bot - Prefix Command Version (!) with Deep Debugging
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

# Configure logging to be very verbose for debugging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

class SupremeAIBot(commands.Bot):
    def __init__(self):
        prefix = Config.BOT_PREFIX if Config.BOT_PREFIX else "!"
        
        # CRITICAL: Ensure all intents are enabled
        intents = discord.Intents.all() 
        
        super().__init__(command_prefix=prefix, intents=intents, help_command=None)
        
        self.db = TrainingDatabase(Config.DB_PATH)
        self.ai = GroqClient(Config.GROQ_API_KEY)
        self.groq_ready = False

    async def setup_hook(self):
        print(f"🚀 Starting Bot Setup (Prefix: {self.command_prefix})...")
        logger.info(f"Intents configured: {self.intents}")
        
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
        print(f"✅ Logged in as {self.user} (ID: {self.user.id})")
        print(f"✅ Ready for prefix commands using '{self.command_prefix}'")
        print(f"✅ Bot is in {len(self.guilds)} guilds")
        
        self.groq_ready = await self.ai.check_health()
        
        await self.change_presence(
            activity=discord.Activity(
                type=discord.ActivityType.watching, 
                name=f"tickets | {self.command_prefix}help"
            )
        )

    async def on_message(self, message):
        # Log EVERY message the bot sees
        if message.author == self.user:
            return
            
        logger.debug(f"📩 Message received: '{message.content}' from {message.author} in {message.channel}")
        
        # Check if it starts with prefix
        if message.content.startswith(self.command_prefix):
            logger.info(f"🎯 Command detected: {message.content}")
        
        # Process commands
        await self.process_commands(message)

    async def on_command(self, ctx):
        logger.info(f"🏃 Executing command: {ctx.command.name} by {ctx.author}")

    async def on_command_completion(self, ctx):
        logger.info(f"✅ Command completed: {ctx.command.name}")

    async def on_command_error(self, ctx, error):
        if isinstance(error, commands.CommandNotFound):
            logger.warning(f"❓ Unknown command: {ctx.message.content}")
            # Optional: reply to user
            # await ctx.send(f"Unknown command. Type `{self.command_prefix}help` for help.")
            return
            
        logger.error(f"❌ Command Error in {ctx.command}: {error}")
        traceback.print_exc()
        await ctx.send(f"❌ An error occurred: {str(error)}")
