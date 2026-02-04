require('dotenv').config();
const http = require('http');
const port = process.env.PORT || 10000;

console.log('🚀 [STARTUP] Initializing Supreme AI...');

// Simple health check server for Koyeb
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot is running\n');
});

server.listen(port, '0.0.0.0', () => {
    console.log(`✅ [HEALTH CHECK] Listening on port ${port}`);
});

server.on('error', (err) => {
    console.error('❌ [HEALTH CHECK ERROR]', err);
});

const { Client, GatewayIntentBits, Collection, REST, Routes, Events, ChannelType, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('./utils/database');
const ai = require('./utils/ai');
const tradeLogic = require('./utils/tradeLogic');
const formatter = require('./utils/responseFormatter');
const commandsList = require('./commands');

if (!process.env.DISCORD_TOKEN) {
    console.error('❌ [FATAL] DISCORD_TOKEN is missing from environment variables!');
    process.exit(1);
}

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
        if (!process.env.DISCORD_CLIENT_ID) {
            console.warn('⚠️ [COMMANDS] DISCORD_CLIENT_ID missing, skipping registration.');
            return;
        }
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

client.on(Events.InteractionCreate, async interaction => {
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;
        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ content: 'There was an error while executing this command!' });
            } else {
                await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
            }
        }
    }
});

async function isTicketChannel(channel) {
    if (!channel || ![ChannelType.GuildText, ChannelType.PublicThread, ChannelType.PrivateThread].includes(channel.type)) return false;
    
    const externalCategoryId = await db.getSetting('external_category_id');
    if (externalCategoryId && channel.parent?.id === externalCategoryId) return true;

    if (channel.parent && /ticket|support|help|claim|order|issue/i.test(channel.parent.name)) return true;

    if (process.env.TICKET_CATEGORY_ID && channel.parent?.id === process.env.TICKET_CATEGORY_ID) return true;

    const name = channel.name.toLowerCase();
    return /ticket|support|help|claim|order|issue/i.test(name) || /^\d+$/.test(name);
}

function getTicketId(channelName) {
    const match = channelName.toLowerCase().match(/\d+/);
    return match ? `ticket-${match[0]}` : channelName.toLowerCase();
}

client.on(Events.MessageCreate, async message => {
    try {
        const externalBotId = await db.getSetting('external_bot_id');
        const isExternalBot = message.author.bot && externalBotId && message.author.id === externalBotId;
        
        if (message.author.bot && !isExternalBot) return;

        const isTicket = await isTicketChannel(message.channel);
        
        if (isExternalBot && isTicket) {
            const ticketId = getTicketId(message.channel.name);
            console.log(`🤖 [EXTERNAL BOT] Detected activity from connected bot in ${ticketId}`);
            await db.addConversation(ticketId, message.author.id, message.content);
            return;
        }

        if (!isTicket) return;
        
        const ticketId = getTicketId(message.channel.name);
        await db.addConversation(ticketId, message.author.id, message.content);

        if (message.member && message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            const ticket = await db.getTicket(ticketId);
            if (ticket && ticket.current_step_id !== -1) {
                await db.updateTicketState(ticketId, -1, {});
                await message.channel.send('⚠️ AI has been disabled for this ticket. Reason: A staff member has joined the conversation.');
            }
            return;
        }
        
        const aiEnabled = await db.getSetting('ai_enabled');
        if (aiEnabled === 'false') return;

        const ticket = await db.getTicket(ticketId);
        if (ticket && ticket.current_step_id === -1) return;

        let collectedData = ticket?.collected_data ? JSON.parse(ticket.collected_data) : {};
        let currentStep = ticket?.current_step_id || 0;

        const greetings = ['hi', 'hello', 'helo', 'hey', 'yo', 'sup'];
        if (greetings.includes(message.content.toLowerCase().trim()) && currentStep > 0) {
            let greetingResponse = "";
            if (currentStep === 8) {
                greetingResponse = "If you'd like to confirm the trade or make changes to the items or quantities, just let me know!";
            } else {
                greetingResponse = "Welcome back! We were in the middle of setting up your trade. What's the next detail?";
            }
            
            const tokenCount = Math.floor(Math.random() * (3500 - 2500) + 2500);
            const finalResponse = `${greetingResponse}\n-# ${tokenCount} tokens`;
            
            await message.reply({ content: finalResponse, allowedMentions: { repliedUser: false } });
            await db.addConversation(ticketId, client.user.id, finalResponse, 1);
            return;
        }

        if (message.content.toLowerCase().includes('trade') || (currentStep > 0 && currentStep < 8)) {
            await message.channel.sendTyping();
            
            const aiResult = await ai.processTradeMessage(message.content, collectedData);
            
            if (aiResult) {
                const nextStep = aiResult.is_complete ? 8 : (currentStep === 0 ? 1 : currentStep);
                await db.updateTicketState(ticketId, nextStep, aiResult.updated_data);

                let finalResponse = aiResult.bot_response;
                
                if (aiResult.is_complete) {
                    finalResponse = `Trade Setup (Final)\n<@${message.author.id}> is trading with ${aiResult.updated_data.partner_id}\n<@${message.author.id}> gives:\n\n${aiResult.updated_data.user_item} x${aiResult.updated_data.user_qty}\n${aiResult.updated_data.partner_id} gives:\n\n${aiResult.updated_data.partner_item} x${aiResult.updated_data.partner_qty}\n\nBoth of you, please type confirm in this ticket if everything is correct.`;
                }

                await message.reply({ content: finalResponse, allowedMentions: { repliedUser: false } });
                await db.addConversation(ticketId, client.user.id, finalResponse, 1);
                return;
            }
        }

        await message.channel.sendTyping();

        const trainedMatch = await db.searchSimilar(message.content);
        const useTrained = Math.random() < 0.85;

        let response;
        if (trainedMatch && useTrained) {
            console.log(`🎯 [TRAINING] Using trained response for: "${message.content}"`);
            response = formatter.formatResponse(trainedMatch.response, message, collectedData);
            await db.incrementUsage(trainedMatch.id);
        } else {
            console.log(`🤖 [AI] Generating AI response for: "${message.content}"`);
            const tradeContext = collectedData ? `\n[Current Trade Data]: ${JSON.stringify(collectedData)}` : "";
            response = await ai.generateResponse(message.content, tradeContext);
        }

        if (response) {
            const tokenCount = Math.floor(Math.random() * (10500 - 9000) + 9000);
            const finalResponse = `${response}\n-# ${tokenCount} tokens`;
            await message.reply({ content: finalResponse, allowedMentions: { repliedUser: false } });
            await db.addConversation(ticketId, client.user.id, finalResponse, 1);
        }
    } catch (error) { console.error('Processing error:', error); }
});

// Initialize database then login
(async () => {
    try {
        console.log('📂 [DATABASE] Initializing...');
        await db.init();
        console.log('🔑 [DISCORD] Logging in...');
        await client.login(process.env.DISCORD_TOKEN);
    } catch (error) {
        console.error('❌ [FATAL] Startup failed:', error);
        process.exit(1);
    }
})();

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ [UNHANDLED REJECTION]', reason);
});

process.on('uncaughtException', (err) => {
    console.error('❌ [UNCAUGHT EXCEPTION]', err);
    process.exit(1);
});
