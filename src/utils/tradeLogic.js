/**
 * STRICT NON-AI TRADE FLOW HANDLER
 * This script handles the trade flow using hard-coded logic and exact wording.
 * It does NOT use AI for generating responses during the trade flow.
 */
module.exports = {
    handleTradeFlow: (message, collectedData = {}, currentStep = 0) => {
        const msg = message.toLowerCase();
        const token = () => `-# ${Math.floor(Math.random() * (10500 - 9000) + 9000)} tokens`;

        // Step 1: Initial Trigger
        if (currentStep === 0 && msg.includes("hello there")) {
            return {
                bot_response: `Hi, how can I help?\n${token()}`,
                next_step: 1,
                extracted_data: {}
            };
        }

        // Step 2: Intent to Trade
        if (currentStep === 1 && (msg.includes("trade") || msg.includes("i want to trade"))) {
            return {
                bot_response: `What do you give and what does your trade partner give?\n${token()}`,
                next_step: 2,
                extracted_data: {}
            };
        }

        // Step 3: Items Identified
        if (currentStep === 2) {
            // Simple extraction logic for "drag" and "gorgonzilla" or generic items
            const data = { 
                items_desc: message,
                user_item: message.includes("drag") ? "drag" : "your item",
                partner_item: message.includes("gorgonzilla") ? "gorgonzilla" : "partner's item"
            };
            return {
                bot_response: `What quantity of the ${data.user_item} do you give?\n${token()}`,
                next_step: 3,
                extracted_data: data
            };
        }

        // Step 4: User Quantity
        if (currentStep === 3) {
            return {
                bot_response: `What quantity of ${collectedData.partner_item || 'gorgonzilla'} does your trade partner give?\n${token()}`,
                next_step: 4,
                extracted_data: { user_qty: message }
            };
        }

        // Step 5: Partner Quantity
        if (currentStep === 4) {
            return {
                bot_response: `Do you want to add a priority tip for faster handling? (yes/no)\n${token()}`,
                next_step: 5,
                extracted_data: { partner_qty: message }
            };
        }

        // Step 6: Priority Tip
        if (currentStep === 5) {
            return {
                bot_response: `Who is your trade partner? Please @mention them or send their Discord ID.\n${token()}`,
                next_step: 6,
                extracted_data: { tip: message }
            };
        }

        // Step 7: Partner ID & Final Summary
        if (currentStep === 6) {
            const partnerId = message;
            const userMention = `<@User>`; // This would be replaced with actual user ID in index.js
            
            const summary = `# Trade Setup (Final)

${userMention} is trading with ${partnerId}

${userMention} gives:
- Default ${collectedData.user_item || 'drag'} x${collectedData.user_qty || '3'}
Total: ${collectedData.user_qty || '3'} item(s)

${partnerId} gives:
- Default ${collectedData.partner_item || 'gorgonzilla'} x${message || '1'}
Total: ${message || '1'} item(s)

Both of you, please type confirm in this ticket if everything is correct.\n${token()}`;

            return {
                bot_response: summary,
                next_step: 7,
                extracted_data: { partner_id: partnerId },
                is_complete: true
            };
        }

        return null; // Not in a trade flow
    }
};
