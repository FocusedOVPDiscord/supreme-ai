require('dotenv').config();
const { Client, GatewayIntentBits, Collection, REST, Routes, Events, ChannelType } = require('discord.js');
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
        console.log('🔄 Registering slash commands...');
        if (process.env.DISCORD_GUILD_ID) {
            await rest.put(
                Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.DISCORD_GUILD_ID),
                { body: commandsData }
            );
            console.log(`✅ Synced commands to guild ${process.env.DISCORD_GUILD_ID}`);
        } else {
            await rest.put(
                Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
                { body: commandsData }
            );
            console.log('✅ Synced commands globally');
        }
    } catch (error) {
        console.error('❌ Command registration error:', error);
    }
}

client.once(Events.ClientReady, async () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
    console.log(`📊 Connected to ${client.guilds.cache.size} guilds`);
    await registerCommands();
});

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        const errorMessage = '❌ Error executing command!';
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: errorMessage, ephemeral: true });
        } else {
            await interaction.reply({ content: errorMessage, ephemeral: true });
        }
    }
});

// Enhanced ticket detection - supports any ticket channel format
function isTicketChannel(channel) {
    if (!channel) return false;
    
    // Check if it's a text channel or thread
    const validTypes = [ChannelType.GuildText, ChannelType.PublicThread, ChannelType.PrivateThread];
    if (!validTypes.includes(channel.type)) {
        // console.log(`[DEBUG] Channel ${channel.name} is not a valid type: ${channel.type}`);
        return false;
    }
    
    const name = channel.name.toLowerCase();
    
    // Common ticket patterns
    const ticketPatterns = [
        /ticket/i,                 // any channel with "ticket" in name
        /support/i,                // any channel with "support" in name
        /help/i,                   // any channel with "help" in name
        /claim/i,                  // any channel with "claim" in name
        /^t-\d+$/i,                // t-0001
        /^\d+$/                    // just numbers
    ];
    
    const isMatch = ticketPatterns.some(pattern => pattern.test(name));
    if (isMatch) {
        console.log(`[DEBUG] Detected ticket channel: ${channel.name}`);
    }
    return isMatch;
}

// Get ticket ID from channel name
function getTicketId(channelName) {
    const name = channelName.toLowerCase();
    
    // Try to extract number-based ID
    const match = name.match(/\d{4}/);
    if (match) {
        return `ticket-${match[0]}`;
    }
    
    // Fallback to full channel name
    return name;
}

// AI Ticket Bot Style - Auto Greeting on Channel Creation
client.on(Events.ChannelCreate, async channel => {
    if (!isTicketChannel(channel)) return;
    
    setTimeout(async () => {
        try {
            const permissions = channel.permissionsFor(client.user);
            if (!permissions || !permissions.has(['ViewChannel', 'SendMessages'])) return;

            const welcomeEmbed = new EmbedBuilder()
                .setTitle('🎫 Support Ticket Opened')
                .setDescription('Hello! I am the **Supreme AI Assistant**. I\'ve been notified of your ticket.\n\nWhile you wait for a staff member, please **describe your issue in detail** below. I will try to provide an instant solution based on our knowledge base!')
                .setColor(0x3498db)
                .setFooter({ text: 'AI Support Powered by Groq' })
                .setTimestamp();

            await channel.send({ embeds: [welcomeEmbed] });
            console.log(`✨ [AI TICKET] Sent welcome message in new ticket: ${channel.name}`);
        } catch (err) {
            console.error('Error sending ticket welcome:', err);
        }
    }, 2000); // Wait 2 seconds for other bots to finish setup
});

client.on(Events.MessageCreate, async message => {
    if (message.author.bot) return;
    if (!isTicketChannel(message.channel)) return;
    
    const permissions = message.channel.permissionsFor(client.user);
    if (!permissions || !permissions.has(['ViewChannel', 'SendMessages', 'ReadMessageHistory'])) return;
    
    const ticketId = getTicketId(message.channel.name);
    db.addConversation(ticketId, message.author.id, message.content);
    
    try {
        await message.channel.sendTyping();
        
        // AI TICKET BOT LOGIC:
        // 1. Check for specific trained triggers
        // 2. Use Groq AI with the full context of the ticket
        
        const match = db.searchSimilar(message.content);
        let response;
        
        if (match && match.response) {
            response = match.response;
            db.incrementUsage(match.id);
            console.log(`✅ [TRAINED] Responding to "${message.content.substring(0, 20)}..."`);
        } else {
            const history = db.getTicketHistory(ticketId, 6);
            const contextMessages = history.map(h => `${h.is_ai ? 'Assistant' : 'Customer'}: ${h.message}`).join('\n');
            
            response = await ai.generateResponse(message.content, contextMessages);
        }
        
        if (response) {
            // Use a clean, professional reply style like aiticketbot.com
            await message.reply({ 
                content: response, 
                allowedMentions: { repliedUser: false } 
            });
            
            db.addConversation(ticketId, client.user.id, response, 1);
        }
    } catch (error) {
        console.error('❌ Ticket Processing Error:', error);
    }
});

// Handle errors gracefully
process.on('unhandledRejection', error => {
    console.error('❌ Unhandled promise rejection:', error);
});

process.on('uncaughtException', error => {
    console.error('❌ Uncaught exception:', error);
});

// Login to Discord
client.login(process.env.DISCORD_TOKEN);
