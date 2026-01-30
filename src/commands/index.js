const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const db = require('../utils/database');
const ai = require('../utils/ai');

const commands = [
    {
        data: new SlashCommandBuilder()
            .setName('status')
            .setDescription('Check bot and AI status'),
        async execute(interaction) {
            await interaction.deferReply();
            const stats = db.getStats();
            const aiReady = await ai.checkHealth();
            const embed = new EmbedBuilder()
                .setTitle('🤖 Supreme AI Status')
                .setColor(aiReady ? 0x00ff00 : 0xff0000)
                .addFields(
                    { name: '🔌 Groq AI', value: aiReady ? '✅ Online' : '❌ Offline', inline: true },
                    { name: '📚 Training Entries', value: stats.trainingCount.toString(), inline: true },
                    { name: '🎫 Open Tickets', value: stats.ticketCount.toString(), inline: true },
                    { name: '📊 Total Tickets', value: stats.totalTickets.toString(), inline: true },
                    { name: '💬 Total Messages', value: stats.conversationCount.toString(), inline: true },
                    { name: '⏱️ Uptime', value: `${Math.floor(process.uptime() / 60)} minutes`, inline: true }
                )
                .setFooter({ text: 'Supreme AI • Powered by Groq' })
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
                sub.setName('add')
                    .setDescription('Add training data to teach the AI')
            )
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
            
            if (sub === 'add') {
                const modal = new ModalBuilder()
                    .setCustomId('train_ai_modal')
                    .setTitle('Train Your AI');

                const trainingInput = new TextInputBuilder()
                    .setCustomId('train_message')
                    .setLabel('Training Message')
                    .setStyle(TextInputStyle.Paragraph)
                    .setPlaceholder("Enter information or examples you want the AI to learn. For example: 'When users ask about pricing, explain that our basic plan is $9.99/month...'")
                    .setMaxLength(2000)
                    .setRequired(true);

                modal.addComponents(new ActionRowBuilder().addComponents(trainingInput));

                await interaction.showModal(modal);
                
            } else if (sub === 'list') {
                const category = interaction.options.getString('category');
                const data = category ? db.getTrainingByCategory(category) : db.getAllTraining();
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
                    db.deleteTraining(id);
                    await interaction.reply({ content: `✅ Deleted training entry **#${id}**` });
                } catch (error) {
                    await interaction.reply({ content: '❌ Failed to delete entry', ephemeral: true });
                }
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
                    db.updateTicketStatus(ticketId, 'closed');
                    db.updateTicketState(ticketId, null, {}); // Reset state
                    await interaction.reply({ content: `✅ Ticket **${ticketId}** closed.` });
                } catch (error) { await interaction.reply({ content: '❌ Failed to close ticket', ephemeral: true }); }
            } else if (sub === 'list') {
                const status = interaction.options.getString('status');
                const tickets = db.getAllTickets(status);
                if (tickets.length === 0) return interaction.reply({ content: '🎫 No tickets found.', ephemeral: true });
                const description = tickets.slice(0, 15).map(t => `${t.status === 'open' ? '🟢' : '🔴'} **${t.id}**`).join('\n');
                const embed = new EmbedBuilder().setTitle('🎫 Tickets').setDescription(description).setColor(0x2ecc71);
                await interaction.reply({ embeds: [embed] });
            }
        }
    }
];

module.exports = commands;
