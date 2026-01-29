"""
Simplified Slash Commands
"""
import discord
from discord import app_commands
import logging

logger = logging.getLogger(__name__)

def setup_commands(bot):
    """Register all commands to the bot's tree"""
    
    # 1. Train Group
    train = app_commands.Group(name="train", description="Training commands")
    
    @train.command(name="add", description="Add training data")
    async def add(interaction: discord.Interaction, question: str, answer: str, category: str = "general"):
        await interaction.response.defer()
        success = bot.db.add_training(query=question, response=answer, category=category)
        await interaction.followup.send("✅ Added" if success else "❌ Failed")

    @train.command(name="list", description="List training data")
    async def list_cmd(interaction: discord.Interaction):
        await interaction.response.defer()
        data = bot.db.get_all_training()
        await interaction.followup.send(f"📚 Found {len(data)} entries")

    @train.command(name="stats", description="Show statistics")
    async def stats(interaction: discord.Interaction):
        await interaction.response.defer()
        s = bot.db.get_stats()
        await interaction.followup.send(f"📊 {s['total_training_entries']} entries")

    # 2. Ticket Group
    ticket = app_commands.Group(name="ticket", description="Ticket commands")
    
    @ticket.command(name="info", description="Get ticket info")
    async def info(interaction: discord.Interaction, ticket_number: str):
        await interaction.response.defer()
        await interaction.followup.send(f"🎫 Info for {ticket_number}")

    @ticket.command(name="close", description="Close a ticket")
    async def close(interaction: discord.Interaction, ticket_number: str):
        await interaction.response.defer()
        await interaction.followup.send(f"✅ Closed {ticket_number}")

    # 3. Standalone
    @bot.tree.command(name="status", description="Check bot status")
    async def status(interaction: discord.Interaction):
        await interaction.response.send_message("✅ Online")

    # Add groups
    bot.tree.add_command(train)
    bot.tree.add_command(ticket)
    
    print(f"✓ Registered {len(bot.tree.get_commands())} top-level commands/groups")
