"""
Slash commands using app_commands directly
"""
import discord
from discord import app_commands
from discord.ext import commands
import logging

logger = logging.getLogger(__name__)


class TrainGroup(app_commands.Group):
    """Training commands group"""
    
    def __init__(self, bot):
        super().__init__(name="train", description="Training commands")
        self.bot = bot
    
    @app_commands.command(name="add", description="Add training data")
    @app_commands.describe(
        question="The question",
        answer="The answer",
        category="Category"
    )
    async def add_training(self, interaction: discord.Interaction, question: str, answer: str, category: str = "general"):
        await interaction.response.defer()
        success = self.bot.db.add_training(query=question, response=answer, category=category)
        if success:
            embed = discord.Embed(title="✓ Training Added", color=discord.Color.green())
            embed.add_field(name="Q", value=question[:100], inline=False)
            embed.add_field(name="A", value=answer[:100], inline=False)
            await interaction.followup.send(embed=embed)
        else:
            await interaction.followup.send("❌ Failed", ephemeral=True)
    
    @app_commands.command(name="list", description="List training data")
    async def list_training(self, interaction: discord.Interaction):
        await interaction.response.defer()
        data = self.bot.db.get_all_training()
        if not data:
            embed = discord.Embed(title="📚 No training data", color=discord.Color.blue())
            await interaction.followup.send(embed=embed)
            return
        embed = discord.Embed(title=f"📚 Training ({len(data)} entries)", color=discord.Color.blue())
        for idx, item in enumerate(data[:10], 1):
            embed.add_field(name=f"{idx}. {item['query'][:40]}", value=item['response'][:80], inline=False)
        await interaction.followup.send(embed=embed)
    
    @app_commands.command(name="stats", description="Show statistics")
    async def stats_training(self, interaction: discord.Interaction):
        await interaction.response.defer()
        stats = self.bot.db.get_stats()
        embed = discord.Embed(title="📊 Statistics", color=discord.Color.blue())
        embed.add_field(name="Training Entries", value=str(stats['total_training_entries']), inline=True)
        embed.add_field(name="Total Usage", value=str(stats['total_usage']), inline=True)
        embed.add_field(name="Conversations", value=str(stats['total_conversations']), inline=True)
        embed.add_field(name="Open Tickets", value=str(stats['open_tickets']), inline=True)
        embed.add_field(name="Groq Status", value="✓ Online" if self.bot.groq_ready else "✗ Offline", inline=True)
        await interaction.followup.send(embed=embed)
    
    @app_commands.command(name="delete", description="Delete training")
    @app_commands.describe(training_id="Training ID to delete")
    async def delete_training(self, interaction: discord.Interaction, training_id: int):
        await interaction.response.defer()
        success = self.bot.db.delete_training(training_id)
        if success:
            embed = discord.Embed(title="✓ Deleted", color=discord.Color.green())
            await interaction.followup.send(embed=embed)
        else:
            await interaction.followup.send(f"❌ Not found", ephemeral=True)


class TicketGroup(app_commands.Group):
    """Ticket commands group"""
    
    def __init__(self, bot):
        super().__init__(name="ticket", description="Ticket commands")
        self.bot = bot
    
    @app_commands.command(name="info", description="Get ticket info")
    @app_commands.describe(ticket_number="Ticket number (e.g., 0001)")
    async def ticket_info(self, interaction: discord.Interaction, ticket_number: str):
        await interaction.response.defer()
        ticket_id = f"ticket-{ticket_number.zfill(4)}"
        context = self.bot.db.get_ticket_context_info(ticket_id)
        if not context:
            await interaction.followup.send(f"❌ {ticket_id} not found", ephemeral=True)
            return
        embed = discord.Embed(title=f"🎫 {ticket_id}", color=discord.Color.blue())
        embed.add_field(name="Status", value=context.get('status', 'unknown'), inline=True)
        embed.add_field(name="Category", value=context.get('category', 'general'), inline=True)
        await interaction.followup.send(embed=embed)
    
    @app_commands.command(name="close", description="Close a ticket")
    @app_commands.describe(ticket_number="Ticket number to close")
    async def close_ticket(self, interaction: discord.Interaction, ticket_number: str):
        await interaction.response.defer()
        ticket_id = f"ticket-{ticket_number.zfill(4)}"
        success = self.bot.db.update_ticket_status(ticket_id, "closed")
        if success:
            embed = discord.Embed(title="✓ Closed", description=f"{ticket_id} closed", color=discord.Color.green())
            await interaction.followup.send(embed=embed)
        else:
            await interaction.followup.send(f"❌ Could not close", ephemeral=True)


def setup_commands(bot):
    """Setup all commands"""
    print("Setting up commands...")
    train_group = TrainGroup(bot)
    ticket_group = TicketGroup(bot)
    
    bot.tree.add_command(train_group)
    bot.tree.add_command(ticket_group)
    
    print("Commands setup complete")
    logger.info("✓ Commands setup complete")
