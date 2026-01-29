"""
Supreme AI Bot - Absolute Diagnostic Version
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

# Force logging to be extremely loud
root_logger = logging.getLogger()
root_logger.setLevel(logging.DEBUG)
handler = logging.StreamHandler(sys.stdout)
handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
root_logger.addHandler(handler)

logger = logging.getLogger(__name__)

class SupremeAIBot(commands.Bot):
    def __init__(self):
        prefix = Config.BOT_PREFIX if Config.BOT_PREFIX else "!"
        intents = discord.Intents.all() 
        
        print(f"DEBUG: Initializing bot with prefix '{prefix}' and all intents")
        super().__init__(command_prefix=prefix, intents=intents, help_command=None)
        
        self.db = TrainingDatabase(Config.DB_PATH)
        self.ai = GroqClient(Config.GROQ_API_KEY)
        self.groq_ready = False

    async def setup_hook(self):
        print("DEBUG: setup_hook started")
        from commands_v2 import setup_commands
        setup_commands(self)
        
        try:
            from ticket_listener import TicketListener
            await self.add_cog(TicketListener(self))
            print("DEBUG: TicketListener cog added")
        except Exception as e:
            print(f"DEBUG: Failed to add TicketListener: {e}")

    async def on_ready(self):
        print(f"DEBUG: LOGGED IN AS {self.user} (ID: {self.user.id})")
        print(f"DEBUG: GUILDS: {len(self.guilds)}")
        for guild in self.guilds:
            print(f"DEBUG: - Connected to Guild: {guild.name} (ID: {guild.id})")
        
        self.groq_ready = await self.ai.check_health()
        print(f"DEBUG: Groq Ready: {self.groq_ready}")

    async def on_message(self, message):
        # ABSOLUTE LOGGING: This will print for EVERY message the bot can see
        print(f"DEBUG: [MESSAGE] Author: {message.author} | Content: '{message.content}' | Channel: {message.channel}")
        
        if message.author == self.user:
            return

        # Check if prefix is detected
        if message.content.startswith(self.command_prefix):
            print(f"DEBUG: [PREFIX DETECTED] '{message.content}'")
        
        await self.process_commands(message)

    async def on_command(self, ctx):
        print(f"DEBUG: [COMMAND START] {ctx.command.name} by {ctx.author}")

    async def on_command_error(self, ctx, error):
        print(f"DEBUG: [COMMAND ERROR] {error}")
        if isinstance(error, commands.CommandNotFound):
            print(f"DEBUG: Command not found: {ctx.message.content}")
        else:
            traceback.print_exc()
            try:
                await ctx.send(f"❌ Error: {str(error)}")
            except:
                print("DEBUG: Could not send error message to Discord")

    async def on_error(self, event, *args, **kwargs):
        print(f"DEBUG: [GENERAL ERROR] Event: {event}")
        traceback.print_exc()
