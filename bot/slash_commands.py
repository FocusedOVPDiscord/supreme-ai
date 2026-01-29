"""
Slash commands for Supreme AI Bot
Handles /train and ticket management
"""
import discord
from discord import app_commands
from discord.ext import commands
import logging
import re
from typing import Optional

logger = logging.getLogger(__name__)


class TrainingCommands(commands.Cog):
    """Training and ticket management commands"""
    
    def __init__(self, bot: commands.Bot):
        self.bot = bot
    
    @app_commands.command(name="train", description="Train the bot with a question and answer")
    @app_commands.describe(
        question="The question to train",
        answer="The answer the bot should give",
        category="Category for organizing training data (optional)"
    )
    async def train(
        self, 
        interaction: discord.Interaction,
        question: str,
        answer: str,
        category: Optional[str] = "general"
    ):
        """Train the bot with Q&A pairs"""
        try:
            await interaction.response.defer()
            
            # Add training data
            success = self.bot.db.add_training(
                query=question,
                response=answer,
                category=category or "general"
            )
            
            if success:
                embed = discord.Embed(
                    title="✓ Training Data Added",
                    description=f"Bot trained successfully!",
                    color=discord.Color.green()
                )
                embed.add_field(name="Question", value=question, inline=False)
                embed.add_field(name="Answer", value=answer, inline=False)
                embed.add_field(name="Category", value=category or "general", inline=False)
                
                await interaction.followup.send(embed=embed)
                logger.info(f"✓ Training added: {question[:50]}...")
            else:
                embed = discord.Embed(
                    title="✗ Training Failed",
                    description="Could not add training data to database",
                    color=discord.Color.red()
                )
                await interaction.followup.send(embed=embed)
                logger.error(f"✗ Failed to add training: {question}")
        
        except Exception as e:
            logger.error(f"Error in train command: {e}")
            await interaction.followup.send(f"❌ Error: {str(e)}", ephemeral=True)
    
    @app_commands.command(name="training_list", description="List all training data")
    @app_commands.describe(
        category="Filter by category (optional)"
    )
    async def training_list(
        self,
        interaction: discord.Interaction,
        category: Optional[str] = None
    ):
        """List all training data"""
        try:
            await interaction.response.defer()
            
            # Get all training data
            all_training = self.bot.db.get_all_training()
            
            if category:
                all_training = [t for t in all_training if t.get('category') == category]
            
            if not all_training:
                embed = discord.Embed(
                    title="📚 Training Data",
                    description="No training data found",
                    color=discord.Color.blue()
                )
                await interaction.followup.send(embed=embed)
                return
            
            # Create paginated response
            embed = discord.Embed(
                title="📚 Training Data",
                description=f"Total: {len(all_training)} entries",
                color=discord.Color.blue()
            )
            
            for idx, training in enumerate(all_training[:10], 1):
                embed.add_field(
                    name=f"{idx}. {training['query'][:50]}",
                    value=f"Answer: {training['response'][:100]}...\nCategory: {training.get('category', 'general')}",
                    inline=False
                )
            
            if len(all_training) > 10:
                embed.set_footer(text=f"Showing 10 of {len(all_training)} entries")
            
            await interaction.followup.send(embed=embed)
        
        except Exception as e:
            logger.error(f"Error in training_list command: {e}")
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
            embed.add_field(name="Groq AI Status", value="✓ Online" if self.bot.groq_ready else "✗ Offline", inline=True)
            
            await interaction.followup.send(embed=embed)
        
        except Exception as e:
            logger.error(f"Error in training_stats command: {e}")
            await interaction.followup.send(f"❌ Error: {str(e)}", ephemeral=True)
    
    @app_commands.command(name="training_delete", description="Delete training data by ID")
    @app_commands.describe(
        training_id="The ID of the training data to delete"
    )
    async def training_delete(
        self,
        interaction: discord.Interaction,
        training_id: int
    ):
        """Delete training data"""
        try:
            await interaction.response.defer()
            
            success = self.bot.db.delete_training(training_id)
            
            if success:
                embed = discord.Embed(
                    title="✓ Training Deleted",
                    description=f"Training entry #{training_id} deleted successfully",
                    color=discord.Color.green()
                )
                await interaction.followup.send(embed=embed)
                logger.info(f"✓ Training deleted: ID {training_id}")
            else:
                embed = discord.Embed(
                    title="✗ Not Found",
                    description=f"Training entry #{training_id} not found",
                    color=discord.Color.red()
                )
                await interaction.followup.send(embed=embed)
        
        except Exception as e:
            logger.error(f"Error in training_delete command: {e}")
            await interaction.followup.send(f"❌ Error: {str(e)}", ephemeral=True)


