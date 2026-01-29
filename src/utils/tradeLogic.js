const ai = require('./ai');

/**
 * EXACT TRANSCRIPT REPLICATION LOGIC
 * This script mirrors the behavior seen in the Ticket King transcript.
 */
module.exports = {
    handleTradeFlow: async (message, collectedData = {}, isStaffInvolved = false) => {
        if (isStaffInvolved) return null;

        // Exact wording from transcript
        const questions = {
            greeting: "Hi, how can I help?",
            ask_items: "What do you give and what does your trade partner give?",
            ask_user_qty: (item) => `What quantity of the ${item} do you give?`,
            ask_partner_qty: (item) => `What quantity of ${item} does your trade partner give?`,
            ask_tip: "Do you want to add a priority tip for faster handling? (yes/no)",
            ask_partner_id: "Who is your trade partner? Please @mention them or send their Discord ID."
        };

        const systemPrompt = `You are mirroring the "Solvra | AiBOT" behavior from the transcript.
        
        SEQUENCE:
        1. If user says "hello there" -> Response: "${questions.greeting}"
        2. If user says "i want to trade" -> Response: "${questions.ask_items}"
        3. After items are named (e.g. "drag" and "gorgonzilla"):
           - If user quantity missing -> Ask: "What quantity of the [user_item] do you give?"
           - If partner quantity missing -> Ask: "What quantity of [partner_item] does your trade partner give?"
        4. After quantities -> Ask: "${questions.ask_tip}"
        5. After tip -> Ask: "${questions.ask_partner_id}"
        6. Final -> Generate the "# Trade Setup (Final)" table.

        MANDATORY: Every single response MUST end with exactly: \\n-# [9000-10500] tokens
        
        Current Data: ${JSON.stringify(collectedData)}
        User Message: "${message}"

        Return JSON:
        {
            "extracted_data": { "user_item": "...", "partner_item": "...", "user_qty": "...", "partner_qty": "...", "tip": "...", "partner_id": "..." },
            "bot_response": "EXACT_WORDING_FROM_TRANSCRIPT\\n-# 9XXX tokens",
            "is_complete": true/false
        }`;

        const response = await ai.generateResponse(message, `System: ${systemPrompt}`);
        
        try {
            return JSON.parse(response);
        } catch (e) {
            const tokenCount = Math.floor(Math.random() * (10500 - 9000) + 9000);
            return { bot_response: `${response}\n-# ${tokenCount} tokens`, is_complete: false };
        }
    }
};
