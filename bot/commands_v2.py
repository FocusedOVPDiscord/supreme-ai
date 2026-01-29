"""
Full Feature Prefix Commands (!) for Supreme AI Bot
"""
import discord
from discord.ext import commands
import logging
import json
from io import BytesIO

logger = logging.getLogger(__name__)

def setup_commands(bot: commands.Bot):
    """Register all prefix commands to the bot"""

    # --- TRAINING SYSTEM ---
    @bot.group(name="train", invoke_without_command=True)
    async def train(ctx):
        """!train - Base command for training"""
        p = bot.command_prefix
        embed = discord.Embed(title="🧠 Training System", color=discord.Color.blue())
        embed.add_field(name="Commands", value=(
            f"`{p}train add <q> | <a>` - Add training data\n"
            f"`{p}train list` - List all training\n"
            f"`{p}train stats` - Show training stats\n"
            f"`{p}train delete <id>` - Delete an entry"
        ), inline=False)
        await ctx.send(embed=embed)

    @train.command(name="add")
    async def train_add(ctx, *, args: str = None):
        if not args or "|" not in args:
            await ctx.send(f"❌ Usage: `{bot.command_prefix}train add <question> | <answer>`")
            return
        
        question, answer = [x.strip() for x in args.split("|", 1)]
        success = bot.db.add_training(query=question, response=answer, category="general")
        if success:
            await ctx.send(f"✅ **Training added!**\n**Q:** {question}\n**A:** {answer}")
        else:
            await ctx.send("❌ Failed to add training. It might already exist.")

    @train.command(name="list")
    async def train_list(ctx):
        data = bot.db.get_all_training()
        if not data:
            await ctx.send("📚 No training entries found.")
            return
        
        msg = f"📚 **Found {len(data)} training entries:**\n"
        for i, item in enumerate(data[:10], 1):
            msg += f"{i}. Q: {item['query'][:40]}... | A: {item['response'][:40]}...\n"
        
        if len(data) > 10:
            msg += f"...and {len(data)-10} more."
        await ctx.send(msg)

    @train.command(name="stats")
    async def train_stats(ctx):
        s = bot.db.get_stats()
        embed = discord.Embed(title="📊 Training Statistics", color=discord.Color.blue())
        embed.add_field(name="Total Entries", value=str(s['total_training_entries']), inline=True)
        embed.add_field(name="Total Usage", value=str(s['total_usage']), inline=True)
        await ctx.send(embed=embed)

    @train.command(name="delete")
    async def train_delete(ctx, entry_id: int):
        success = bot.db.delete_training(entry_id)
        await ctx.send(f"✅ Deleted entry {entry_id}" if success else f"❌ Entry {entry_id} not found.")

    # --- TICKET MANAGEMENT ---
    @bot.group(name="ticket", invoke_without_command=True)
    async def ticket(ctx):
        """!ticket - Base command for tickets"""
        p = bot.command_prefix
        embed = discord.Embed(title="🎫 Ticket Management", color=discord.Color.green())
        embed.add_field(name="Commands", value=(
            f"`{p}ticket info <num>` - Get ticket info\n"
            f"`{p}ticket close <num>` - Close a ticket\n"
            f"`{p}ticket panel` - Create a ticket panel"
        ), inline=False)
        await ctx.send(embed=embed)

    @ticket.command(name="info")
    async def ticket_info(ctx, ticket_number: str):
        ticket_id = f"ticket-{ticket_number.zfill(4)}"
        info = bot.db.get_ticket_context_info(ticket_id)
        if not info:
            await ctx.send(f"❌ Ticket {ticket_id} not found.")
            return
        
        embed = discord.Embed(title=f"🎫 {ticket_id}", color=discord.Color.blue())
        embed.add_field(name="Status", value=info.get('status', 'Open'), inline=True)
        embed.add_field(name="Category", value=info.get('category', 'General'), inline=True)
        await ctx.send(embed=embed)

    @ticket.command(name="close")
    async def ticket_close(ctx, ticket_number: str):
        ticket_id = f"ticket-{ticket_number.zfill(4)}"
        success = bot.db.update_ticket_status(ticket_id, "closed")
        await ctx.send(f"✅ Ticket {ticket_id} closed." if success else f"❌ Could not close {ticket_id}.")

    @bot.command(name="setup")
    async def setup(ctx):
        """!setup - Configure the bot"""
        embed = discord.Embed(title="⚙️ Bot Setup", description="Bot is ready for use!", color=discord.Color.orange())
        embed.add_field(name="Prefix", value=f"`{bot.command_prefix}`", inline=True)
        embed.add_field(name="Status", value="Online", inline=True)
        await ctx.send(embed=embed)

    # --- ADMIN & UTILITY ---
    @bot.command(name="status")
    async def status(ctx):
        stats = bot.db.get_stats()
        embed = discord.Embed(title="🤖 Bot Status", color=discord.Color.green())
        embed.add_field(name="Groq AI", value="✓ Online" if bot.groq_ready else "✗ Offline", inline=True)
        embed.add_field(name="Guilds", value=str(len(bot.guilds)), inline=True)
        embed.add_field(name="Training Entries", value=str(stats['total_training_entries']), inline=True)
        embed.add_field(name="Conversations", value=str(stats['total_conversations']), inline=True)
        await ctx.send(embed=embed)

    @bot.command(name="help")
    async def help_command(ctx):
        p = bot.command_prefix
        embed = discord.Embed(title="📖 Supreme AI Help", color=discord.Color.blue())
        embed.add_field(name="Training", value=f"`{p}train add`, `{p}train list`, `{p}train stats`", inline=False)
        embed.add_field(name="Tickets", value=f"`{p}ticket info`, `{p}ticket close`, `{p}ticket panel`", inline=False)
        embed.add_field(name="Admin", value=f"`{p}status`, `{p}setup`, `{p}export`", inline=False)
        await ctx.send(embed=embed)

    @bot.command(name="export")
    async def export(ctx):
        """Export training data as JSON"""
        data = bot.db.get_all_training()
        if not data:
            await ctx.send("❌ No data to export.")
            return
        
        json_data = json.dumps(data, indent=4)
        file = discord.File(BytesIO(json_data.encode()), filename="training_export.json")
        await ctx.send("📥 Here is your training data export:", file=file)

    print("✓ All features implemented with prefix commands")
    logger.info("✓ All features implemented with prefix commands")
