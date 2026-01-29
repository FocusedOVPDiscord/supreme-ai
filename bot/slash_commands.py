"""
Slash commands for Supreme AI Bot
Handles /train and ticket management
"""
import discord
from discord import app_commands
from discord.ext import commands
import logging
from typing import Optional

logger = logging.getLogger(__name__)


class TrainingCommands(commands.Cog):
    """Training commands"""
    
    def __init__(self, bot: commands.Bot):
        self.bot = bot
    
    @app_commands.command(name="train", description="Train the bot with a question and answer")
    @app_commands.describe(
        question="The question to train",
        answer="The answer the bot should give",
        category="Category for organizing training data"
    )
    async def train(
        self, 
        interaction: discord.Interaction,
        question: str,
        answer: str,
        category: str = "general"
    ):
        """Train the bot with Q&A pairs"""
        try:
            await interaction.response.defer()
            
            success = self.bot.db.add_training(
                query=question,
                response=answer,
                category=category
            )
            
            if success:
                embed = discord.Embed(
                    title="✓ Training Added",
                    color=discord.Color.green()
                )
                embed.add_field(name="Question", value=question[:100], inline=False)
                embed.add_field(name="Answer", value=answer[:100], inline=False)
                embed.add_field(name="Category", value=category, inline=False)
                await interaction.followup.send(embed=embed)
                logger.info(f"✓ Training added: {question[:50]}")
            else:
                await interaction.followup.send("❌ Failed to add training data", ephemeral=True)
        except Exception as e:
            logger.error(f"Error in train command: {e}")
            await interaction.followup.send(f"❌ Error: {str(e)}", ephemeral=True)
    
    @app_commands.command(name="training_list", description="List all training data")
    async def training_list(self, interaction: discord.Interaction):
        """List all training data"""
        try:
            await interaction.response.defer()
            
            all_training = self.bot.db.get_all_training()
            
            if not all_training:
                embed = discord.Embed(
                    title="📚 Training Data",
                    description="No training data found",
                    color=discord.Color.blue()
                )
                await interaction.followup.send(embed=embed)
                return
            
            embed = discord.Embed(
                title="📚 Training Data",
                description=f"Total: {len(all_training)} entries",
                color=discord.Color.blue()
            )
            
            for idx, training in enumerate(all_training[:10], 1):
                embed.add_field(
                    name=f"{idx}. {training['query'][:50]}",
                    value=f"Answer: {training['response'][:100]}",
                    inline=False
                )
            
            await interaction.followup.send(embed=embed)
        except Exception as e:
            logger.error(f"Error in training_list: {e}")
            await interaction.followup.send(f"❌ Error: {str(e)}", ephemeral=True)
    
    @app_commands.command(name="training_stats", description="Show training statistics")
    async def training_stats(self, interaction: discord.Interaction):
        """Show training statistics"""
        try:
            await interaction.response.defer()
            
            stats = self.bot.db.get_stats()
            
            embed = discord.Embed(
                title="📊 Bot Statistics",
                color=discord.Color.blue()
            )
            embed.add_field(name="Training Entries", value=str(stats['total_training_entries']), inline=True)
            embed.add_field(name="Total Usage", value=str(stats['total_usage']), inline=True)
            embed.add_field(name="Conversations", value=str(stats['total_conversations']), inline=True)
            embed.add_field(name="Open Tickets", value=str(stats['open_tickets']), inline=True)
            embed.add_field(name="Groq Status", value="✓ Online" if self.bot.groq_ready else "✗ Offline", inline=True)
            
            await interaction.followup.send(embed=embed)
        except Exception as e:
            logger.error(f"Error in training_stats: {e}")
            await interaction.followup.send(f"❌ Error: {str(e)}", ephemeral=True)
    
    @app_commands.command(name="training_delete", description="Delete training data by ID")
    @app_commands.describe(training_id="The ID of the training data to delete")
    async def training_delete(self, interaction: discord.Interaction, training_id: int):
        """Delete training data"""
        try:
            await interaction.response.defer()
            
            success = self.bot.db.delete_training(training_id)
            
            if success:
                embed = discord.Embed(
                    title="✓ Training Deleted",
                    description=f"Training entry #{training_id} deleted",
                    color=discord.Color.green()
                )
                await interaction.followup.send(embed=embed)
            else:
                await interaction.followup.send(f"❌ Training #{training_id} not found", ephemeral=True)
        except Exception as e:
            logger.error(f"Error in training_delete: {e}")
            await interaction.followup.send(f"❌ Error: {str(e)}", ephemeral=True)


class TicketCommands(commands.Cog):
    """Ticket management commands"""
    
    def __init__(self, bot: commands.Bot):
        self.bot = bot
    
    @app_commands.command(name="ticket_info", description="Get information about a ticket")
    @app_commands.describe(ticket_number="The ticket number (e.g., 0001)")
    async def ticket_info(self, interaction: discord.Interaction, ticket_number: str):
        """Get ticket information"""
        try:
            await interaction.response.defer()
            
            ticket_id = f"ticket-{ticket_number.zfill(4)}"
            context = self.bot.db.get_ticket_context_info(ticket_id)
            
            if not context:
                await interaction.followup.send(f"❌ Ticket {ticket_id} not found", ephemeral=True)
                return
            
            embed = discord.Embed(
                title=f"🎫 {ticket_id}",
                color=discord.Color.blue()
            )
            embed.add_field(name="Status", value=context.get('status', 'unknown'), inline=True)
            embed.add_field(name="Category", value=context.get('category', 'general'), inline=True)
            embed.add_field(name="Created", value=context.get('created_at', 'unknown'), inline=True)
            
            await interaction.followup.send(embed=embed)
        except Exception as e:
            logger.error(f"Error in ticket_info: {e}")
            await interaction.followup.send(f"❌ Error: {str(e)}", ephemeral=True)
    
    @app_commands.command(name="close_ticket", description="Close a ticket")
    @app_commands.describe(ticket_number="The ticket number to close")
    async def close_ticket(self, interaction: discord.Interaction, ticket_number: str):
        """Close a ticket"""
        try:
            await interaction.response.defer()
            
            ticket_id = f"ticket-{ticket_number.zfill(4)}"
            success = self.bot.db.update_ticket_status(ticket_id, "closed")
            
            if success:
                embed = discord.Embed(
                    title="✓ Ticket Closed",
                    description=f"{ticket_id} has been closed",
                    color=discord.Color.green()
                )
                await interaction.followup.send(embed=embed)
            else:
                await interaction.followup.send(f"❌ Could not close {ticket_id}", ephemeral=True)
        except Exception as e:
            logger.error(f"Error in close_ticket: {e}")
            await interaction.followup.send(f"❌ Error: {str(e)}", ephemeral=True)
