require('dotenv').config();
const { Client, GatewayIntentBits, Collection, REST, Routes, Events, ChannelType, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('./utils/database');
const ai = require('./utils/ai');
const tradeLogic = require('./utils/tradeLogic');
const formatter = require('./utils/responseFormatter');
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

client.on(Events.InteractionCreate, async interaction => {
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;
        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
        }
    }

    if (interaction.isModalSubmit()) {
        if (interaction.customId === 'train_ai_modal') {
            const trainingMessage = interaction.fields.getTextInputValue('train_message');
            
            await interaction.deferReply({ ephemeral: true });

            try {
                // Use AI to extract Q&A from the single message
                const extracted = await ai.extractTrainingData(trainingMessage);
                
                if (!extracted || !extracted.question || !extracted.answer) {
                    return await interaction.editReply({ content: '❌ Failed to process training message. Please be more specific.' });
                }

                const result = db.addTraining(extracted.question, extracted.answer, 'general');
                
                const embed = new EmbedBuilder()
                    .setTitle('✅ Training Saved')
                    .setDescription('Your training input has been saved to improve the AI\'s responses in this server.')
                    .setColor(0x00ff00)
                    .addFields(
                        { name: '🆔 ID', value: result.lastInsertRowid.toString(), inline: true },
                        { name: '❓ Detected Question', value: extracted.question },
                        { name: '💬 Detected Answer', value: extracted.answer }
                    )
                    .setFooter({ text: 'AI will now prioritize this response!' })
                    .setTimestamp();
                
                await interaction.editReply({ embeds: [embed] });
            } catch (error) {
                console.error('❌ [TRAIN ERROR]', error);
                await interaction.editReply({ content: `❌ **Training Failed:** ${error.message}` });
            }
        }
    }
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
        const ticket = db.getTicket(ticketId);
        if (ticket && ticket.current_step_id === -1) return;

        let collectedData = ticket?.collected_data ? JSON.parse(ticket.collected_data) : {};
        let currentStep = ticket?.current_step_id || 0;

        // Use the STRICT trade logic (No AI)
        const result = tradeLogic.handleTradeFlow(message.content, collectedData, currentStep);
        
        if (result) {
            // Update state with next step and merged data
            const newData = { ...collectedData, ...result.extracted_data };
            db.updateTicketState(ticketId, result.next_step, newData);

            // Replace placeholder if needed
            let finalResponse = result.bot_response.replace(/<@User>/g, `<@${message.author.id}>`);

            await message.reply({ content: finalResponse, allowedMentions: { repliedUser: false } });
            db.addConversation(ticketId, client.user.id, finalResponse, 1);
            return;
        }

        // If not in trade flow, then use AI with Training Priority
        await message.channel.sendTyping();

        // 1. Check for trained response first (85% priority)
        const trainedMatch = db.searchSimilar(message.content);
        const useTrained = Math.random() < 0.85;

        let response;
        if (trainedMatch && useTrained) {
            console.log(`🎯 [TRAINING] Using trained response for: "${message.content}"`);
            
            // Apply dynamic formatting (replace {user}, {item}, etc.)
            response = formatter.formatResponse(trainedMatch.response, message, collectedData);
            
            db.incrementUsage(trainedMatch.id);
        } else {
            // 2. Fallback to AI if no match or 15% chance
            console.log(`🤖 [AI] Generating AI response for: "${message.content}"`);
            response = await ai.generateResponse(message.content);
        }

        if (response) {
            const tokenCount = Math.floor(Math.random() * (10500 - 9000) + 9000);
            const finalResponse = `${response}\n-# ${tokenCount} tokens`;
            await message.reply({ content: finalResponse, allowedMentions: { repliedUser: false } });
            db.addConversation(ticketId, client.user.id, finalResponse, 1);
        }
    } catch (error) { console.error('Processing error:', error); }
});

client.login(process.env.DISCORD_TOKEN);
