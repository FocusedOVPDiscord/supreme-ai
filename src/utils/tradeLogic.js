/**
 * STRICT NON-AI TRADE FLOW HANDLER
 * Matches the phrasing and flow of the AI Ticket Bot exactly.
 */
module.exports = {
    handleTradeFlow: (message, collectedData = {}, currentStep = 0) => {
        const msg = message.toLowerCase().trim();

        // Step 1: Initial Trigger
        if (currentStep === 0 && (msg === "helo" || msg === "hello" || msg === "hi")) {
            return {
                bot_response: `Hello there, how can I assist you!`,
                next_step: 1,
                extracted_data: {}
            };
        }

        // Step 2: Intent to Trade
        if ((currentStep === 0 || currentStep === 1) && (msg.includes("trade") || msg.includes("wanna trade"))) {
            return {
                bot_response: `What are you giving, and what is your partner giving?`,
                next_step: 2,
                extracted_data: {}
            };
        }

        // Step 3: Items Identified
        if (currentStep === 2) {
            let userItem = "item";
            let partnerItem = "item";

            if (msg.includes(" for ")) {
                const parts = msg.split(" for ");
                userItem = parts[0].replace(/i am giving|i give|i'm giving/g, "").trim();
                partnerItem = parts[1].replace(/they give|he is giving|he's giving|she gives/g, "").trim();
            } else if (msg.includes(" and ")) {
                const parts = msg.split(" and ");
                userItem = parts[0].replace(/i am giving|i give|i'm giving/g, "").trim();
                partnerItem = parts[1].replace(/they give|he is giving|he's giving|she gives/g, "").trim();
            } else {
                userItem = message.replace(/i am giving|i give|i'm giving/gi, "").trim();
            }

            return {
                bot_response: `Got it. What quantity of ${userItem} do you give?`,
                next_step: 3,
                extracted_data: { user_item: userItem, partner_item: partnerItem }
            };
        }

        // Step 4: User Quantity
        if (currentStep === 3) {
            const qty = msg.match(/\d+/) ? msg.match(/\d+/)[0] : message;
            return {
                bot_response: `What is your partner giving?`,
                next_step: 4,
                extracted_data: { user_qty: qty }
            };
        }

        // Step 5: Partner Item (If not already extracted)
        if (currentStep === 4) {
            const partnerItem = message.replace(/he is giving|he's giving|she gives|they give/gi, "").trim();
            return {
                bot_response: `What quantity of ${partnerItem} does your partner give?`,
                next_step: 5,
                extracted_data: { partner_item: partnerItem }
            };
        }

        // Step 6: Partner Quantity
        if (currentStep === 5) {
            const qty = msg.match(/\d+/) ? msg.match(/\d+/)[0] : message;
            return {
                bot_response: `Do you want to add a priority tip for faster handling? (yes/no)`,
                next_step: 6,
                extracted_data: { partner_qty: qty }
            };
        }

        // Step 7: Priority Tip
        if (currentStep === 6) {
            return {
                bot_response: `Who is your trade partner? Please @mention them or send their Discord ID.`,
                next_step: 7,
                extracted_data: { tip: message }
            };
        }

        // Step 8: Partner ID & Final Summary
        if (currentStep === 7) {
            const partnerId = message;
            const userMention = `<@User>`; 
            
            const summary = `Trade Setup (Final)
${userMention} is trading with ${partnerId}
${userMention} gives:

${collectedData.user_item} x${collectedData.user_qty}
${partnerId} gives:

${collectedData.partner_item} x${collectedData.partner_qty}
 Both of you, please type confirm in this ticket if everything is correct.`;

            return {
                bot_response: summary,
                next_step: 8,
                extracted_data: { partner_id: partnerId },
                is_complete: true
            };
        }

        return null;
    }
};
