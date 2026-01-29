const Groq = require('groq-sdk');

// Initialize Groq client with API key from environment
let groq = null;

if (process.env.GROQ_API_KEY) {
    groq = new Groq({
        apiKey: process.env.GROQ_API_KEY
    });
} else {
    console.warn('⚠️  GROQ_API_KEY not set - AI features will be disabled');
}

module.exports = {
    /**
     * Generate AI response using Groq API
     * @param {string} query - User's question
     * @param {string} context - Conversation history or additional context
     * @returns {Promise<string|null>} - AI response or null on error
     */
    generateResponse: async (query, context = "") => {
        if (!groq) {
            console.error('❌ Groq client not initialized - check GROQ_API_KEY');
            return null;
        }

        try {
            const systemPrompt = `You are Supreme AI, a helpful and professional Discord support assistant.

Your role:
- Answer user questions clearly and concisely
- Be friendly, professional, and empathetic
- If you don't know something, admit it and suggest waiting for human staff
- Keep responses under 500 characters when possible
- Use Discord-friendly formatting (bold with **, italic with *, code with \`)

Important:
- Never make up information
- Always prioritize user safety and privacy
- Be respectful and inclusive`;

            const userPrompt = context 
                ? `Recent conversation:\n${context}\n\nCurrent question: ${query}`
                : query;

            console.log(`🤖 Calling Groq API with model: llama3-8b-8192`);
            
            const chatCompletion = await groq.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: systemPrompt
                    },
                    {
                        role: "user",
                        content: userPrompt
                    }
                ],
                model: "llama3-8b-8192",
                temperature: 0.7,
                max_tokens: 500,
                top_p: 0.9,
                stream: false
            });

            const response = chatCompletion.choices[0]?.message?.content;
            
            if (!response) {
                console.error('❌ Empty response from Groq API');
                return null;
            }

            console.log(`✅ Generated response (${response.length} chars)`);
            return response.trim();

        } catch (error) {
            console.error('❌ Groq AI Error:', error.message);
            
            // Log specific error types
            if (error.status === 401) {
                console.error('❌ Invalid API key');
            } else if (error.status === 429) {
                console.error('❌ Rate limit exceeded');
            } else if (error.status === 500) {
                console.error('❌ Groq API server error');
            }
            
            return null;
        }
    },

    /**
     * Check if Groq API is accessible and healthy
     * @returns {Promise<boolean>} - True if API is healthy
     */
    checkHealth: async () => {
        if (!groq) {
            console.warn('⚠️  Groq client not initialized');
            return false;
        }

        try {
            // Try to list models as a health check
            const models = await groq.models.list();
            console.log(`✅ Groq API healthy, ${models.data?.length || 0} models available`);
            return true;
        } catch (error) {
            console.error('❌ Groq API health check failed:', error.message);
            return false;
        }
    },

    /**
     * Get available Groq models
     * @returns {Promise<Array>} - List of available models
     */
    getModels: async () => {
        if (!groq) {
            console.warn('⚠️  Groq client not initialized');
            return [];
        }
        
        try {
            const response = await groq.models.list();
            return response.data || [];
        } catch (error) {
            console.error('❌ Failed to fetch models:', error.message);
            return [];
        }
    },

    /**
     * Generate response with streaming (for future use)
     * @param {string} query - User's question
     * @param {string} context - Conversation context
     * @returns {Promise<AsyncIterable>} - Stream of response chunks
     */
    generateStreamingResponse: async (query, context = "") => {
        if (!groq) {
            console.error('❌ Groq client not initialized');
            return null;
        }
        
        try {
            const stream = await groq.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: "You are Supreme AI, a helpful Discord support assistant."
                    },
                    {
                        role: "user",
                        content: context ? `Context: ${context}\n\nQuestion: ${query}` : query
                    }
                ],
                model: "llama3-8b-8192",
                temperature: 0.7,
                max_tokens: 500,
                stream: true
            });

            return stream;
        } catch (error) {
            console.error('❌ Streaming error:', error);
            return null;
        }
    }
};
