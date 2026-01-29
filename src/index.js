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
        GatewayIntentBits.GuildMembers
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
    if (!validTypes.includes(channel.type)) return false;
    
    const name = channel.name.toLowerCase();
    
    // Common ticket patterns
    const ticketPatterns = [
        /^ticket-\d+$/,           // ticket-0001, ticket-1234
        /^ticket_\d+$/,           // ticket_0001
        /^\d{4}-ticket$/,         // 0001-ticket
        /^support-\d+$/,          // support-0001
        /^help-\d+$/,             // help-0001
        /ticket/,                 // any channel with "ticket" in name
    ];
    
    return ticketPatterns.some(pattern => pattern.test(name));
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

client.on(Events.MessageCreate, async message => {
    // Ignore bot messages
    if (message.author.bot) return;
    
    // Check if this is a ticket channel
    if (!isTicketChannel(message.channel)) return;
    
    const ticketId = getTicketId(message.channel.name);
    console.log(`📩 Message in ticket channel: ${message.channel.name} (ID: ${ticketId})`);
    
    // Store user message in database
    db.addConversation(ticketId, message.author.id, message.content);
    
    try {
        // Show typing indicator
        await message.channel.sendTyping();
        
        // First, search for trained responses
        const match = db.searchSimilar(message.content);
        let response;
        
        if (match && match.response) {
            console.log(`✅ Found trained response for: "${message.content.substring(0, 50)}..."`);
            response = match.response;
            db.incrementUsage(match.id);
        } else {
            // No trained response found, use Groq AI
            console.log(`🤖 Generating AI response for: "${message.content.substring(0, 50)}..."`);
            
            // Get conversation history for context
            const history = db.getTicketHistory(ticketId, 5);
            const contextMessages = history.map(h => `${h.is_ai ? 'AI' : 'User'}: ${h.message}`).join('\n');
            
            response = await ai.generateResponse(message.content, contextMessages);
            
            if (!response) {
                console.error('❌ AI generation failed, using fallback message');
                response = "I'm having trouble generating a response right now. A staff member will assist you shortly. 🙏";
            }
        }
        
        if (response) {
            // Send the response
            await message.reply({ 
                content: response, 
                allowedMentions: { repliedUser: false } 
            });
            
            // Store AI response in database
            db.addConversation(ticketId, client.user.id, response, 1);
            console.log(`✅ Response sent in ${ticketId}`);
        }
    } catch (error) {
        console.error('❌ Ticket Listener Error:', error);
        
        // Try to send error message to user
        try {
            await message.reply({
                content: "⚠️ I encountered an error. Please wait for a staff member to assist you.",
                allowedMentions: { repliedUser: false }
            });
        } catch (replyError) {
            console.error('❌ Could not send error message:', replyError);
        }
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
