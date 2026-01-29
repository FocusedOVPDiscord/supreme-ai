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
                sub.setName('top')
                    .setDescription('Show most used training responses')
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
                
                try {
                    db.addTraining(question, answer, category);
                    
                    const embed = new EmbedBuilder()
                        .setTitle('✅ Training Added')
                        .setColor(0x00ff00)
                        .addFields(
                            { name: '❓ Question', value: question },
                            { name: '💬 Answer', value: answer },
                            { name: '📁 Category', value: category }
                        )
                        .setFooter({ text: 'The AI will now use this response when similar questions are asked' })
                        .setTimestamp();
                    
                    await interaction.reply({ embeds: [embed] });
                } catch (error) {
                    await interaction.reply({ content: '❌ Failed to add training data', ephemeral: true });
                }
                
            } else if (sub === 'list') {
                const category = interaction.options.getString('category');
                const data = category ? db.getTrainingByCategory(category) : db.getAllTraining();
                
                if (data.length === 0) {
                    return interaction.reply({ content: '📚 No training data found.', ephemeral: true });
                }
                
                const pages = [];
                for (let i = 0; i < data.length; i += 10) {
                    const chunk = data.slice(i, i + 10);
                    const description = chunk.map(item => 
                        `**${item.id}.** [${item.category}] ${item.query.substring(0, 40)}${item.query.length > 40 ? '...' : ''}\n└ Used ${item.usage_count} times`
                    ).join('\n\n');
                    
                    const embed = new EmbedBuilder()
                        .setTitle('📚 Training Data')
                        .setDescription(description)
                        .setColor(0x3498db)
                        .setFooter({ text: `Page ${Math.floor(i / 10) + 1} • Total: ${data.length} entries` })
                        .setTimestamp();
                    
                    pages.push(embed);
                }
                
                await interaction.reply({ embeds: [pages[0]] });
                
            } else if (sub === 'delete') {
                const id = interaction.options.getInteger('id');
                
                try {
                    db.deleteTraining(id);
                    await interaction.reply({ content: `✅ Deleted training entry **#${id}**` });
                } catch (error) {
                    await interaction.reply({ content: '❌ Failed to delete entry', ephemeral: true });
                }
                
            } else if (sub === 'top') {
                const topData = db.getTopTraining(10);
                
                if (topData.length === 0) {
                    return interaction.reply({ content: '📊 No training data found.', ephemeral: true });
                }
                
                const description = topData.map((item, idx) => 
                    `**${idx + 1}.** ${item.query.substring(0, 50)}${item.query.length > 50 ? '...' : ''}\n└ Used **${item.usage_count}** times`
                ).join('\n\n');
                
                const embed = new EmbedBuilder()
                    .setTitle('📊 Most Used Responses')
                    .setDescription(description)
                    .setColor(0xf39c12)
                    .setTimestamp();
                
                await interaction.reply({ embeds: [embed] });
                
            } else if (sub === 'search') {
                const query = interaction.options.getString('query');
                const result = db.searchSimilar(query);
                
                if (!result) {
                    return interaction.reply({ content: '🔍 No matching training data found.', ephemeral: true });
                }
                
                const embed = new EmbedBuilder()
                    .setTitle('🔍 Search Result')
                    .setColor(0x9b59b6)
                    .addFields(
                        { name: 'ID', value: result.id.toString(), inline: true },
                        { name: 'Category', value: result.category, inline: true },
                        { name: 'Usage', value: result.usage_count.toString(), inline: true },
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
                    .addStringOption(opt => opt.setName('id').setDescription('Ticket ID (e.g., 0001 or ticket-0001)').setRequired(true))
            )
            .addSubcommand(sub =>
                sub.setName('history')
                    .setDescription('View ticket conversation history')
                    .addStringOption(opt => opt.setName('id').setDescription('Ticket ID').setRequired(true))
            )
            .addSubcommand(sub =>
                sub.setName('list')
                    .setDescription('List all tickets')
                    .addStringOption(opt => 
                        opt.setName('status')
                            .setDescription('Filter by status')
                            .addChoices(
                                { name: 'Open', value: 'open' },
                                { name: 'Closed', value: 'closed' }
                            )
                            .setRequired(false)
                    )
            ),
        async execute(interaction) {
            const sub = interaction.options.getSubcommand();
            
            if (sub === 'close') {
                const id = interaction.options.getString('id');
                const ticketId = id.startsWith('ticket-') ? id : `ticket-${id.padStart(4, '0')}`;
                
                try {
                    db.updateTicketStatus(ticketId, 'closed');
                    
                    const embed = new EmbedBuilder()
                        .setTitle('✅ Ticket Closed')
                        .setDescription(`Ticket **${ticketId}** has been marked as closed.`)
                        .setColor(0xe74c3c)
                        .setTimestamp();
                    
                    await interaction.reply({ embeds: [embed] });
                } catch (error) {
                    await interaction.reply({ content: '❌ Failed to close ticket', ephemeral: true });
                }
                
            } else if (sub === 'history') {
                const id = interaction.options.getString('id');
                const ticketId = id.startsWith('ticket-') ? id : `ticket-${id.padStart(4, '0')}`;
                
                await interaction.deferReply();
                
                const history = db.getAllConversations(ticketId);
                
                if (history.length === 0) {
                    return interaction.editReply({ content: '📭 No conversation history found for this ticket.' });
                }
                
                const messages = history.slice(0, 20).map(msg => {
                    const timestamp = new Date(msg.created_at).toLocaleString();
                    const author = msg.is_ai ? '🤖 AI' : '👤 User';
                    return `**${author}** (${timestamp})\n${msg.message.substring(0, 200)}${msg.message.length > 200 ? '...' : ''}`;
                }).join('\n\n');
                
                const embed = new EmbedBuilder()
                    .setTitle(`📜 Ticket History: ${ticketId}`)
                    .setDescription(messages || 'No messages')
                    .setColor(0x3498db)
                    .setFooter({ text: `Showing ${Math.min(history.length, 20)} of ${history.length} messages` })
                    .setTimestamp();
                
                await interaction.editReply({ embeds: [embed] });
                
            } else if (sub === 'list') {
                const status = interaction.options.getString('status');
                const tickets = db.getAllTickets(status);
                
                if (tickets.length === 0) {
                    return interaction.reply({ content: '🎫 No tickets found.', ephemeral: true });
                }
                
                const description = tickets.slice(0, 15).map(ticket => {
                    const statusEmoji = ticket.status === 'open' ? '🟢' : '🔴';
                    const created = new Date(ticket.created_at).toLocaleDateString();
                    return `${statusEmoji} **${ticket.id}** - ${ticket.category} (${created})`;
                }).join('\n');
                
                const embed = new EmbedBuilder()
                    .setTitle('🎫 Tickets')
                    .setDescription(description)
                    .setColor(0x2ecc71)
                    .setFooter({ text: `Showing ${Math.min(tickets.length, 15)} of ${tickets.length} tickets` })
                    .setTimestamp();
                
                await interaction.reply({ embeds: [embed] });
            }
        }
    },
    {
        data: new SlashCommandBuilder()
            .setName('check_perms')
            .setDescription('Check bot permissions in the current channel'),
        async execute(interaction) {
            const permissions = interaction.channel.permissionsFor(interaction.client.user);
            const required = ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'EmbedLinks', 'AttachFiles'];
            
            const results = required.map(perm => {
                return `${permissions.has(perm) ? '✅' : '❌'} **${perm}**`;
            }).join('\n');
            
            const embed = new EmbedBuilder()
                .setTitle('🔐 Permission Check')
                .setDescription(`Permissions for **${interaction.client.user.tag}** in ${interaction.channel}:\n\n${results}`)
                .setColor(0x3498db)
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    },
    {
        data: new SlashCommandBuilder()
            .setName('test')
            .setDescription('Test AI response generation')
            .addStringOption(opt => opt.setName('message').setDescription('Test message to send to AI').setRequired(true)),
        async execute(interaction) {
            await interaction.deferReply();
            
            const message = interaction.options.getString('message');
            
            try {
                const response = await ai.generateResponse(message);
                
                if (response) {
                    const embed = new EmbedBuilder()
                        .setTitle('🧪 AI Test Response')
                        .setColor(0x3498db)
                        .addFields(
                            { name: '📥 Input', value: message },
                            { name: '📤 Output', value: response }
                        )
                        .setTimestamp();
                    
                    await interaction.editReply({ embeds: [embed] });
                } else {
                    await interaction.editReply({ content: '❌ AI failed to generate a response. Check API key and status.' });
                }
            } catch (error) {
                console.error('Test command error:', error);
                await interaction.editReply({ content: '❌ Error testing AI' });
            }
        }
    }
];

module.exports = commands;
