"""
Training commands for teaching the bot
"""
import discord
from discord.ext import commands
from discord import app_commands
import logging

from memory import TrainingDatabase
from config import Config

logger = logging.getLogger(__name__)


class TrainingCommands(commands.Cog):
    """Commands for training the bot with custom responses"""
    
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.db = TrainingDatabase(Config.DB_PATH)
    
    @app_commands.command(name="train", description="Train the bot with a custom response")
    @app_commands.describe(
        question="The question or pattern to train",
        answer="The response the bot should give",
        category="Category for this training (billing, technical, general, etc.)",
        tags="Comma-separated tags for organization"
    )
    async def train(self, interaction: discord.Interaction, question: str, answer: str,
                   category: str = "general", tags: str = None):
        """Add training data to the bot"""
        
        if not Config.ENABLE_TRAINING:
            await interaction.response.send_message("Training is currently disabled.", ephemeral=True)
            return
        
        try:
            # Parse tags
            tag_list = [t.strip() for t in tags.split(",")] if tags else []
            
            # Add to database
            success = self.db.add_training(
                query=question,
                response=answer,
                category=category,
                tags=tag_list,
                metadata={
                    "trained_by": str(interaction.user.id),
                    "trained_by_name": interaction.user.name
                }
            )
            
            if success:
                embed = discord.Embed(
                    title="✓ Training Added",
                    description=f"Successfully trained the bot!",
                    color=discord.Color.green()
                )
                embed.add_field(name="Question", value=question, inline=False)
                embed.add_field(name="Answer", value=answer, inline=False)
                embed.add_field(name="Category", value=category, inline=True)
                if tags:
                    embed.add_field(name="Tags", value=tags, inline=True)
                
                await interaction.response.send_message(embed=embed, ephemeral=True)
                logger.info(f"Training added by {interaction.user}: {question}")
            else:
                await interaction.response.send_message(
                    "Failed to add training data. This question might already exist.",
                    ephemeral=True
                )
        
        except Exception as e:
            logger.error(f"Error in train command: {e}")
            await interaction.response.send_message(
                f"Error: {str(e)}",
                ephemeral=True
            )
    
    @app_commands.command(name="training_list", description="List all trained responses")
    @app_commands.describe(
        category="Filter by category (optional)"
    )
    async def training_list(self, interaction: discord.Interaction, category: str = None):
        """List all training data"""
        
        try:
            training_data = self.db.get_all_training(category=category if category else None)
            
            if not training_data:
                await interaction.response.send_message(
                    "No training data found.",
                    ephemeral=True
                )
                return
            
            # Create paginated response
            embed = discord.Embed(
                title="📚 Training Data",
                description=f"Total entries: {len(training_data)}",
                color=discord.Color.blue()
            )
            
            # Show first 10 entries
            for item in training_data[:10]:
                embed.add_field(
                    name=f"Q: {item['query'][:50]}...",
                    value=f"A: {item['response'][:100]}...\nUsed: {item['usage_count']} times",
                    inline=False
                )
            
            if len(training_data) > 10:
                embed.set_footer(text=f"Showing 10 of {len(training_data)} entries")
            
            await interaction.response.send_message(embed=embed, ephemeral=True)
        
        except Exception as e:
            logger.error(f"Error in training_list command: {e}")
            await interaction.response.send_message(
                f"Error: {str(e)}",
                ephemeral=True
            )
    
    @app_commands.command(name="training_delete", description="Delete a training entry")
    @app_commands.describe(
        entry_id="The ID of the training entry to delete"
    )
    async def training_delete(self, interaction: discord.Interaction, entry_id: int):
        """Delete training data"""
        
        try:
            # Get the entry first
            entry = self.db.get_training(entry_id)
            if not entry:
                await interaction.response.send_message(
                    f"Training entry {entry_id} not found.",
                    ephemeral=True
                )
                return
            
            # Delete it
            success = self.db.delete_training(entry_id)
            
            if success:
                embed = discord.Embed(
                    title="✓ Training Deleted",
                    description=f"Deleted training entry {entry_id}",
                    color=discord.Color.green()
                )
                embed.add_field(name="Question", value=entry['query'], inline=False)
                embed.add_field(name="Answer", value=entry['response'], inline=False)
                
                await interaction.response.send_message(embed=embed, ephemeral=True)
                logger.info(f"Training deleted by {interaction.user}: {entry['query']}")
            else:
                await interaction.response.send_message(
                    "Failed to delete training entry.",
                    ephemeral=True
                )
        
        except Exception as e:
            logger.error(f"Error in training_delete command: {e}")
            await interaction.response.send_message(
                f"Error: {str(e)}",
                ephemeral=True
            )
    
    @app_commands.command(name="training_stats", description="Show training statistics")
    async def training_stats(self, interaction: discord.Interaction):
        """Show training statistics"""
        
        try:
            stats = self.db.get_stats()
            
            embed = discord.Embed(
                title="📊 Training Statistics",
                color=discord.Color.purple()
            )
            embed.add_field(
                name="Total Training Entries",
                value=str(stats['total_training_entries']),
                inline=True
            )
            embed.add_field(
                name="Total Conversations",
                value=str(stats['total_conversations']),
                inline=True
            )
            embed.add_field(
                name="Open Tickets",
                value=str(stats['open_tickets']),
                inline=True
            )
            embed.add_field(
                name="Total Usage",
                value=f"{stats['total_usage']} times",
                inline=True
            )
            
            await interaction.response.send_message(embed=embed, ephemeral=True)
        
        except Exception as e:
            logger.error(f"Error in training_stats command: {e}")
            await interaction.response.send_message(
                f"Error: {str(e)}",
                ephemeral=True
            )


async def setup(bot: commands.Bot):
    """Load training commands"""
    await bot.add_cog(TrainingCommands(bot))
