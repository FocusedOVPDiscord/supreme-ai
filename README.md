# Supreme AI Discord Bot

A powerful Discord bot with AI-powered ticket support, training system, and conversation management using Groq API.

## 🌟 Features

| Feature | Description | Status |
|---------|-------------|--------|
| **Ticket Management** | Automatically detect and respond in ticket channels created by any bot | ✅ |
| **AI Responses** | Intelligent responses using Groq's Llama 3 model | ✅ |
| **Training System** | `/train` command to teach the bot custom responses | ✅ |
| **Memory** | Persistent SQLite database with conversation history | ✅ |
| **Knowledge Bases** | Organize training data by category and topic | ✅ |
| **Admin Commands** | Status, testing, ticket management, statistics | ✅ |
| **Privacy** | All conversation data stored locally in SQLite | ✅ |
| **Scalable** | Handle multiple servers with separate training data | ✅ |

## 🚀 Quick Start

### Prerequisites

- Node.js 18.0.0 or higher
- Discord Bot Token ([Get one here](https://discord.com/developers/applications))
- Groq API Key ([Get one here](https://console.groq.com))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/FocusedOVPDiscord/supreme-ai.git
   cd supreme-ai
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   DISCORD_TOKEN=your_discord_bot_token_here
   DISCORD_CLIENT_ID=your_discord_client_id_here
   DISCORD_GUILD_ID=your_guild_id_here_optional
   GROQ_API_KEY=your_groq_api_key_here
   ```

4. **Start the bot**
   ```bash
   npm start
   ```

## 📚 Commands

### `/status`
Check bot health, AI status, and statistics.

**Example:**
```
/status
```

### `/train`
Manage AI training data to teach custom responses.

**Subcommands:**
- `/train add` - Add new training data
  ```
  /train add question:"How do I reset my password?" answer:"Click on 'Forgot Password' on the login page." category:"account"
  ```
- `/train list` - List all training entries
- `/train delete` - Delete a training entry by ID
- `/train top` - Show most used responses
- `/train search` - Search for training data

### `/ticket`
Manage support tickets.

**Subcommands:**
- `/ticket close` - Close a ticket
  ```
  /ticket close id:"0001"
  ```
- `/ticket history` - View conversation history
- `/ticket list` - List all tickets (filter by status)

### `/test`
Test AI response generation.

**Example:**
```
/test message:"Hello, how can you help me?"
```

## 🎫 Ticket System

The bot automatically detects ticket channels with these patterns:
- `ticket-0001`, `ticket-1234`
- `ticket_0001`
- `0001-ticket`
- `support-0001`
- `help-0001`
- Any channel with "ticket" in the name

### How it works:

1. User sends a message in a ticket channel
2. Bot searches for matching trained responses
3. If found, uses the trained response
4. If not found, generates AI response using Groq
5. Stores conversation in database for history

## 🧠 Training System

The training system allows you to teach the bot specific responses:

1. **Add Training Data**
   ```
   /train add question:"What are your hours?" answer:"We're open 24/7!" category:"general"
   ```

2. **Bot Learns**
   - Exact matches are prioritized
   - Partial matches are used if no exact match
   - Word-based fuzzy matching for flexibility

3. **Usage Tracking**
   - Bot tracks how often each response is used
   - View most popular responses with `/train top`

## 🔧 Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DISCORD_TOKEN` | ✅ | Your Discord bot token |
| `DISCORD_CLIENT_ID` | ✅ | Your Discord application client ID |
| `DISCORD_GUILD_ID` | ❌ | Guild ID for faster command sync (optional) |
| `GROQ_API_KEY` | ✅ | Your Groq API key for AI responses |
| `DB_PATH` | ❌ | Custom database path (default: `./data/bot.db`) |
| `PORT` | ❌ | Port for health check server (default: 10000) |

### Database

The bot uses SQLite for data storage:
- **Location:** `./data/bot.db`
- **Tables:** `training`, `tickets`, `conversations`
- **Automatic:** Database is created on first run

## 📊 Statistics

View bot statistics with `/status`:
- Training entries count
- Open tickets count
- Total messages processed
- Bot uptime

## 🛠️ Development

### Project Structure

```
supreme-ai/
├── src/
│   ├── index.js           # Main bot file
│   ├── commands/
│   │   └── index.js       # Slash commands
│   └── utils/
│       ├── ai.js          # Groq AI integration
│       └── database.js    # SQLite database functions
├── data/
│   └── bot.db            # SQLite database (auto-created)
├── package.json
├── .env                  # Environment variables (create this)
└── README.md
```

### Adding New Commands

Edit `src/commands/index.js` and add a new command object:

```javascript
{
    data: new SlashCommandBuilder()
        .setName('mycommand')
        .setDescription('My custom command'),
    async execute(interaction) {
        await interaction.reply('Hello!');
    }
}
```

### Customizing AI Behavior

Edit `src/utils/ai.js` to modify:
- System prompt
- Model selection
- Temperature and parameters
- Response formatting

## 🐛 Troubleshooting

### Bot not responding in tickets
- Check channel name matches ticket patterns
- Verify bot has "Read Messages" and "Send Messages" permissions
- Check console logs for errors

### AI responses not working
- Verify `GROQ_API_KEY` is set correctly
- Run `/status` to check AI health
- Test with `/test message:"hello"`

### Training data not saving
- Check database file permissions
- Verify `data/` directory exists
- Check console for database errors

## 📝 License

MIT License - See LICENSE file for details

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📞 Support

For issues and questions:
- Open an issue on GitHub
- Check existing issues for solutions
- Use `/status` command to diagnose problems

## 🔐 Security

- Never commit your `.env` file
- Keep your API keys secret
- Use environment variables for sensitive data
- Regularly update dependencies

## 🎯 Roadmap

- [ ] Multi-language support
- [ ] Advanced analytics dashboard
- [ ] Custom AI model fine-tuning
- [ ] Webhook integrations
- [ ] Auto-moderation features
- [ ] Voice channel support

---

**Made with ❤️ by the Supreme AI Team**

Powered by [Groq](https://groq.com) • Built with [Discord.js](https://discord.js.org)
