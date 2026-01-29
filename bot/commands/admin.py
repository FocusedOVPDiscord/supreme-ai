"""
Admin and utility commands
"""
import discord
from discord.ext import commands
from discord import app_commands
import logging

from memory import TrainingDatabase
from ai import OllamaClient
from config import Config

logger = logging.getLogger(__name__)


class AdminCommands(commands.Cog):
    """Admin commands for bot management"""
    
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.db = TrainingDatabase(Config.DB_PATH)
        self.ai = OllamaClient(Config.OLLAMA_URL, Config.OLLAMA_MODEL)
    
    @app_commands.command(name="status", description="Check bot and Ollama status")
    async def status(self, interaction: discord.Interaction):
        """Check bot status"""
        
        try:
            # Check Ollama
            ollama_ok = await self.ai.check_health()
            
            # Get available models
            models = await self.ai.get_available_models() if ollama_ok else []
            
            # Get stats
            stats = self.db.get_stats()
            
            embed = discord.Embed(
                title="🤖 Bot Status",
                color=discord.Color.green() if ollama_ok else discord.Color.red()
            )
            
            # Ollama status
            ollama_status = "✓ Online" if ollama_ok else "✗ Offline"
            embed.add_field(
                name="Ollama Server",
                value=f"{ollama_status}\nURL: {Config.OLLAMA_URL}",
                inline=False
            )
            
            # Models
            if models:
                embed.add_field(
                    name="Available Models",
                    value="\n".join([f"• {m}" for m in models[:5]]),
                    inline=False
                )
            
            # Current model
            embed.add_field(
                name="Active Model",
                value=Config.OLLAMA_MODEL,
                inline=True
            )
            
            # Database stats
            embed.add_field(name="Training Entries", value=str(stats['total_training_entries']), inline=True)
            embed.add_field(name="Conversations", value=str(stats['total_conversations']), inline=True)
            embed.add_field(name="Open Tickets", value=str(stats['open_tickets']), inline=True)
            
            await interaction.response.send_message(embed=embed, ephemeral=True)
        
        except Exception as e:
            logger.error(f"Error in status command: {e}")
            await interaction.response.send_message(
                f"Error: {str(e)}",
                ephemeral=True
            )
    
    @app_commands.command(name="test_ai", description="Test the AI with a prompt")
    @app_commands.describe(
        prompt="The prompt to test"
    )
    async def test_ai(self, interaction: discord.Interaction, prompt: str):
        """Test AI response"""
        
        try:
            async with interaction.response.defer():
                response = await self.ai.generate_response(
                    prompt=prompt,
                    system_prompt="You are a helpful support assistant.",
                    max_tokens=300
                )
                
                if response:
                    embed = discord.Embed(
                        title="🧠 AI Test Response",
                        color=discord.Color.blue()
                    )
                    embed.add_field(name="Prompt", value=prompt, inline=False)
                    embed.add_field(name="Response", value=response, inline=False)
                    
                    await interaction.followup.send(embed=embed, ephemeral=True)
                else:
                    await interaction.followup.send(
                        "Failed to generate response. Check if Ollama is running.",
                        ephemeral=True
                    )
        
        except Exception as e:
            logger.error(f"Error in test_ai command: {e}")
            await interaction.response.send_message(
                f"Error: {str(e)}",
                ephemeral=True
            )
    
    @app_commands.command(name="export_training", description="Export training data")
    async def export_training(self, interaction: discord.Interaction):
        """Export training data as JSON"""
        
        try:
            training_data = self.db.get_all_training()
            
            if not training_data:
                await interaction.response.send_message(
                    "No training data to export.",
                    ephemeral=True
                )
                return
            
            # Create JSON export
            import json
            from io import BytesIO
            
            export_data = []
            for item in training_data:
                export_data.append({
                    "query": item['query'],
                    "response": item['response'],
                    "category": item['category'],
                    "usage_count": item['usage_count']
                })
            
            json_str = json.dumps(export_data, indent=2)
            file = discord.File(
                BytesIO(json_str.encode()),
                filename="training_export.json"
            )
            
            embed = discord.Embed(
                title="📥 Training Data Export",
                description=f"Exported {len(export_data)} entries",
                color=discord.Color.green()
            )
            
            await interaction.response.send_message(embed=embed, file=file, ephemeral=True)
        
        except Exception as e:
            logger.error(f"Error in export_training command: {e}")
            await interaction.response.send_message(
                f"Error: {str(e)}",
                ephemeral=True
            )
    
    @app_commands.command(name="import_training", description="Import training data from JSON")
    async def import_training(self, interaction: discord.Interaction, file: discord.Attachment):
        """Import training data from JSON file"""
        
        try:
            # Read file
            content = await file.read()
            import json
            data = json.loads(content.decode())
            
            if not isinstance(data, list):
                await interaction.response.send_message(
                    "Invalid format. Expected JSON array.",
                    ephemeral=True
                )
                return
            
            # Import entries
            imported = 0
            for item in data:
                if 'query' in item and 'response' in item:
                    self.db.add_training(
                        query=item['query'],
                        response=item['response'],
                        category=item.get('category', 'general')
                    )
                    imported += 1
            
            embed = discord.Embed(
                title="✓ Training Data Imported",
                description=f"Successfully imported {imported} entries",
                color=discord.Color.green()
            )
            
            await interaction.response.send_message(embed=embed, ephemeral=True)
            logger.info(f"Imported {imported} training entries")
        
        except Exception as e:
            logger.error(f"Error in import_training command: {e}")
            await interaction.response.send_message(
                f"Error: {str(e)}",
                ephemeral=True
            )


async def setup(bot: commands.Bot):
    """Load admin commands"""
    await bot.add_cog(AdminCommands(bot))
