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

// 1. Instant Welcome
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

// 2. Command Handling
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(`❌ [COMMAND ERROR] ${interaction.commandName}:`, error);
        const reply = { content: '❌ There was an error executing this command!', ephemeral: true };
        if (interaction.replied || interaction.deferred) await interaction.followUp(reply);
        else await interaction.reply(reply);
    }
});

// 3. Proactive AI Response & Flow Handling
client.on(Events.MessageCreate, async message => {
    if (message.author.bot || !isTicketChannel(message.channel)) return;
    
    const perms = message.channel.permissionsFor(client.user);
    if (!perms || !perms.has(['ViewChannel', 'SendMessages', 'ReadMessageHistory'])) return;
    
    const ticketId = getTicketId(message.channel.name);
    db.addConversation(ticketId, message.author.id, message.content);
    
    try {
        await message.channel.sendTyping();
        
        // --- STEP-BY-STEP FLOW LOGIC ---
        const state = db.getTicketState(ticketId);
        
        // If the user is currently in a flow (current_step_id is set)
        if (state && state.current_step_id) {
            const currentStep = db.getTrainingById(state.current_step_id);
            
            if (currentStep && currentStep.next_step_id) {
                const nextStep = db.getTrainingById(currentStep.next_step_id);
                if (nextStep) {
                    // Update state to the next step
                    db.updateTicketState(ticketId, nextStep.id);
                    
                    // Reply with the next question in the flow
                    await message.reply({ content: nextStep.response, allowedMentions: { repliedUser: false } });
                    db.addConversation(ticketId, client.user.id, nextStep.response, 1);
                    return; // Exit early as we've handled the flow step
                } else {
                    // End of flow
                    db.updateTicketState(ticketId, null);
                }
            } else {
                // End of flow
                db.updateTicketState(ticketId, null);
            }
        }
        
        // --- STANDARD KNOWLEDGE BASE / AI LOGIC ---
        const match = db.searchSimilar(message.content);
        let response;
        
        if (match && match.response) {
            response = match.response;
            db.incrementUsage(match.id);
            
            // If this match starts a flow (has a next_step_id)
            if (match.next_step_id) {
                db.updateTicketState(ticketId, match.id);
                console.log(`🚀 [FLOW START] Ticket ${ticketId} started flow from training ID ${match.id}`);
            }
            
            console.log(`✅ [TRAINED] Matched: "${message.content.substring(0, 30)}..."`);
        } else {
            const history = db.getTicketHistory(ticketId, 8);
            const context = history.map(h => `${h.is_ai ? 'AI' : 'User'}: ${h.message}`).join('\n');
            response = await ai.generateResponse(message.content, context);
        }
        
        if (response) {
            const resolvedWords = ['resolved', 'fixed', 'thanks', 'thank you', 'solved'];
            if (resolvedWords.some(w => message.content.toLowerCase().includes(w))) {
                db.markResolvedByAI(ticketId);
            }

            await message.reply({ content: response, allowedMentions: { repliedUser: false } });
            db.addConversation(ticketId, client.user.id, response, 1);
        }
    } catch (error) { console.error('Processing error:', error); }
});

// 4. Error Protection
process.on('unhandledRejection', error => console.error('Unhandled Rejection:', error));
process.on('uncaughtException', error => console.error('Uncaught Exception:', error));

client.login(process.env.DISCORD_TOKEN);
