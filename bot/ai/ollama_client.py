"""
Ollama LLM integration for AI responses
"""
import aiohttp
import asyncio
from typing import Optional, List, Dict
import logging

logger = logging.getLogger(__name__)


class OllamaClient:
    """Client for interacting with local Ollama LLM"""
    
    def __init__(self, base_url: str = "http://localhost:11434", model: str = "llama3"):
        self.base_url = base_url
        self.model = model
        self.timeout = aiohttp.ClientTimeout(total=60)
    
    async def check_health(self) -> bool:
        """Check if Ollama server is running"""
        try:
            async with aiohttp.ClientSession(timeout=self.timeout) as session:
                async with session.get(f"{self.base_url}/api/tags") as response:
                    return response.status == 200
        except Exception as e:
            logger.error(f"Ollama health check failed: {e}")
            return False
    
    async def get_available_models(self) -> List[str]:
        """Get list of available models on Ollama"""
        try:
            async with aiohttp.ClientSession(timeout=self.timeout) as session:
                async with session.get(f"{self.base_url}/api/tags") as response:
                    if response.status == 200:
                        data = await response.json()
                        return [model["name"] for model in data.get("models", [])]
        except Exception as e:
            logger.error(f"Failed to get available models: {e}")
        return []
    
    async def generate_response(self, prompt: str, system_prompt: Optional[str] = None,
                               temperature: float = 0.7, max_tokens: int = 500) -> Optional[str]:
        """Generate a response using Ollama"""
        try:
            # Build full prompt with system context
            if system_prompt:
                full_prompt = f"{system_prompt}\n\nUser: {prompt}\n\nAssistant:"
            else:
                full_prompt = prompt
            
            async with aiohttp.ClientSession(timeout=self.timeout) as session:
                payload = {
                    "model": self.model,
                    "prompt": full_prompt,
                    "stream": False,
                    "temperature": temperature,
                    "num_predict": max_tokens
                }
                
                async with session.post(
                    f"{self.base_url}/api/generate",
                    json=payload
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        return data.get("response", "").strip()
                    else:
                        logger.error(f"Ollama error: {response.status}")
                        return None
        except asyncio.TimeoutError:
            logger.error("Ollama request timed out")
            return None
        except Exception as e:
            logger.error(f"Error generating response: {e}")
            return None
    
    async def stream_response(self, prompt: str, system_prompt: Optional[str] = None,
                             temperature: float = 0.7, max_tokens: int = 500):
        """Stream response from Ollama (for real-time output)"""
        try:
            if system_prompt:
                full_prompt = f"{system_prompt}\n\nUser: {prompt}\n\nAssistant:"
            else:
                full_prompt = prompt
            
            async with aiohttp.ClientSession(timeout=self.timeout) as session:
                payload = {
                    "model": self.model,
                    "prompt": full_prompt,
                    "stream": True,
                    "temperature": temperature,
                    "num_predict": max_tokens
                }
                
                async with session.post(
                    f"{self.base_url}/api/generate",
                    json=payload
                ) as response:
                    if response.status == 200:
                        async for line in response.content:
                            if line:
                                try:
                                    import json
                                    data = json.loads(line)
                                    if "response" in data:
                                        yield data["response"]
                                except:
                                    pass
                    else:
                        logger.error(f"Ollama error: {response.status}")
        except Exception as e:
            logger.error(f"Error streaming response: {e}")
    
    def build_ticket_context_prompt(self, ticket_messages: List[Dict], 
                                   training_data: List[Dict] = None) -> str:
        """Build a prompt with ticket context and training data"""
        context = "You are a helpful support bot. Use the following context to answer questions.\n\n"
        
        # Add training data
        if training_data:
            context += "Known Solutions:\n"
            for item in training_data:
                context += f"- Q: {item['query']}\n  A: {item['response']}\n"
            context += "\n"
        
        # Add conversation history
        if ticket_messages:
            context += "Conversation History:\n"
            for msg in ticket_messages:
                role = "User" if not msg.get('is_ai_generated') else "Assistant"
                context += f"{role}: {msg['message']}\n"
            context += "\n"
        
        context += "Please provide a helpful response to the user's latest message."
        return context
    
    async def classify_query(self, query: str, categories: List[str] = None) -> Optional[str]:
        """Classify query into a category"""
        if not categories:
            categories = ["billing", "technical", "general", "account", "other"]
        
        prompt = f"""Classify the following support query into one of these categories: {', '.join(categories)}

Query: {query}

Respond with ONLY the category name, nothing else."""
        
        response = await self.generate_response(prompt, temperature=0.1, max_tokens=20)
        if response:
            response = response.strip().lower()
            for cat in categories:
                if cat.lower() in response:
                    return cat
        return "general"
