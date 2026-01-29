"""
Prefix-based commands (!) for Supreme AI Bot - Debug Version
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
        logger.info(f"Train command called with action: {action}, args: {args}")
        
        if not action:
            await ctx.send("❓ Usage: `!train add <q> | <a>`, `!train list`, or `!train stats`")
            return

        action = action.lower()
        if action == "add":
            if not args or "|" not in args:
                await ctx.send("❌ Usage: `!train add <question> | <answer>`")
                return
            
            try:
                question, answer = [x.strip() for x in args.split("|", 1)]
                success = bot.db.add_training(query=question, response=answer, category="general")
                if success:
                    await ctx.send(f"✅ **Training added!**\n**Q:** {question}\n**A:** {answer}")
                else:
                    await ctx.send("❌ Failed to add training. It might already exist.")
            except Exception as e:
                logger.error(f"Error in train add: {e}")
                await ctx.send(f"❌ Error: {str(e)}")

        elif action == "list":
            try:
                data = bot.db.get_all_training()
                if not data:
                    await ctx.send("📚 No training entries found.")
                    return
                
                msg = f"📚 **Found {len(data)} training entries:**\n"
                for i, item in enumerate(data[:5], 1):
                    msg += f"{i}. Q: {item['query'][:50]}... | A: {item['response'][:50]}...\n"
                
                if len(data) > 5:
                    msg += f"...and {len(data)-5} more."
                
                await ctx.send(msg)
            except Exception as e:
                logger.error(f"Error in train list: {e}")
                await ctx.send(f"❌ Error: {str(e)}")

        elif action == "stats":
            try:
                s = bot.db.get_stats()
                embed = discord.Embed(title="📊 Training Stats", color=discord.Color.blue())
                embed.add_field(name="Total Entries", value=str(s['total_training_entries']), inline=True)
                embed.add_field(name="Conversations", value=str(s['total_conversations']), inline=True)
                embed.add_field(name="Open Tickets", value=str(s['open_tickets']), inline=True)
                await ctx.send(embed=embed)
            except Exception as e:
                logger.error(f"Error in train stats: {e}")
                await ctx.send(f"❌ Error: {str(e)}")
        else:
            await ctx.send(f"❓ Unknown action: `{action}`. Use `add`, `list`, or `stats`.")

    @bot.command(name="status")
    async def status(ctx):
        """!status"""
        logger.info("Status command called")
        try:
            stats = bot.db.get_stats()
            embed = discord.Embed(title="🤖 Bot Status", color=discord.Color.green())
            embed.add_field(name="Prefix", value=f"`{bot.command_prefix}`", inline=True)
            embed.add_field(name="Groq AI", value="✓ Online" if bot.groq_ready else "✗ Offline", inline=True)
            embed.add_field(name="Guilds", value=str(len(bot.guilds)), inline=True)
            embed.add_field(name="Latency", value=f"{round(bot.latency * 1000)}ms", inline=True)
            await ctx.send(embed=embed)
        except Exception as e:
            logger.error(f"Error in status: {e}")
            await ctx.send(f"❌ Error: {str(e)}")

    @bot.command(name="help")
    async def help_command(ctx):
        """!help"""
        logger.info("Help command called")
        p = bot.command_prefix
        embed = discord.Embed(title="📖 Supreme AI Help", color=discord.Color.blue())
        embed.add_field(name="Admin Commands", value=(
            f"`{p}status` - Check bot status\n"
            f"`{p}train add <q> | <a>` - Add training data\n"
            f"`{p}train list` - List all training\n"
            f"`{p}train stats` - Show training stats"
        ), inline=False)
        embed.add_field(name="Ticket Commands", value=(
            f"`{p}ticket info <num>` - Get ticket info\n"
            f"`{p}ticket close <num>` - Close a ticket"
        ), inline=False)
        embed.set_footer(text="Make sure the bot has 'Message Content Intent' enabled in Discord Developer Portal!")
        await ctx.send(embed=embed)

    @bot.command(name="test")
    async def test(ctx):
        """!test"""
        await ctx.send("✅ Bot is receiving messages and responding!")

    print("✓ Prefix commands (!) registered with debug logging")
    logger.info("✓ Prefix commands (!) registered with debug logging")
