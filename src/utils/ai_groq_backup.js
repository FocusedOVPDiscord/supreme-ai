// BACKUP OF ORIGINAL GROQ IMPLEMENTATION
// This file is kept for reference in case you want to switch back

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
                continue;
            }
        }

        console.error('❌ [AI] All Groq models failed or are decommissioned.');
        return null;
    },

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

    extractTrainingData: async (trainingMessage) => {
        if (!groq) return null;

        const systemPrompt = `You are a highly intelligent training data extractor for a Discord Support Bot. 
        Your goal is to understand the user's INTENT and convert it into a functional trigger (question) and response (answer).

        Rules:
        1. "question": Extract the core trigger or scenario. If the user says "When someone says X", the question is "X". If they describe a situation like "if they mention items", the question should be a common way users mention items (e.g., "i give").
        2. "answer": This MUST be the exact, professional message the bot will send. 
        3. AUTOMATICALLY map natural terms to these placeholders:
           - USER -> Mentions the ticket owner.
           - PARTNER -> Mentions the trade partner.
           - ITEMS -> The items being traded.
           - QUANTITY -> The quantity.
        4. BE SMART: If the user says "replace users and items", automatically use USER and ITEMS in the answer.
        5. DO NOT repeat the user's instructions in the answer. Only provide the final bot response.

        Example Input: "if i mention an item say Okay! and ask what the partner is giving"
        Example Output: {"question": "i give", "answer": "Okay! And what is your partner giving?"}

        Example Input: "When users ask about the trade setup, show: # Trade Setup (Final) USER is trading with PARTNER... replace users and items"
        Example Output: {"question": "trade setup", "answer": "# Trade Setup (Final)\\n\\nUSER is trading with PARTNER\\n\\nUSER gives:\\n- ITEMS xQUANTITY\\n\\nPARTNER gives:\\n- ITEMS xQUANTITY\\n\\nBoth of you, please type confirm if correct."}

        Return ONLY a valid JSON object.`;

        try {
            const chatCompletion = await groq.chat.completions.create({
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: trainingMessage }
                ],
                model: "llama-3.1-8b-instant",
                temperature: 0.1,
                response_format: { type: "json_object" }
            });

            const content = chatCompletion.choices[0]?.message?.content;
            return JSON.parse(content);
        } catch (error) {
            console.error('❌ [AI EXTRACTION ERROR]', error.message);
            return null;
        }
    },

    processTradeMessage: async (message, currentData = {}) => {
        if (!groq) return null;

        const systemPrompt = `You are the brain of a Discord Trade Support Bot. Your job is to analyze the user's message and update the trade data.
        
        Current Trade Data: ${JSON.stringify(currentData)}
        
        Fields to fill:
        - user_item: What the user is giving.
        - user_qty: Quantity the user is giving.
        - partner_item: What the partner is giving.
        - partner_qty: Quantity the partner is giving.
        - partner_id: The partner's mention or ID.
        
        Rules:
        1. Extract any new information from the user's message.
        2. If the user makes a typo (e.g., "drag" instead of "dragon"), correct it if obvious.
        3. Determine the NEXT question to ask to complete the trade setup.
        4. If ALL fields are filled, the next_step should be "summary".
        5. Return a JSON object with:
           - "updated_data": The full updated trade data object.
           - "bot_response": The natural response/question to the user.
           - "is_complete": Boolean, true if all data is collected.
        
        Example Response:
        {
            "updated_data": {"user_item": "Dragon", "user_qty": "3", "partner_item": "Gorgonzilla"},
            "bot_response": "Got it. What quantity of Gorgonzilla does your partner give?",
            "is_complete": false
        }`;

        try {
            const chatCompletion = await groq.chat.completions.create({
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: message }
                ],
                model: "llama-3.1-70b-versatile",
                temperature: 0.1,
                response_format: { type: "json_object" }
            });

            const content = chatCompletion.choices[0]?.message?.content;
            return JSON.parse(content);
        } catch (error) {
            console.error('❌ [AI TRADE PROCESS ERROR]', error.message);
            return null;
        }
    }
};
