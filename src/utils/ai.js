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

// List of supported models in order of preference
const MODELS = [
    "llama-3.3-70b-versatile", // Best and smartest
    "llama-3.1-70b-versatile", // Great fallback
    "llama-3.1-8b-instant",     // Fastest fallback
    "mixtral-8x7b-32768"       // Alternative fallback
];

module.exports = {
    /**
     * Generate AI response using Groq API with automatic model fallback
     * @param {string} query - User's question
     * @param {string} context - Conversation history or additional context
     * @returns {Promise<string|null>} - AI response or null on error
     */
    generateResponse: async (query, context = "") => {
        if (!groq) {
            console.error('❌ Groq client not initialized - check GROQ_API_KEY');
            return null;
        }

        const systemPrompt = `You are Supreme AI, a helpful and professional Discord support assistant.

Your role:
- Answer user questions clearly and concisely
- Be friendly, professional, and empathetic
- If you don't know something, admit it and suggest waiting for human staff
- Keep responses under 500 characters when possible
- Use Discord-friendly formatting (bold with **, italic with *, code with \`)

Context Awareness:
- If a trade is in progress, use the provided trade details (items, quantities, partner) to answer accurately.
- Recognize item names mentioned in the trade context (e.g., "Garbagzilla", "Dragon").

Important:
- Never make up information
- Always prioritize user safety and privacy
- Be respectful and inclusive`;

        const userPrompt = context 
            ? `Recent conversation:\n${context}\n\nCurrent question: ${query}`
            : query;

        // Try models one by one until one works
        for (const modelName of MODELS) {
            try {
                console.log(`🤖 [AI] Attempting response with model: ${modelName}`);
                
                const chatCompletion = await groq.chat.completions.create({
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: userPrompt }
                    ],
                    model: modelName,
                    temperature: 0.7,
                    max_tokens: 500,
                    top_p: 0.9,
                    stream: false
                });

                const response = chatCompletion.choices[0]?.message?.content;
                
                if (response) {
                    console.log(`✅ [AI] Generated response using ${modelName} (${response.length} chars)`);
                    return response.trim();
                }
            } catch (error) {
                console.error(`⚠️ [AI] Model ${modelName} failed:`, error.message);
                // Continue to next model in the list
                continue;
            }
        }

        console.error('❌ [AI] All Groq models failed or are decommissioned.');
        return null;
    },

    /**
     * Check if Groq API is accessible and healthy
     */
    checkHealth: async () => {
        if (!groq) return false;
        try {
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
     */
    getModels: async () => {
        if (!groq) return [];
        try {
            const response = await groq.models.list();
            return response.data || [];
        } catch (error) {
            console.error('❌ Failed to fetch models:', error.message);
            return [];
        }
    },

    /**
     * Extract Q&A pair from a single training message using AI
     */
    extractTrainingData: async (trainingMessage) => {
        if (!groq) return null;

        const systemPrompt = `You are a training data extractor for a Discord Bot. Your job is to convert a user's training instruction into a functional Q&A pair.
        
        Rules:
        1. "question": This is the trigger. If the user describes a scenario (e.g., "if item mentioned"), extract the core keywords that trigger this scenario.
        2. "answer": This is the bot's response. It MUST be the actual message the bot sends, NOT a description of the rule.
        3. Use natural language placeholders in the "answer":
           - USER: Mention the ticket owner.
           - PARTNER: Mention the trade partner.
           - ITEMS: The items being traded.
           - QUANTITY: The quantity of items.
           - SERVER: The server name.
        4. If the user provides a conditional (e.g., "if X then say Y"), the "question" should be the condition/trigger and "answer" should be Y.
        5. Return ONLY a valid JSON object.
        
        Example Input: "When users ask about pricing, explain that our basic plan is $9.99/month"
        Example Output: {"question": "pricing", "answer": "Our basic plan is $9.99/month."}
        
        Example Input: "if item mentioned make sure to say Okay! and whats your partner giving"
        Example Output: {"question": "i give", "answer": "Okay! And what is your partner giving?"}

        Example Input: "give the trade setup (Final) like # Trade Setup (Final) USER is trading with PARTNER... but replace users and items"
        Example Output: {"question": "trade setup", "answer": "# Trade Setup (Final)\\nUSER is trading with PARTNER\\nUSER gives: ITEMS xQUANTITY\\nPARTNER gives: ITEMS xQUANTITY"}`;

        try {
            const chatCompletion = await groq.chat.completions.create({
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: trainingMessage }
                ],
                model: "llama-3.1-8b-instant", // Use fast model for extraction
                temperature: 0.1,
                response_format: { type: "json_object" }
            });

            const content = chatCompletion.choices[0]?.message?.content;
            return JSON.parse(content);
        } catch (error) {
            console.error('❌ [AI EXTRACTION ERROR]', error.message);
            return null;
        }
    }
};
