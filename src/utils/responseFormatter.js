/**
 * Utility to format trained responses with dynamic variables
 */
module.exports = {
    formatResponse: (template, message, ticketData = {}) => {
        if (!template) return template;

        let formatted = template;

        // 1. Handle User Mentions
        // Replace <@User> or {user} with the message author
        const userMention = `<@${message.author.id}>`;
        formatted = formatted.replace(/<@User>|{user}/gi, userMention);

        // 2. Handle Ticket Data (from trade flow)
        // Variables like {user_item}, {partner_item}, {user_qty}, {partner_qty}, {partner_id}
        if (ticketData) {
            Object.keys(ticketData).forEach(key => {
                const value = ticketData[key];
                const placeholder = new RegExp(`{${key}}`, 'gi');
                formatted = formatted.replace(placeholder, value || 'N/A');
            });

            // Common aliases
            formatted = formatted.replace(/{item}/gi, ticketData.user_item || 'item');
            formatted = formatted.replace(/{partner}/gi, ticketData.partner_id || 'partner');
            formatted = formatted.replace(/{qty}/gi, ticketData.user_qty || '1');
        }

        // 3. Simple extraction from current message if not in ticketData
        // If the template asks for {input}, give the whole message
        formatted = formatted.replace(/{input}/gi, message.content);

        return formatted;
    }
};
