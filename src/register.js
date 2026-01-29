require('dotenv').config();
const { REST, Routes } = require('discord.js');
const commandsList = require('./commands');

const commandsData = commandsList.map(command => command.data.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log('🚀 Starting slash command registration...');

        if (!process.env.DISCORD_CLIENT_ID) {
            console.error('❌ Error: DISCORD_CLIENT_ID is not set in environment variables.');
            return;
        }

        if (process.env.DISCORD_GUILD_ID) {
            console.log(`📡 Registering commands for Guild ID: ${process.env.DISCORD_GUILD_ID}`);
            await rest.put(
                Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.DISCORD_GUILD_ID),
                { body: commandsData }
            );
            console.log('✅ Successfully registered commands for the specific guild!');
        } else {
            console.log('📡 Registering commands GLOBALLY (may take up to 1 hour to appear)...');
            await rest.put(
                Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
                { body: commandsData }
            );
            console.log('✅ Successfully registered commands globally!');
        }
        
        console.log('✨ If you still don\'t see the commands, restart your Discord client.');
    } catch (error) {
        console.error('❌ Registration failed:', error);
    }
})();
