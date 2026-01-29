"""
Direct command registration without cogs
"""
import discord
from discord import app_commands
from discord.ext import commands
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
            
            logger.info("✓ Bot initialized successfully")
            
            # Register commands directly
            self.register_commands()
            
        except Exception as e:
            logger.error(f"✗ Error in __init__: {e}")
            traceback.print_exc()
            raise
    
    def register_commands(self):
        """Register all slash commands directly"""
        try:
            logger.info("Registering slash commands...")
            
            @self.tree.command(name="train", description="Train the bot with Q&A")
            @app_commands.describe(
                question="The question",
                answer="The answer",
                category="Category (optional)"
            )
            async def train(interaction: discord.Interaction, question: str, answer: str, category: str = "general"):
                await interaction.response.defer()
                success = self.db.add_training(query=question, response=answer, category=category)
                if success:
                    embed = discord.Embed(title="✓ Training Added", color=discord.Color.green())
                    embed.add_field(name="Q", value=question[:100], inline=False)
                    embed.add_field(name="A", value=answer[:100], inline=False)
                    await interaction.followup.send(embed=embed)
                else:
                    await interaction.followup.send("❌ Failed", ephemeral=True)
            
            @self.tree.command(name="training_list", description="List training data")
            async def training_list(interaction: discord.Interaction):
                await interaction.response.defer()
                data = self.db.get_all_training()
                if not data:
                    embed = discord.Embed(title="📚 No training data", color=discord.Color.blue())
                    await interaction.followup.send(embed=embed)
                    return
                embed = discord.Embed(title=f"📚 Training ({len(data)} entries)", color=discord.Color.blue())
                for idx, item in enumerate(data[:10], 1):
                    embed.add_field(name=f"{idx}. {item['query'][:40]}", value=item['response'][:80], inline=False)
                await interaction.followup.send(embed=embed)
            
            @self.tree.command(name="training_stats", description="Show statistics")
            async def training_stats(interaction: discord.Interaction):
                await interaction.response.defer()
                stats = self.db.get_stats()
                embed = discord.Embed(title="📊 Statistics", color=discord.Color.blue())
                embed.add_field(name="Training Entries", value=str(stats['total_training_entries']), inline=True)
                embed.add_field(name="Total Usage", value=str(stats['total_usage']), inline=True)
                embed.add_field(name="Conversations", value=str(stats['total_conversations']), inline=True)
                embed.add_field(name="Open Tickets", value=str(stats['open_tickets']), inline=True)
                embed.add_field(name="Groq Status", value="✓ Online" if self.groq_ready else "✗ Offline", inline=True)
                await interaction.followup.send(embed=embed)
            
            @self.tree.command(name="training_delete", description="Delete training")
            @app_commands.describe(training_id="Training ID to delete")
            async def training_delete(interaction: discord.Interaction, training_id: int):
                await interaction.response.defer()
                success = self.db.delete_training(training_id)
                if success:
                    embed = discord.Embed(title="✓ Deleted", color=discord.Color.green())
                    await interaction.followup.send(embed=embed)
                else:
                    await interaction.followup.send(f"❌ Not found", ephemeral=True)
            
            @self.tree.command(name="ticket_info", description="Get ticket info")
            @app_commands.describe(ticket_number="Ticket number (e.g., 0001)")
            async def ticket_info(interaction: discord.Interaction, ticket_number: str):
                await interaction.response.defer()
                ticket_id = f"ticket-{ticket_number.zfill(4)}"
                context = self.db.get_ticket_context_info(ticket_id)
                if not context:
                    await interaction.followup.send(f"❌ {ticket_id} not found", ephemeral=True)
                    return
                embed = discord.Embed(title=f"🎫 {ticket_id}", color=discord.Color.blue())
                embed.add_field(name="Status", value=context.get('status', 'unknown'), inline=True)
                embed.add_field(name="Category", value=context.get('category', 'general'), inline=True)
                await interaction.followup.send(embed=embed)
            
            @self.tree.command(name="close_ticket", description="Close a ticket")
            @app_commands.describe(ticket_number="Ticket number to close")
            async def close_ticket(interaction: discord.Interaction, ticket_number: str):
                await interaction.response.defer()
                ticket_id = f"ticket-{ticket_number.zfill(4)}"
                success = self.db.update_ticket_status(ticket_id, "closed")
                if success:
                    embed = discord.Embed(title="✓ Closed", description=f"{ticket_id} closed", color=discord.Color.green())
                    await interaction.followup.send(embed=embed)
                else:
                    await interaction.followup.send(f"❌ Could not close", ephemeral=True)
            
            logger.info("✓ Registered 6 slash commands")
        
        except Exception as e:
            logger.error(f"✗ Error registering commands: {e}")
            traceback.print_exc()
    
    async def setup_hook(self):
        """Setup before connecting"""
        try:
            logger.info("🚀 Setting up bot...")
            
            self.groq_ready = await self.ai.check_health()
            if self.groq_ready:
                logger.info("✓ Groq AI ready")
            else:
                logger.warning("✗ Groq AI not ready")
            
            # Load ticket listener
            try:
                from ticket_listener import TicketListener
                await self.add_cog(TicketListener(self))
                logger.info("✓ Ticket listener loaded")
            except Exception as e:
                logger.error(f"✗ Failed to load listener: {e}")
                traceback.print_exc()
            
            # Sync commands
            try:
                synced = await self.tree.sync()
                logger.info(f"✓ Synced {len(synced)} commands")
                for cmd in synced:
                    logger.info(f"  - /{cmd.name}")
            except Exception as e:
                logger.error(f"✗ Sync failed: {e}")
                traceback.print_exc()
        
        except Exception as e:
            logger.error(f"✗ Error in setup_hook: {e}")
            traceback.print_exc()
    
    async def on_ready(self):
        """Bot ready"""
        try:
            logger.info(f"✓ Bot logged in as {self.user}")
            logger.info(f"✓ Bot in {len(self.guilds)} guild(s)")
            
            try:
                stats = self.db.get_stats()
                logger.info(f"📊 DB: {stats['total_training_entries']} training, "
                           f"{stats['total_conversations']} conversations")
            except Exception as e:
                logger.warning(f"Could not get stats: {e}")
            
            await self.change_presence(
                activity=discord.Activity(
                    type=discord.ActivityType.watching,
                    name="tickets | Groq AI"
                )
            )
        except Exception as e:
            logger.error(f"✗ Error in on_ready: {e}")
            traceback.print_exc()
