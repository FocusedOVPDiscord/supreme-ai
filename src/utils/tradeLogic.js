const ai = require('./ai');

/**
 * Advanced Trade Logic Handler - STRICT VERSION
 * This script ensures the bot stays on topic and follows the trade flow.
 */
module.exports = {
    handleTradeFlow: async (message, collectedData = {}, isStaffInvolved = false) => {
        // 1. Staff Check: If staff is involved, the AI must not respond.
        if (isStaffInvolved) {
            return { 
                bot_response: "⚠️ AI has been disabled for this ticket. A staff member has joined the conversation.", 
                is_complete: false,
                disabled: true
            };
        }

        const systemPrompt = `You are a professional Middleman Bot. Your job is to extract trade details.
        
        STRICT RULES:
        1. STAY ON TOPIC: If the user tries to talk about anything other than the trade, politely redirect them back to the trade flow. Do NOT answer off-topic questions.
        2. EXTRACTION: Identify "user_item", "user_quantity", "partner_item", "partner_quantity", and "trade_partner".
        3. MISSING INFO: If data is missing (e.g., they mentioned an item but no quantity), ask for it immediately.
        4. SUMMARY: Only when ALL data is collected, generate the "# Trade Setup (Final)" table.
        5. FORMAT: Use the exact format from the transcript.

        Current Collected Data: ${JSON.stringify(collectedData)}
        User Message: "${message}"

        Response format:
        {
            "extracted_data": { ... },
            "bot_response": "Your response to the user",
            "is_complete": true/false
        }`;

        const response = await ai.generateResponse(message, `System: ${systemPrompt}`);
        
        try {
            return JSON.parse(response);
        } catch (e) {
            return { bot_response: response, is_complete: false };
        }
    }
};
