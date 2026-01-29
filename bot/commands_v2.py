"""
Prefix-based commands (!) for Supreme AI Bot
"""
import discord
from discord.ext import commands
import logging

logger = logging.getLogger(__name__)

def setup_commands(bot: commands.Bot):
    """Register all prefix commands to the bot"""

    @bot.command(name="train")
    async def train(ctx, action: str = None, *, args: str = None):
        """
        !train add <question> | <answer>
        !train list
        !train stats
        """
        if not action:
            await ctx.send("❓ Usage: `!train add <q> | <a>`, `!train list`, or `!train stats`")
            return

        if action.lower() == "add":
            if not args or "|" not in args:
                await ctx.send("❌ Usage: `!train add <question> | <answer>`")
                return
            
            question, answer = [x.strip() for x in args.split("|", 1)]
            success = bot.db.add_training(query=question, response=answer, category="general")
            await ctx.send("✅ Training added!" if success else "❌ Failed to add training.")

        elif action.lower() == "list":
            data = bot.db.get_all_training()
            await ctx.send(f"📚 Found {len(data)} training entries.")

        elif action.lower() == "stats":
            s = bot.db.get_stats()
            embed = discord.Embed(title="📊 Training Stats", color=discord.Color.blue())
            embed.add_field(name="Total Entries", value=str(s['total_training_entries']))
            embed.add_field(name="Conversations", value=str(s['total_conversations']))
            await ctx.send(embed=embed)

    @bot.command(name="ticket")
    async def ticket(ctx, action: str = None, ticket_number: str = None):
        """
        !ticket info <number>
        !ticket close <number>
        """
        if not action or not ticket_number:
            await ctx.send("❓ Usage: `!ticket info <number>` or `!ticket close <number>`")
            return

        if action.lower() == "info":
            await ctx.send(f"🎫 Info for ticket {ticket_number} requested.")
        
        elif action.lower() == "close":
            await ctx.send(f"✅ Ticket {ticket_number} closed.")

    @bot.command(name="status")
    async def status(ctx):
        """!status"""
        stats = bot.db.get_stats()
        embed = discord.Embed(title="🤖 Bot Status", color=discord.Color.green())
        embed.add_field(name="Prefix", value="`!`", inline=True)
        embed.add_field(name="Groq AI", value="✓ Online" if bot.groq_ready else "✗ Offline", inline=True)
        embed.add_field(name="Guilds", value=str(len(bot.guilds)), inline=True)
        await ctx.send(embed=embed)

    @bot.command(name="help")
    async def help_command(ctx):
        """!help"""
        embed = discord.Embed(title="📖 Supreme AI Help", color=discord.Color.blue())
        embed.add_field(name="Admin Commands", value=(
            "`!status` - Check bot status\n"
            "`!train add <q> | <a>` - Add training data\n"
            "`!train list` - List all training\n"
            "`!train stats` - Show training stats"
        ), inline=False)
        embed.add_field(name="Ticket Commands", value=(
            "`!ticket info <num>` - Get ticket info\n"
            "`!ticket close <num>` - Close a ticket"
        ), inline=False)
        await ctx.send(embed=embed)

    print("✓ Prefix commands (!) registered")
    logger.info("✓ Prefix commands (!) registered")
