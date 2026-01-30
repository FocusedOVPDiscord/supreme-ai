/**
 * Utility to format trained responses with dynamic variables
 */
module.exports = {
    formatResponse: (template, message, ticketData = {}) => {
        if (!template) return template;

        let formatted = template;

        // 1. Author Variables (The person who triggered the message)
        const author = message.author;
        const authorVars = {
            '{author}': `<@${author.id}>`,
            '{author.name}': author.username,
            '{author.id}': author.id,
            '{author.avatar}': author.displayAvatarURL()
        };

        // 2. Ticket Variables (The owner of the ticket)
        const ticketVars = {
            '{ticket.user}': ticketData.user_id ? `<@${ticketData.user_id}>` : `<@${author.id}>`,
            '{ticket.id}': message.channel.name,
            '{ticket.channel}': `<#${message.channel.id}>`
        };

        // 3. Trade Specific Variables
        const tradeVars = {
            '{user_item}': ticketData.user_item || 'item',
            '{partner_item}': ticketData.partner_item || 'item',
            '{user_qty}': ticketData.user_qty || '1',
            '{partner_qty}': ticketData.partner_qty || '1',
            '{partner}': ticketData.partner_id || 'partner',
            '{item}': ticketData.user_item || 'item',
            '{qty}': ticketData.user_qty || '1'
        };

        // 4. Server Variables
        const serverVars = {
            '{server.name}': message.guild?.name || 'Server',
            '{server.id}': message.guild?.id || '0'
        };

        // Combine all variables
        const allVars = { ...authorVars, ...ticketVars, ...tradeVars, ...serverVars };

        // Replace variables
        Object.keys(allVars).forEach(key => {
            const placeholder = new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
            formatted = formatted.replace(placeholder, allVars[key]);
        });

        // 5. Legacy/Special Replacements
        formatted = formatted.replace(/<@User>/gi, `<@${author.id}>`);
        formatted = formatted.replace(/{user}/gi, `<@${author.id}>`);
        formatted = formatted.replace(/{input}/gi, message.content);

        // 6. Apply Modifiers (Upper/Lower case)
        // Example: {author.name?upper}
        formatted = formatted.replace(/{([^{}]+)\?upper}/gi, (match, p1) => {
            const val = allVars[`{${p1}}`];
            return val ? val.toString().toUpperCase() : match;
        });
        formatted = formatted.replace(/{([^{}]+)\?lower}/gi, (match, p1) => {
            const val = allVars[`{${p1}}`];
            return val ? val.toString().toLowerCase() : match;
        });

        return formatted;
    }
};
