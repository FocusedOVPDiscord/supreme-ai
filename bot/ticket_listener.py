"""
Ticket listener - automatically responds to messages in ticket-XXXX channels
"""
import discord
from discord.ext import commands
import logging
import re
from typing import Optional

logger = logging.getLogger(__name__)

class TicketListener(commands.Cog):
    """Listens to ticket channels and responds with AI"""
    
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        # Matches 'ticket-0001' etc.
        self.ticket_pattern = re.compile(r'^ticket-(\d{4})$')
    
    def is_ticket_channel(self, channel):
        """Check if channel is a ticket channel (TextChannel or Thread)"""
        name = channel.name.lower()
        return self.ticket_pattern.match(name) is not None
    
    def get_ticket_id(self, channel_name: str) -> Optional[str]:
        """Extract ticket ID from channel name"""
        match = self.ticket_pattern.match(channel_name.lower())
        if match:
            return channel_name.lower()
        return None
    
    @commands.Cog.listener()
    async def on_message(self, message: discord.Message):
        """Listen for messages in ticket channels"""
        try:
            # Ignore bot messages
            if message.author.bot:
                return
            
            # Check if in ticket channel or thread
            ticket_id = self.get_ticket_id(message.channel.name)
            if not ticket_id:
                return
            
            # Ignore commands
            if message.content.startswith(self.bot.command_prefix):
                return
            
            logger.info(f"📨 Ticket Message in {ticket_id}: {message.author.name} - {message.content[:50]}")
            
            # Show typing indicator
            async with message.channel.typing():
                # Search for similar training data
                similar_responses = self.bot.db.search_similar(
                    message.content,
                    threshold=0.7,
                    limit=1
                )
                
                response_text = None
                
                if similar_responses:
                    # Use trained response
                    response_text = similar_responses[0]['response']
                    logger.info(f"✓ Using trained response for {ticket_id}")
                    self.bot.db.increment_usage(similar_responses[0]['id'])
                else:
                    # Generate response using Groq AI
                    if not self.bot.groq_ready:
                        logger.warning(f"⚠️ Groq not ready for {ticket_id}")
                        # Fallback if AI is offline
                        return
                    else:
                        try:
                            # Generate response
                            response_text = await self.bot.ai.generate_response(
                                query=message.content,
                                context="", # Simplified for now
                                ticket_id=ticket_id
                            )
                            logger.info(f"✓ AI generated response for {ticket_id}")
                        except Exception as e:
                            logger.error(f"✗ Error generating response: {e}")
                            response_text = "Sorry, I encountered an error processing your request."
                
                # Send response
                if response_text:
                    # Split long responses
                    if len(response_text) > 2000:
                        chunks = [response_text[i:i+2000] for i in range(0, len(response_text), 2000)]
                        for chunk in chunks:
                            await message.reply(chunk, mention_author=False)
                    else:
                        await message.reply(response_text, mention_author=False)
                    
                    # Store response in history
                    self.bot.db.add_conversation_message(
                        ticket_id=ticket_id,
                        user_id=str(self.bot.user.id),
                        message=response_text,
                        is_ai_generated=True
                    )
        
        except Exception as e:
            logger.error(f"✗ Error in TicketListener: {e}")

async def setup(bot: commands.Bot):
    """Load ticket listener"""
    await bot.add_cog(TicketListener(bot))
