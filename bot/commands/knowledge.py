"""
Knowledge base management commands
"""
import discord
from discord.ext import commands
from discord import app_commands
import logging
from io import BytesIO
import json

from memory import TrainingDatabase
from utils import KnowledgeManager
from config import Config

logger = logging.getLogger(__name__)


class KnowledgeCommands(commands.Cog):
    """Commands for managing knowledge bases"""
    
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.db = TrainingDatabase(Config.DB_PATH)
        self.kb_manager = KnowledgeManager(self.db)
    
    @app_commands.command(name="kb_create", description="Create a new knowledge base")
    @app_commands.describe(
        name="Name of the knowledge base",
        description="Description (optional)"
    )
    @app_commands.checks.has_permissions(administrator=True)
    async def kb_create(self, interaction: discord.Interaction, name: str, description: str = ""):
        """Create a new knowledge base"""
        
        try:
            success = self.kb_manager.create_knowledge_base(name, description)
            
            if success:
                embed = discord.Embed(
                    title="✓ Knowledge Base Created",
                    description=f"Created knowledge base: **{name}**",
                    color=discord.Color.green()
                )
                if description:
                    embed.add_field(name="Description", value=description, inline=False)
                
                await interaction.response.send_message(embed=embed, ephemeral=True)
                logger.info(f"Knowledge base created: {name}")
            else:
                await interaction.response.send_message(
                    f"Failed to create knowledge base. It may already exist.",
                    ephemeral=True
                )
        
        except Exception as e:
            logger.error(f"Error in kb_create: {e}")
            await interaction.response.send_message(f"Error: {str(e)}", ephemeral=True)
    
    @app_commands.command(name="kb_add", description="Add entry to knowledge base")
    @app_commands.describe(
        kb_name="Knowledge base name",
        query="Question or topic",
        response="Answer or solution",
        category="Category (optional)"
    )
    async def kb_add(self, interaction: discord.Interaction, kb_name: str, query: str,
                    response: str, category: str = "general"):
        """Add entry to knowledge base"""
        
        try:
            success = self.kb_manager.add_to_knowledge_base(kb_name, query, response, category)
            
            if success:
                embed = discord.Embed(
                    title="✓ Entry Added",
                    description=f"Added to **{kb_name}**",
                    color=discord.Color.green()
                )
                embed.add_field(name="Q", value=query, inline=False)
                embed.add_field(name="A", value=response[:200] + "..." if len(response) > 200 else response, inline=False)
                embed.add_field(name="Category", value=category, inline=True)
                
                await interaction.response.send_message(embed=embed, ephemeral=True)
            else:
                await interaction.response.send_message(
                    f"Failed to add entry. KB may not exist or entry is duplicate.",
                    ephemeral=True
                )
        
        except Exception as e:
            logger.error(f"Error in kb_add: {e}")
            await interaction.response.send_message(f"Error: {str(e)}", ephemeral=True)
    
    @app_commands.command(name="kb_list", description="List all knowledge bases")
    async def kb_list(self, interaction: discord.Interaction):
        """List all knowledge bases"""
        
        try:
            kbs = self.kb_manager.list_knowledge_bases()
            
            if not kbs:
                await interaction.response.send_message(
                    "No knowledge bases found.",
                    ephemeral=True
                )
                return
            
            embed = discord.Embed(
                title="📚 Knowledge Bases",
                description=f"Total: {len(kbs)}",
                color=discord.Color.blue()
            )
            
            for kb_name in kbs:
                stats = self.kb_manager.get_kb_stats(kb_name)
                if stats:
                    embed.add_field(
                        name=kb_name,
                        value=f"Entries: {stats['total_entries']} | Used: {stats['total_usage']}x",
                        inline=False
                    )
            
            await interaction.response.send_message(embed=embed, ephemeral=True)
        
        except Exception as e:
            logger.error(f"Error in kb_list: {e}")
            await interaction.response.send_message(f"Error: {str(e)}", ephemeral=True)
    
    @app_commands.command(name="kb_view", description="View knowledge base contents")
    @app_commands.describe(
        kb_name="Knowledge base name"
    )
    async def kb_view(self, interaction: discord.Interaction, kb_name: str):
        """View knowledge base contents"""
        
        try:
            kb_data = self.kb_manager.get_knowledge_base(kb_name)
            
            if not kb_data:
                await interaction.response.send_message(
                    f"Knowledge base '{kb_name}' not found.",
                    ephemeral=True
                )
                return
            
            entries = kb_data.get("entries", [])
            
            embed = discord.Embed(
                title=f"📖 {kb_name}",
                description=kb_data.get("description", ""),
                color=discord.Color.blue()
            )
            embed.add_field(name="Total Entries", value=str(len(entries)), inline=True)
            
            # Show first 10 entries
            for entry in entries[:10]:
                embed.add_field(
                    name=f"Q: {entry['query'][:40]}...",
                    value=f"A: {entry['response'][:80]}...",
                    inline=False
                )
            
            if len(entries) > 10:
                embed.set_footer(text=f"Showing 10 of {len(entries)} entries")
            
            await interaction.response.send_message(embed=embed, ephemeral=True)
        
        except Exception as e:
            logger.error(f"Error in kb_view: {e}")
            await interaction.response.send_message(f"Error: {str(e)}", ephemeral=True)
    
    @app_commands.command(name="kb_export", description="Export knowledge base")
    @app_commands.describe(
        kb_name="Knowledge base name"
    )
    async def kb_export(self, interaction: discord.Interaction, kb_name: str):
        """Export knowledge base as JSON"""
        
        try:
            kb_data = self.kb_manager.get_knowledge_base(kb_name)
            
            if not kb_data:
                await interaction.response.send_message(
                    f"Knowledge base '{kb_name}' not found.",
                    ephemeral=True
                )
                return
            
            # Create JSON file
            json_str = json.dumps(kb_data, indent=2)
            file = discord.File(
                BytesIO(json_str.encode()),
                filename=f"{kb_name}_export.json"
            )
            
            embed = discord.Embed(
                title="📥 Knowledge Base Export",
                description=f"Exported **{kb_name}**",
                color=discord.Color.green()
            )
            embed.add_field(
                name="Entries",
                value=str(len(kb_data.get("entries", []))),
                inline=True
            )
            
            await interaction.response.send_message(embed=embed, file=file, ephemeral=True)
        
        except Exception as e:
            logger.error(f"Error in kb_export: {e}")
            await interaction.response.send_message(f"Error: {str(e)}", ephemeral=True)
    
    @app_commands.command(name="kb_import", description="Import knowledge base from file")
    @app_commands.describe(
        kb_name="Name for imported KB",
        file="JSON file to import"
    )
    @app_commands.checks.has_permissions(administrator=True)
    async def kb_import(self, interaction: discord.Interaction, kb_name: str, file: discord.Attachment):
        """Import knowledge base from JSON file"""
        
        try:
            # Read file
            content = await file.read()
            
            # Save temporarily
            import tempfile
            with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as tmp:
                tmp.write(content.decode())
                tmp_path = tmp.name
            
            # Import
            success = self.kb_manager.import_knowledge_base(kb_name, tmp_path)
            
            # Clean up
            import os
            os.unlink(tmp_path)
            
            if success:
                embed = discord.Embed(
                    title="✓ Knowledge Base Imported",
                    description=f"Imported as **{kb_name}**",
                    color=discord.Color.green()
                )
                await interaction.response.send_message(embed=embed, ephemeral=True)
            else:
                await interaction.response.send_message(
                    "Failed to import knowledge base.",
                    ephemeral=True
                )
        
        except Exception as e:
            logger.error(f"Error in kb_import: {e}")
            await interaction.response.send_message(f"Error: {str(e)}", ephemeral=True)
    
    @app_commands.command(name="kb_search", description="Search within knowledge base")
    @app_commands.describe(
        kb_name="Knowledge base name",
        query="Search query"
    )
    async def kb_search(self, interaction: discord.Interaction, kb_name: str, query: str):
        """Search within knowledge base"""
        
        try:
            results = self.kb_manager.search_knowledge_base(kb_name, query, limit=5)
            
            if not results:
                await interaction.response.send_message(
                    f"No results found in **{kb_name}**",
                    ephemeral=True
                )
                return
            
            embed = discord.Embed(
                title=f"🔍 Search Results in {kb_name}",
                description=f"Query: {query}",
                color=discord.Color.blue()
            )
            
            for result in results:
                embed.add_field(
                    name=f"Q: {result['query'][:40]}...",
                    value=f"A: {result['response'][:100]}...\nMatch: {int(result['similarity']*100)}%",
                    inline=False
                )
            
            await interaction.response.send_message(embed=embed, ephemeral=True)
        
        except Exception as e:
            logger.error(f"Error in kb_search: {e}")
            await interaction.response.send_message(f"Error: {str(e)}", ephemeral=True)
    
    @app_commands.command(name="kb_delete", description="Delete knowledge base")
    @app_commands.describe(
        kb_name="Knowledge base name"
    )
    @app_commands.checks.has_permissions(administrator=True)
    async def kb_delete(self, interaction: discord.Interaction, kb_name: str):
        """Delete a knowledge base"""
        
        try:
            success = self.kb_manager.delete_knowledge_base(kb_name)
            
            if success:
                embed = discord.Embed(
                    title="✓ Knowledge Base Deleted",
                    description=f"Deleted **{kb_name}**",
                    color=discord.Color.green()
                )
                await interaction.response.send_message(embed=embed, ephemeral=True)
            else:
                await interaction.response.send_message(
                    f"Knowledge base '{kb_name}' not found.",
                    ephemeral=True
                )
        
        except Exception as e:
            logger.error(f"Error in kb_delete: {e}")
            await interaction.response.send_message(f"Error: {str(e)}", ephemeral=True)


async def setup(bot: commands.Bot):
    """Load knowledge base commands"""
    await bot.add_cog(KnowledgeCommands(bot))
