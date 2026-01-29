"""
Main ticket handling cog - processes messages and generates AI responses
"""
import discord
from discord.ext import commands
import logging
import asyncio

from config import Config
from memory import TrainingDatabase
from ai.groq_client import GroqClient

logger = logging.getLogger(__name__)


class TicketHandler(commands.Cog):
    """Handles ticket messages and AI responses"""
    
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.db = TrainingDatabase(Config.DB_PATH)
        self.ai = GroqClient(Config.GROQ_API_KEY, Config.GROQ_MODEL)
    
    @commands.Cog.listener()
    async def on_message(self, message: discord.Message):
        """Process messages in tickets"""
        
        # Ignore bot messages
        if message.author == self.bot.user or message.author.bot:
            return
        
        # Only process messages in forum threads
        if not isinstance(message.channel, discord.Thread):
            return
        
        # Check if thread is in a forum channel
        if not isinstance(message.channel.parent, discord.ForumChannel):
            return
        
        try:
            # Store conversation in database
            ticket_id = str(message.channel.id)
            self.db.add_conversation(
                ticket_id=ticket_id,
                user_id=str(message.author.id),
                message=message.content
            )
            
            # Generate AI response if enabled and not a command
            if Config.ENABLE_AUTO_RESPONSE and not message.content.startswith("/"):
                await self._generate_ticket_response(message, ticket_id)
        
        except Exception as e:
            logger.error(f"Error processing message: {e}")
    
    async def _generate_ticket_response(self, message: discord.Message, ticket_id: str):
        """Generate and send AI response for ticket message"""
        try:
            # Show typing indicator
            async with message.channel.typing():
                # Get conversation context (last 10 messages)
                context_messages = self.db.get_ticket_context(ticket_id, limit=10)
                
                # Search for similar training data
                similar_training = self.db.search_similar(
                    message.content,
                    threshold=Config.SIMILARITY_THRESHOLD,
                    limit=3
                )
                
                # Check if we have a high-confidence match
                if similar_training and similar_training[0]['similarity_score'] > 0.85:
                    # Use trained response directly
                    response = similar_training[0]['response']
                    logger.info(f"Using trained response for ticket {ticket_id}")
                    self.db.increment_usage(similar_training[0]['id'])
                else:
                    # Generate response using AI
                    if not self.bot.groq_ready:
                        logger.warning("Groq AI not available, skipping AI response")
                        return
                    
                    # Build context prompt
                    system_prompt = self.ai.build_ticket_context_prompt(
                        context_messages,
                        similar_training
                    )
                    
                    # Generate response
                    response = await asyncio.wait_for(
                        self.ai.generate_response(
                            prompt=message.content,
                            system_prompt=system_prompt,
                            temperature=0.7,
                            max_tokens=500
                        ),
                        timeout=Config.RESPONSE_TIMEOUT
                    )
                
                if response:
                    # Store AI response in database
                    self.db.add_conversation(
                        ticket_id=ticket_id,
                        user_id=str(self.bot.user.id),
                        message=response,
                        is_ai_generated=True
                    )
                    
                    # Send response (split if too long for Discord's 2000 char limit)
                    if len(response) > 2000:
                        chunks = [response[i:i+1900] for i in range(0, len(response), 1900)]
                        for i, chunk in enumerate(chunks):
                            if i == 0:
                                await message.reply(chunk, mention_author=False)
                            else:
                                await message.channel.send(chunk)
                    else:
                        await message.reply(response, mention_author=False)
                    
                    logger.info(f"Generated response for ticket {ticket_id}")
                else:
                    logger.warning(f"Failed to generate response for ticket {ticket_id}")
        
        except asyncio.TimeoutError:
            logger.error(f"Response generation timed out for ticket {ticket_id}")
            try:
                await message.reply(
                    "Sorry, the AI took too long to respond. Please try again.",
                    mention_author=False
                )
            except:
                pass
        
        except Exception as e:
            logger.error(f"Error generating response: {e}")
            try:
                await message.reply(
                    "Sorry, I encountered an error processing your message.",
                    mention_author=False
                )
            except:
                pass


async def setup(bot: commands.Bot):
    """Load ticket handler cog"""
    await bot.add_cog(TicketHandler(bot))
