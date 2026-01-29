"""
Standalone script to FORCE sync slash commands to Discord.
Run this once locally or on Koyeb to register commands.
"""
import discord
from discord import app_commands
import asyncio
import os
import sys
from pathlib import Path

# Add current directory to path
sys.path.insert(0, str(Path(__file__).parent))

from config import Config

async def force_sync():
    print("🚀 Starting FORCE SYNC process...")
    
    if not Config.DISCORD_TOKEN:
        print("❌ Error: DISCORD_TOKEN not found in environment.")
        return

    # Initialize client with minimal intents
    intents = discord.Intents.default()
    client = discord.Client(intents=intents)
    tree = app_commands.CommandTree(client)

    # Define the commands exactly as they should appear
    print("📝 Defining commands...")

    # 1. Train Group
    train_group = app_commands.Group(name="train", description="Training commands")
    
    @train_group.command(name="add", description="Add training data")
    async def add(interaction: discord.Interaction, question: str, answer: str, category: str = "general"):
        pass

    @train_group.command(name="list", description="List training data")
    async def list_cmd(interaction: discord.Interaction):
        pass

    @train_group.command(name="stats", description="Show training statistics")
    async def stats(interaction: discord.Interaction):
        pass

    # 2. Ticket Group
    ticket_group = app_commands.Group(name="ticket", description="Ticket commands")
    
    @ticket_group.command(name="info", description="Get ticket info")
    async def info(interaction: discord.Interaction, ticket_number: str):
        pass

    @ticket_group.command(name="close", description="Close a ticket")
    async def close(interaction: discord.Interaction, ticket_number: str):
        pass

    # 3. Standalone commands
    @tree.command(name="status", description="Check bot status")
    async def status(interaction: discord.Interaction):
        pass

    @tree.command(name="sync", description="Force sync commands")
    async def sync(interaction: discord.Interaction):
        pass

    # Add groups to tree
    tree.add_command(train_group)
    tree.add_command(ticket_group)

    @client.event
    async def on_ready():
        print(f"✅ Logged in as {client.user}")
        
        try:
            # Sync to specific guild if provided
            if Config.DISCORD_GUILD_ID and str(Config.DISCORD_GUILD_ID) != "0":
                guild_id = int(Config.DISCORD_GUILD_ID)
                guild = discord.Object(id=guild_id)
                print(f"🔄 Syncing to guild {guild_id}...")
                tree.copy_global_to(guild=guild)
                synced = await tree.sync(guild=guild)
                print(f"✅ Successfully synced {len(synced)} commands to guild!")
            
            # Always sync globally as well
            print("🔄 Syncing globally (this can take up to 1 hour to propagate)...")
            synced_global = await tree.sync()
            print(f"✅ Successfully synced {len(synced_global)} commands globally!")
            
        except Exception as e:
            print(f"❌ Sync failed: {e}")
        
        print("👋 Force sync complete. You can now stop this script.")
        await client.close()

    print("🔌 Connecting to Discord...")
    await client.start(Config.DISCORD_TOKEN)

if __name__ == "__main__":
    asyncio.run(force_sync())
