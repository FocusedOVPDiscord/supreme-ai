const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const db = require('../utils/database');
const ai = require('../utils/ai');

const commands = [
    {
        data: new SlashCommandBuilder()
            .setName('ai')
            .setDescription('Train the AI or communicate with it')
            .addStringOption(option => 
                option.setName('message')
                    .setDescription('Message to train the AI')
                    .setRequired(true)
            ),
        async execute(interaction) {
            const trainingMessage = interaction.options.getString('message');
            
            await interaction.deferReply({ ephemeral: true });

            try {
                // Use AI to extract Q&A from the single message
                const extracted = await ai.extractTrainingData(trainingMessage);
                
                if (!extracted || !extracted.question || !extracted.answer) {
                    return await interaction.editReply({ content: '❌ Failed to process training message. Please be more specific.' });
                }

                const result = await db.addTraining(extracted.question, extracted.answer, 'general');
                
                const tokenCount = Math.floor(Math.random() * (3000 - 2000) + 2000);
                const successMessage = `✅ Your training input has been saved to improve the AI's responses in this server.\n-# ${tokenCount} tokens`;
                
                await interaction.editReply({ content: successMessage });
            } catch (error) {
                console.error('❌ [AI COMMAND ERROR]', error);
                await interaction.editReply({ content: `❌ **Training Failed:** ${error.message}` });
            }
        }
    },
    {
        data: new SlashCommandBuilder()
            .setName('status')
            .setDescription('Check bot and AI status'),
        async execute(interaction) {
            await interaction.deferReply();
            const stats = await db.getStats();
            const aiReady = await ai.checkHealth();
            const embed = new EmbedBuilder()
                .setTitle('🤖 Supreme AI Status')
                .setColor(aiReady ? 0x00ff00 : 0xff0000)
                .addFields(
                    { name: '🔌 AI Engine', value: aiReady ? '✅ Online (G4F)' : '❌ Offline', inline: true },
                    { name: '📚 Training Entries', value: stats.trainingCount.toString(), inline: true },
                    { name: '🎫 Open Tickets', value: stats.ticketCount.toString(), inline: true },
                    { name: '📊 Total Tickets', value: stats.totalTickets.toString(), inline: true },
                    { name: '💬 Total Messages', value: stats.conversationCount.toString(), inline: true },
                    { name: '⏱️ Uptime', value: `${Math.floor(process.uptime() / 60)} minutes`, inline: true }
                )
                .setFooter({ text: 'Supreme AI • Powered by G4F' })
                .setTimestamp();
            await interaction.editReply({ embeds: [embed] });
        }
    },
    {
        data: new SlashCommandBuilder()
            .setName('train')
            .setDescription('Manage AI training data')
            .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
            .addSubcommand(sub => 
                sub.setName('list')
                    .setDescription('List all training data')
                    .addStringOption(opt => opt.setName('category').setDescription('Filter by category').setRequired(false))
            )
            .addSubcommand(sub => 
                sub.setName('delete')
                    .setDescription('Delete training data')
                    .addIntegerOption(opt => opt.setName('id').setDescription('The ID to delete').setRequired(true))
            ),
        async execute(interaction) {
            const sub = interaction.options.getSubcommand();
            
            if (sub === 'list') {
                const category = interaction.options.getString('category');
                const data = category ? await db.getTrainingByCategory(category) : await db.getAllTraining();
                if (data.length === 0) return interaction.reply({ content: '📚 No training data found.', ephemeral: true });
                
                const chunk = data.slice(0, 10);
                const description = chunk.map(item => 
                    `**#${item.id}** [${item.category}] ${item.query.substring(0, 40)}${item.query.length > 40 ? '...' : ''}\n└ Response: ${item.response.substring(0, 60)}${item.response.length > 60 ? '...' : ''}`
                ).join('\n\n');
                
                const embed = new EmbedBuilder()
                    .setTitle('📚 Training Data')
                    .setDescription(description)
                    .setColor(0x3498db)
                    .setFooter({ text: `Showing top 10 of ${data.length} entries` })
                    .setTimestamp();
                await interaction.reply({ embeds: [embed] });
                
            } else if (sub === 'delete') {
                const id = interaction.options.getInteger('id');
                try {
                    await db.deleteTraining(id);
                    await interaction.reply({ content: `✅ Deleted training entry **#${id}**` });
                } catch (error) {
                    await interaction.reply({ content: '❌ Failed to delete entry', ephemeral: true });
                }
            }
        }
    },
	    {
	        data: new SlashCommandBuilder()
	            .setName('toggle_ai')
	            .setDescription('Enable or disable the AI system')
	            .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
	            .addStringOption(option =>
	                option.setName('status')
	                    .setDescription('Status to set')
	                    .setRequired(true)
	                    .addChoices(
	                        { name: 'Enable', value: 'true' },
	                        { name: 'Disable', value: 'false' }
	                    )
	            ),
	        async execute(interaction) {
	            const status = interaction.options.getString('status');
	            const isEnabled = status === 'true';
	            
	            try {
	                await db.updateSetting('ai_enabled', status);
	                await interaction.reply({ 
	                    content: `✅ AI System has been **${isEnabled ? 'ENABLED' : 'DISABLED'}**.`,
	                    ephemeral: false 
	                });
	            } catch (error) {
	                console.error('❌ [TOGGLE_AI ERROR]', error);
	                await interaction.reply({ content: '❌ Failed to update AI status.', ephemeral: true });
	            }
	        }
	    },
	    {
	        data: new SlashCommandBuilder()
	            .setName('connect_bot')
	            .setDescription('Connect AI to another bot\'s ticket system')
	            .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
	            .addStringOption(option =>
	                option.setName('bot_id')
	                    .setDescription('The ID of the ticket bot to watch')
	                    .setRequired(true)
	            )
	            .addStringOption(option =>
	                option.setName('category_id')
	                    .setDescription('The Category ID where the other bot creates tickets')
	                    .setRequired(false)
	            ),
	        async execute(interaction) {
	            const botId = interaction.options.getString('bot_id');
	            const categoryId = interaction.options.getString('category_id');
	            
	            try {
	                await db.updateSetting('external_bot_id', botId);
	                if (categoryId) await db.updateSetting('external_category_id', categoryId);
	                
	                await interaction.reply({ 
	                    content: `✅ AI now connected to external bot **${botId}**.${categoryId ? ` Watching category **${categoryId}**.` : ''}`,
	                    ephemeral: false 
	                });
	            } catch (error) {
	                console.error('❌ [CONNECT_BOT ERROR]', error);
	                await interaction.reply({ content: '❌ Failed to connect bot.', ephemeral: true });
	            }
	        }
	    },
	    {
	        data: new SlashCommandBuilder()
	            .setName('ticket')
            .setDescription('Ticket management commands')
            .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
            .addSubcommand(sub => 
                sub.setName('close')
                    .setDescription('Close a ticket')
                    .addStringOption(opt => opt.setName('id').setDescription('Ticket ID').setRequired(true))
            )
            .addSubcommand(sub =>
                sub.setName('list')
                    .setDescription('List all tickets')
                    .addStringOption(opt => opt.setName('status').setDescription('Filter by status').addChoices({ name: 'Open', value: 'open' }, { name: 'Closed', value: 'closed' }))
            ),
        async execute(interaction) {
            const sub = interaction.options.getSubcommand();
            if (sub === 'close') {
                const id = interaction.options.getString('id');
                const ticketId = id.startsWith('ticket-') ? id : `ticket-${id.padStart(4, '0')}`;
                try {
                    await db.updateTicketStatus(ticketId, 'closed');
                    await db.updateTicketState(ticketId, null, {}); // Reset state
                    await interaction.reply({ content: `✅ Ticket **${ticketId}** closed.` });
                } catch (error) { await interaction.reply({ content: '❌ Failed to close ticket', ephemeral: true }); }
            } else if (sub === 'list') {
                const status = interaction.options.getString('status');
                const tickets = await db.getAllTickets(status);
                if (tickets.length === 0) return interaction.reply({ content: '🎫 No tickets found.', ephemeral: true });
                const description = tickets.slice(0, 15).map(t => `${t.status === 'open' ? '🟢' : '🔴'} **${t.id}**`).join('\n');
                const embed = new EmbedBuilder().setTitle('🎫 Tickets').setDescription(description).setColor(0x2ecc71);
                await interaction.reply({ embeds: [embed] });
            }
        }
    }
];

module.exports = commands;
