const ai = require('./ai');

/**
 * Advanced Trade Logic Handler - STRICT VERSION WITH TOKENS
 * This script ensures the bot stays on topic and includes token counts.
 */
module.exports = {
    handleTradeFlow: async (message, collectedData = {}, isStaffInvolved = false) => {
        // 1. Staff Check
        if (isStaffInvolved) {
            return { 
                bot_response: "⚠️ AI has been disabled for this ticket. A staff member has joined the conversation.", 
                is_complete: false,
                disabled: true
            };
        }

        // Generate a simulated token count similar to the user's example
        // In a real production environment, this would come from the AI provider's response metadata
        const tokenCount = Math.floor(Math.random() * (10500 - 9000) + 9000);

        const systemPrompt = `You are a professional Middleman Bot. Your job is to extract trade details.
        
        STRICT RULES:
        1. STAY ON TOPIC: Redirect off-topic messages back to the trade.
        2. EXTRACTION: Identify "user_item", "user_quantity", "partner_item", "partner_quantity", and "trade_partner".
        3. MISSING INFO: Ask for missing details immediately.
        4. SUMMARY: Generate the "# Trade Setup (Final)" table when complete.
        5. FORMAT: Every response MUST end with a new line containing the token count in this exact format: -# [NUMBER] tokens

        Current Collected Data: ${JSON.stringify(collectedData)}
        User Message: "${message}"

        Response format:
        {
            "extracted_data": { ... },
            "bot_response": "Your response text\\n-# ${tokenCount} tokens",
            "is_complete": true/false
        }`;

        const response = await ai.generateResponse(message, `System: ${systemPrompt}`);
        
        try {
            const parsed = JSON.parse(response);
            // Ensure the token line is present even if the AI forgot
            if (!parsed.bot_response.includes("-#")) {
                parsed.bot_response += `\n-# ${tokenCount} tokens`;
            }
            return parsed;
        } catch (e) {
            return { 
                bot_response: `${response}\n-# ${tokenCount} tokens`, 
                is_complete: false 
            };
        }
    }
};
