const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
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
                    .addStringOption(opt => opt.setName('question').setDescription('The question or trigger phrase').setRequired(true))
                    .addStringOption(opt => opt.setName('answer').setDescription('The response the AI should give').setRequired(true))
                    .addStringOption(opt => opt.setName('category').setDescription('Category (e.g., billing, technical, general)').setRequired(false))
                    .addIntegerOption(opt => opt.setName('next_step').setDescription('ID of the next step in the flow (optional)').setRequired(false))
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
            )
            .addSubcommand(sub =>
                sub.setName('search')
                    .setDescription('Search for training data')
                    .addStringOption(opt => opt.setName('query').setDescription('Search query').setRequired(true))
            ),
        async execute(interaction) {
            const sub = interaction.options.getSubcommand();
            
            if (sub === 'add') {
                const question = interaction.options.getString('question');
                const answer = interaction.options.getString('answer');
                const category = interaction.options.getString('category') || 'general';
                const nextStep = interaction.options.getInteger('next_step');
                
                try {
                    const result = db.addTraining(question, answer, category, nextStep);
                    const embed = new EmbedBuilder()
                        .setTitle('✅ Training Added')
                        .setColor(0x00ff00)
                        .addFields(
                            { name: '🆔 ID', value: result.lastInsertRowid.toString(), inline: true },
                            { name: '📁 Category', value: category, inline: true },
                            { name: '🔗 Next Step ID', value: nextStep ? nextStep.toString() : 'None', inline: true },
                            { name: '❓ Question', value: question },
                            { name: '💬 Answer', value: answer }
                        )
                        .setFooter({ text: 'Use the ID to link steps for multi-step flows!' })
                        .setTimestamp();
                    await interaction.reply({ embeds: [embed] });
                } catch (error) {
                    await interaction.reply({ content: '❌ Failed to add training data', ephemeral: true });
                }
                
            } else if (sub === 'list') {
                const category = interaction.options.getString('category');
                const data = category ? db.getTrainingByCategory(category) : db.getAllTraining();
                if (data.length === 0) return interaction.reply({ content: '📚 No training data found.', ephemeral: true });
                
                const chunk = data.slice(0, 10);
                const description = chunk.map(item => 
                    `**#${item.id}** [${item.category}] ${item.query.substring(0, 40)}${item.query.length > 40 ? '...' : ''}\n└ Next Step: ${item.next_step_id || 'None'}`
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
                
            } else if (sub === 'search') {
                const query = interaction.options.getString('query');
                const result = db.searchSimilar(query);
                if (!result) return interaction.reply({ content: '🔍 No matching training data found.', ephemeral: true });
                
                const embed = new EmbedBuilder()
                    .setTitle('🔍 Search Result')
                    .setColor(0x9b59b6)
                    .addFields(
                        { name: 'ID', value: result.id.toString(), inline: true },
                        { name: 'Next Step', value: result.next_step_id ? result.next_step_id.toString() : 'None', inline: true },
                        { name: 'Question', value: result.query },
                        { name: 'Answer', value: result.response }
                    )
                    .setTimestamp();
                await interaction.reply({ embeds: [embed] });
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
                    db.updateTicketState(ticketId, null); // Clear flow state
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
