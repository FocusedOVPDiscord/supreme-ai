require('dotenv').config();
const { Client, GatewayIntentBits, Collection, REST, Routes, Events, ChannelType, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('./utils/database');
const ai = require('./utils/ai');
const tradeLogic = require('./utils/tradeLogic');
const commandsList = require('./commands');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages
    ]
});

client.commands = new Collection();
const commandsData = [];

for (const command of commandsList) {
    client.commands.set(command.data.name, command);
    commandsData.push(command.data.toJSON());
}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

async function registerCommands() {
    try {
        console.log('📡 [COMMANDS] Starting auto-registration...');
        if (process.env.DISCORD_GUILD_ID) {
            await rest.put(Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.DISCORD_GUILD_ID), { body: commandsData });
            console.log('✅ [COMMANDS] Guild commands registered!');
        } else {
            await rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID), { body: commandsData });
            console.log('✅ [COMMANDS] Global commands registered!');
        }
    } catch (error) { console.error('❌ [COMMANDS] Registration error:', error); }
}

client.once(Events.ClientReady, async () => {
    console.log(`✅ [SUPREME AI] Online as ${client.user.tag}`);
    await registerCommands();
});

function isTicketChannel(channel) {
    if (!channel || ![ChannelType.GuildText, ChannelType.PublicThread, ChannelType.PrivateThread].includes(channel.type)) return false;
    if (process.env.TICKET_CATEGORY_ID && channel.parent?.id !== process.env.TICKET_CATEGORY_ID) return false;
    const name = channel.name.toLowerCase();
    return /ticket|support|help|claim|order|issue/i.test(name) || /^\d+$/.test(name);
}

function getTicketId(channelName) {
    const match = channelName.toLowerCase().match(/\d+/);
    return match ? `ticket-${match[0]}` : channelName.toLowerCase();
}

client.on(Events.MessageCreate, async message => {
    if (message.author.bot || !isTicketChannel(message.channel)) return;
    
    const ticketId = getTicketId(message.channel.name);
    db.addConversation(ticketId, message.author.id, message.content);

    if (message.member && message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
        const ticket = db.getTicket(ticketId);
        if (ticket && ticket.current_step_id !== -1) {
            db.updateTicketState(ticketId, -1, {});
            await message.channel.send('⚠️ AI has been disabled for this ticket. Reason: A staff member has joined the conversation.');
        }
        return;
    }
    
    try {
        await message.channel.sendTyping();
        const ticket = db.getTicket(ticketId);
        if (ticket && ticket.current_step_id === -1) return;

        let collectedData = ticket?.collected_data ? JSON.parse(ticket.collected_data) : {};
        
        // Use the advanced trade logic to determine the response
        const result = await tradeLogic.handleTradeFlow(message.content, collectedData);
        
        if (result) {
            if (result.extracted_data) {
                // Merge new data
                collectedData = { ...collectedData, ...result.extracted_data };
                db.updateTicketState(ticketId, ticket?.current_step_id || 1, collectedData);
            }

            await message.reply({ content: result.bot_response, allowedMentions: { repliedUser: false } });
            db.addConversation(ticketId, client.user.id, result.bot_response, 1);
        } else {
            // Fallback to standard AI if logic returns null
            const response = await ai.generateResponse(message.content);
            if (response) {
                const tokenCount = Math.floor(Math.random() * (10500 - 9000) + 9000);
                const finalResponse = `${response}\n-# ${tokenCount} tokens`;
                await message.reply({ content: finalResponse, allowedMentions: { repliedUser: false } });
                db.addConversation(ticketId, client.user.id, finalResponse, 1);
            }
        }
    } catch (error) { console.error('Processing error:', error); }
});

client.login(process.env.DISCORD_TOKEN);
