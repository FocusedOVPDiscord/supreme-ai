"""
Ticket management commands
"""
import discord
from discord.ext import commands
from discord import app_commands
import logging

from memory import TrainingDatabase
from config import Config

logger = logging.getLogger(__name__)


class TicketCommands(commands.Cog):
    """Commands for managing support tickets"""
    
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.db = TrainingDatabase(Config.DB_PATH)
        self.forum_channel_id = None
        self.staff_role_id = None
    
    @app_commands.command(name="setup", description="Setup the bot for your server")
    @app_commands.describe(
        forum_channel="The forum channel for tickets",
        staff_role="The role for support staff"
    )
    @app_commands.checks.has_permissions(administrator=True)
    async def setup(self, interaction: discord.Interaction, forum_channel: discord.ForumChannel,
                   staff_role: discord.Role):
        """Setup bot configuration"""
        
        try:
            self.forum_channel_id = forum_channel.id
            self.staff_role_id = staff_role.id
            
            embed = discord.Embed(
                title="✓ Bot Setup Complete",
                description="The bot is now configured for your server!",
                color=discord.Color.green()
            )
            embed.add_field(name="Forum Channel", value=forum_channel.mention, inline=True)
            embed.add_field(name="Staff Role", value=staff_role.mention, inline=True)
            embed.add_field(
                name="Next Steps",
                value="Use `/ticket_panel` to create a ticket creation panel.",
                inline=False
            )
            
            await interaction.response.send_message(embed=embed, ephemeral=True)
            logger.info(f"Bot setup in {interaction.guild}: forum={forum_channel.id}, staff={staff_role.id}")
        
        except Exception as e:
            logger.error(f"Error in setup command: {e}")
            await interaction.response.send_message(
                f"Error: {str(e)}",
                ephemeral=True
            )
    
    @app_commands.command(name="ticket_panel", description="Create a ticket creation panel")
    @app_commands.describe(
        title="Title for the ticket panel",
        description="Description text",
        categories="Comma-separated ticket categories (e.g., 'Billing,Technical,General')"
    )
    @app_commands.checks.has_permissions(administrator=True)
    async def ticket_panel(self, interaction: discord.Interaction, title: str = "Support Tickets",
                          description: str = "Click a button below to create a support ticket",
                          categories: str = "Billing,Technical,General"):
        """Create a ticket creation panel with buttons"""
        
        if not self.forum_channel_id:
            await interaction.response.send_message(
                "Please run `/setup` first to configure the bot.",
                ephemeral=True
            )
            return
        
        try:
            # Parse categories
            category_list = [c.strip() for c in categories.split(",")]
            
            # Create embed
            embed = discord.Embed(
                title=title,
                description=description,
                color=discord.Color.blurple()
            )
            embed.add_field(
                name="Categories",
                value="\n".join([f"• {cat}" for cat in category_list]),
                inline=False
            )
            
            # Create buttons
            class TicketButton(discord.ui.Button):
                def __init__(self, category: str, parent_cog):
                    super().__init__(label=category, style=discord.ButtonStyle.primary)
                    self.category = category
                    self.parent_cog = parent_cog
                
                async def callback(self, interaction: discord.Interaction):
                    await self.parent_cog._create_ticket(interaction, self.category)
            
            view = discord.ui.View(timeout=None)
            for category in category_list:
                view.add_item(TicketButton(category, self))
            
            await interaction.response.send_message(embed=embed, view=view)
            logger.info(f"Ticket panel created in {interaction.guild}")
        
        except Exception as e:
            logger.error(f"Error in ticket_panel command: {e}")
            await interaction.response.send_message(
                f"Error: {str(e)}",
                ephemeral=True
            )
    
    async def _create_ticket(self, interaction: discord.Interaction, category: str):
        """Create a new ticket"""
        try:
            forum_channel = self.bot.get_channel(self.forum_channel_id)
            if not forum_channel:
                await interaction.response.send_message(
                    "Forum channel not found. Please run `/setup` again.",
                    ephemeral=True
                )
                return
            
            # Create thread in forum
            thread_name = f"{category} - {interaction.user.name}"
            thread = await forum_channel.create_thread(
                name=thread_name[:100],  # Discord limit
                content=f"Ticket created by {interaction.user.mention}\nCategory: {category}"
            )
            
            # Create ticket context in database
            self.db.create_ticket_context(
                ticket_id=str(thread.id),
                user_id=str(interaction.user.id),
                category=category
            )
            
            embed = discord.Embed(
                title="✓ Ticket Created",
                description=f"Your support ticket has been created!",
                color=discord.Color.green()
            )
            embed.add_field(name="Category", value=category, inline=True)
            embed.add_field(name="Ticket", value=thread.mention, inline=True)
            
            await interaction.response.send_message(embed=embed, ephemeral=True)
            logger.info(f"Ticket created: {thread.id} by {interaction.user}")
        
        except Exception as e:
            logger.error(f"Error creating ticket: {e}")
            await interaction.response.send_message(
                f"Error creating ticket: {str(e)}",
                ephemeral=True
            )
    
    @app_commands.command(name="close_ticket", description="Close the current ticket")
    async def close_ticket(self, interaction: discord.Interaction):
        """Close a ticket"""
        
        if not isinstance(interaction.channel, discord.Thread):
            await interaction.response.send_message(
                "This command can only be used in a ticket thread.",
                ephemeral=True
            )
            return
        
        try:
            ticket_id = str(interaction.channel.id)
            
            # Mark as closed in database
            self.db.close_ticket(ticket_id)
            
            # Archive the thread
            await interaction.channel.edit(archived=True)
            
            embed = discord.Embed(
                title="✓ Ticket Closed",
                description="This ticket has been closed and archived.",
                color=discord.Color.green()
            )
            
            await interaction.response.send_message(embed=embed)
            logger.info(f"Ticket closed: {ticket_id}")
        
        except Exception as e:
            logger.error(f"Error closing ticket: {e}")
            await interaction.response.send_message(
                f"Error: {str(e)}",
                ephemeral=True
            )
    
    @app_commands.command(name="ticket_info", description="Get information about the current ticket")
    async def ticket_info(self, interaction: discord.Interaction):
        """Get ticket information"""
        
        if not isinstance(interaction.channel, discord.Thread):
            await interaction.response.send_message(
                "This command can only be used in a ticket thread.",
                ephemeral=True
            )
            return
        
        try:
            ticket_id = str(interaction.channel.id)
            messages = self.db.get_ticket_context(ticket_id)
            
            embed = discord.Embed(
                title="📋 Ticket Information",
                description=f"Ticket ID: {ticket_id}",
                color=discord.Color.blue()
            )
            embed.add_field(
                name="Messages",
                value=str(len(messages)),
                inline=True
            )
            embed.add_field(
                name="Created",
                value=interaction.channel.created_at.strftime("%Y-%m-%d %H:%M"),
                inline=True
            )
            
            await interaction.response.send_message(embed=embed, ephemeral=True)
        
        except Exception as e:
            logger.error(f"Error getting ticket info: {e}")
            await interaction.response.send_message(
                f"Error: {str(e)}",
                ephemeral=True
            )


async def setup(bot: commands.Bot):
    """Load ticket commands"""
    await bot.add_cog(TicketCommands(bot))
