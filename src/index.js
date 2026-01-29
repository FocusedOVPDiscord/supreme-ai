require('dotenv').config();
const { Client, GatewayIntentBits, Collection, REST, Routes, Events, ChannelType, EmbedBuilder } = require('discord.js');
const db = require('./utils/database');
const ai = require('./utils/ai');
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
        if (process.env.DISCORD_GUILD_ID) {
            await rest.put(Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.DISCORD_GUILD_ID), { body: commandsData });
        } else {
            await rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID), { body: commandsData });
        }
    } catch (error) { console.error('Command registration error:', error); }
}

client.once(Events.ClientReady, async () => {
    console.log(`✅ [SUPREME AI] Online as ${client.user.tag}`);
    await registerCommands();
});

// Helper: Ticket Channel Detection
function isTicketChannel(channel) {
    if (!channel || ![ChannelType.GuildText, ChannelType.PublicThread, ChannelType.PrivateThread].includes(channel.type)) return false;
    const name = channel.name.toLowerCase();
    return /ticket|support|help|claim|order|issue/i.test(name) || /^\d+$/.test(name);
}

function getTicketId(channelName) {
    const match = channelName.toLowerCase().match(/\d+/);
    return match ? `ticket-${match[0]}` : channelName.toLowerCase();
}

// --- AI TICKET BOT FEATURES ---

// 1. Instant Welcome & Intent Selection
client.on(Events.ChannelCreate, async channel => {
    if (!isTicketChannel(channel)) return;
    
    setTimeout(async () => {
        try {
            const welcomeEmbed = new EmbedBuilder()
                .setTitle('👋 Welcome to Support')
                .setDescription('Hello! I am the **AI Support Assistant**. I\'ve been assigned to your ticket to provide instant help.\n\n**How I can help you today:**\n- ⚡ Provide instant answers from our knowledge base\n- 🛠️ Troubleshoot common technical issues\n- 📝 Collect details for our human staff\n\n**Please describe your request in detail below.**')
                .setColor(0x5865F2)
                .addFields({ name: 'Estimated AI Response Time', value: '⚡ Instant', inline: true })
                .setFooter({ text: 'AI Support Powered by Groq Llama 3' })
                .setTimestamp();

            await channel.send({ embeds: [welcomeEmbed] });
        } catch (err) { console.error('Welcome message error:', err); }
    }, 1500);
});

// 2. Proactive AI Response & Learning
client.on(Events.MessageCreate, async message => {
    if (message.author.bot || !isTicketChannel(message.channel)) return;
    
    const perms = message.channel.permissionsFor(client.user);
    if (!perms || !perms.has(['ViewChannel', 'SendMessages', 'ReadMessageHistory'])) return;
    
    const ticketId = getTicketId(message.channel.name);
    db.addConversation(ticketId, message.author.id, message.content);
    
    try {
        await message.channel.sendTyping();
        
        // AITicketBot Logic: Knowledge Base First -> AI Fallback Second
        const match = db.searchSimilar(message.content);
        let response;
        
        if (match && match.response) {
            response = match.response;
            db.incrementUsage(match.id);
        } else {
            const history = db.getTicketHistory(ticketId, 8);
            const context = history.map(h => `${h.is_ai ? 'AI' : 'User'}: ${h.message}`).join('\n');
            response = await ai.generateResponse(message.content, context);
        }
        
        if (response) {
            // Check if AI resolved the issue (basic intent check)
            const resolvedWords = ['resolved', 'fixed', 'thanks', 'thank you', 'solved'];
            if (resolvedWords.some(w => message.content.toLowerCase().includes(w))) {
                db.markResolvedByAI(ticketId);
            }

            await message.reply({ content: response, allowedMentions: { repliedUser: false } });
            db.addConversation(ticketId, client.user.id, response, 1);
        }
    } catch (error) { console.error('Processing error:', error); }
});

// 3. Error Protection
process.on('unhandledRejection', error => console.error('Unhandled Rejection:', error));
process.on('uncaughtException', error => console.error('Uncaught Exception:', error));

client.login(process.env.DISCORD_TOKEN);