class TicketCommands(commands.Cog):
    """Ticket management commands"""
    
    def __init__(self, bot: commands.Bot):
        self.bot = bot
    
    @app_commands.command(name="ticket_info", description="Get information about a ticket")
    @app_commands.describe(
        ticket_number="The ticket number (e.g., 0001 for ticket-0001)"
    )
    async def ticket_info(
        self,
        interaction: discord.Interaction,
        ticket_number: str
    ):
        """Get ticket information"""
        try:
            await interaction.response.defer()
            
            # Normalize ticket number
            ticket_id = f"ticket-{ticket_number.zfill(4)}"
            
            # Get ticket context
            context = self.bot.db.get_ticket_context(ticket_id)
            
            if not context:
                embed = discord.Embed(
                    title="✗ Ticket Not Found",
                    description=f"Ticket {ticket_id} not found in database",
                    color=discord.Color.red()
                )
                await interaction.followup.send(embed=embed)
                return
            
            embed = discord.Embed(
                title=f"🎫 Ticket Information",
                description=f"Ticket ID: {ticket_id}",
                color=discord.Color.blue()
            )
            embed.add_field(name="Status", value=context.get('status', 'unknown'), inline=True)
            embed.add_field(name="User", value=f"<@{context.get('user_id', 'unknown')}>", inline=True)
            embed.add_field(name="Category", value=context.get('category', 'general'), inline=True)
            embed.add_field(name="Created", value=context.get('created_at', 'unknown'), inline=True)
            
            if context.get('closed_at'):
                embed.add_field(name="Closed", value=context.get('closed_at'), inline=True)
            
            await interaction.followup.send(embed=embed)
        
        except Exception as e:
            logger.error(f"Error in ticket_info command: {e}")
            await interaction.followup.send(f"❌ Error: {str(e)}", ephemeral=True)
    
    @app_commands.command(name="close_ticket", description="Close a ticket")
    @app_commands.describe(
        ticket_number="The ticket number to close"
    )
    async def close_ticket(
        self,
        interaction: discord.Interaction,
        ticket_number: str
    ):
        """Close a ticket"""
        try:
            await interaction.response.defer()
            
            # Normalize ticket number
            ticket_id = f"ticket-{ticket_number.zfill(4)}"
            
            # Update ticket status
            success = self.bot.db.update_ticket_status(ticket_id, "closed")
            
            if success:
                embed = discord.Embed(
                    title="✓ Ticket Closed",
                    description=f"Ticket {ticket_id} has been closed",
                    color=discord.Color.green()
                )
                await interaction.followup.send(embed=embed)
                logger.info(f"✓ Ticket closed: {ticket_id}")
            else:
                embed = discord.Embed(
                    title="✗ Failed to Close",
                    description=f"Could not close ticket {ticket_id}",
                    color=discord.Color.red()
                )
                await interaction.followup.send(embed=embed)
        
        except Exception as e:
            logger.error(f"Error in close_ticket command: {e}")
            await interaction.followup.send(f"❌ Error: {str(e)}", ephemeral=True)


async def setup(bot: commands.Bot):
    """Load slash commands"""
    await bot.add_cog(TrainingCommands(bot))
    await bot.add_cog(TicketCommands(bot))
    logger.info("✓ Slash commands loaded")
