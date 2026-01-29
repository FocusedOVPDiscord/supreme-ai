require('dotenv').config();
const { Client, GatewayIntentBits, Collection, REST, Routes, Events, ChannelType, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
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
    
    // Restrict to a specific category if TICKET_CATEGORY_ID is set
    if (process.env.TICKET_CATEGORY_ID && channel.parent?.id !== process.env.TICKET_CATEGORY_ID) {
        return false;
    }
    
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

    // Staff Detection: Check if the user has ManageMessages permission (a good proxy for staff)
    // If a staff member sends a message, disable the AI for this ticket.
    if (message.member && message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
        // Check if the AI is already disabled to avoid spamming the message
        const ticket = db.getTicket(ticketId);
        if (ticket && ticket.current_step_id !== -1) { // -1 means disabled
            db.updateTicketState(ticketId, -1, {}); // Set current_step_id to -1 to disable AI
            await message.channel.send('⚠️ AI has been disabled for this ticket. Reason: A staff member has joined the conversation.');
        }
        return; // Stop processing the message
    }
    
    try {
        await message.channel.sendTyping();
        
        // --- STEP-BY-STEP FLOW LOGIC ---
        const ticket = db.getTicket(ticketId);

        // If AI is disabled (current_step_id = -1), do not process
        if (ticket && ticket.current_step_id === -1) return;
        
        if (ticket && ticket.current_step_id) {
            const currentStep = db.getTrainingById(ticket.current_step_id);
            let collectedData = ticket.collected_data ? JSON.parse(ticket.collected_data) : {};
            
            // Save current answer if this step was collecting data
            if (currentStep && currentStep.data_point_name) {
                collectedData[currentStep.data_point_name] = message.content;
            }
            
            if (currentStep && currentStep.next_step_id) {
                const nextStep = db.getTrainingById(currentStep.next_step_id);
                if (nextStep) {
                    // Update state to the next step and save data
                    db.updateTicketState(ticketId, nextStep.id, collectedData);
                    
                    // Reply with the next question
                    await message.reply({ content: nextStep.response, allowedMentions: { repliedUser: false } });
                    db.addConversation(ticketId, client.user.id, nextStep.response, 1);
                    return;
                }
            }
            
            // End of Flow - Generate Summary
            db.updateTicketState(ticketId, null, collectedData);
            
            // Use AI to generate a professional summary embed based on collected data
            const summaryPrompt = `Create a professional Discord summary based on this data: ${JSON.stringify(collectedData)}. 
            Format it clearly with sections. Mention that users should type "confirm" to finalize.
            The user who opened the ticket is <@${ticket.user_id}>.`;
            
            const aiSummary = await ai.generateResponse(summaryPrompt, "You are a professional support assistant. Create a clear summary of the user's request.");
            
            if (aiSummary) {
                const summaryEmbed = new EmbedBuilder()
                    .setTitle('📋 Summary & Confirmation')
                    .setDescription(aiSummary)
                    .setColor(0xFFAA00)
                    .setFooter({ text: 'Type "confirm" to proceed or "cancel" to restart.' })
                    .setTimestamp();
                
                await message.channel.send({ embeds: [summaryEmbed] });
                db.addConversation(ticketId, client.user.id, "Summary sent", 1);
            }
            return;
        }
        
        // --- STANDARD KNOWLEDGE BASE / AI LOGIC ---
        const match = db.searchSimilar(message.content);
        let response;
        
        if (match && match.response) {
            response = match.response;
            db.incrementUsage(match.id);
            
            if (match.next_step_id) {
                // Initialize flow state
                db.updateTicketState(ticketId, match.id, {});
                console.log(`🚀 [FLOW START] Ticket ${ticketId} started flow.`);
            }
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

process.on('unhandledRejection', error => console.error('Unhandled Rejection:', error));
process.on('uncaughtException', error => console.error('Uncaught Exception:', error));

client.login(process.env.DISCORD_TOKEN);
