"""
Groq AI client for cloud-based LLM inference
Fast, no rate limits, free tier available
"""
import aiohttp
import asyncio
from typing import Optional, List, Dict
import logging
import json

logger = logging.getLogger(__name__)


class GroqClient:
    """Client for interacting with Groq Cloud LLM API"""
    
    def __init__(self, api_key: str, model: str = "mixtral-8x7b-32768"):
        self.api_key = api_key
        self.model = model
        self.base_url = "https://api.groq.com/openai/v1"
        self.timeout = aiohttp.ClientTimeout(total=60)
    
    async def check_health(self) -> bool:
        """Check if Groq API is accessible"""
        try:
            async with aiohttp.ClientSession(timeout=self.timeout) as session:
                headers = {
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                }
                
                # Try a simple request to verify API key
                async with session.get(
                    f"{self.base_url}/models",
                    headers=headers
                ) as response:
                    return response.status == 200
        except Exception as e:
            logger.error(f"Groq health check failed: {e}")
            return False
    
    async def generate_response(self, prompt: str, system_prompt: Optional[str] = None,
                               temperature: float = 0.7, max_tokens: int = 500) -> Optional[str]:
        """Generate a response using Groq API"""
        try:
            messages = []
            
            if system_prompt:
                messages.append({
                    "role": "system",
                    "content": system_prompt
                })
            
            messages.append({
                "role": "user",
                "content": prompt
            })
            
            async with aiohttp.ClientSession(timeout=self.timeout) as session:
                headers = {
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                }
                
                payload = {
                    "model": self.model,
                    "messages": messages,
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                    "top_p": 1,
                    "stream": False
                }
                
                async with session.post(
                    f"{self.base_url}/chat/completions",
                    json=payload,
                    headers=headers
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                        return content.strip() if content else None
                    else:
                        error_text = await response.text()
                        logger.error(f"Groq API error {response.status}: {error_text}")
                        return None
        
        except asyncio.TimeoutError:
            logger.error("Groq request timed out")
            return None
        except Exception as e:
            logger.error(f"Error generating response: {e}")
            return None
    
    async def stream_response(self, prompt: str, system_prompt: Optional[str] = None,
                             temperature: float = 0.7, max_tokens: int = 500):
        """Stream response from Groq API (for real-time output)"""
        try:
            messages = []
            
            if system_prompt:
                messages.append({
                    "role": "system",
                    "content": system_prompt
                })
            
            messages.append({
                "role": "user",
                "content": prompt
            })
            
            async with aiohttp.ClientSession(timeout=self.timeout) as session:
                headers = {
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                }
                
                payload = {
                    "model": self.model,
                    "messages": messages,
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                    "stream": True
                }
                
                async with session.post(
                    f"{self.base_url}/chat/completions",
                    json=payload,
                    headers=headers
                ) as response:
                    if response.status == 200:
                        async for line in response.content:
                            if line:
                                try:
                                    line_str = line.decode('utf-8').strip()
                                    if line_str.startswith("data: "):
                                        data_str = line_str[6:]
                                        if data_str != "[DONE]":
                                            data = json.loads(data_str)
                                            delta = data.get("choices", [{}])[0].get("delta", {})
                                            if "content" in delta:
                                                yield delta["content"]
                                except:
                                    pass
                    else:
                        logger.error(f"Groq error: {response.status}")
        except Exception as e:
            logger.error(f"Error streaming response: {e}")
    
    def build_ticket_context_prompt(self, ticket_messages: List[Dict], 
                                   training_data: List[Dict] = None) -> str:
        """Build a prompt with ticket context and training data"""
        context = """You are a helpful support bot for a Discord community. 
You are professional, friendly, and helpful. 
Provide clear, concise answers to support questions.
If you don't know something, be honest about it.

"""
        
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
    
    async def get_available_models(self) -> List[str]:
        """Get list of available models from Groq"""
        try:
            async with aiohttp.ClientSession(timeout=self.timeout) as session:
                headers = {
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                }
                
                async with session.get(
                    f"{self.base_url}/models",
                    headers=headers
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        return [model["id"] for model in data.get("data", [])]
        except Exception as e:
            logger.error(f"Failed to get available models: {e}")
        
        return ["mixtral-8x7b-32768", "llama2-70b-4096"]
