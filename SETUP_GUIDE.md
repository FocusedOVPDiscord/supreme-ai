# Supreme AI Setup Guide

Complete guide to set up and deploy your Supreme AI Discord bot.

## 📋 Prerequisites

Before you begin, make sure you have:

- **Node.js 18+** installed on your system
- A **Discord Bot Token** (create one at [Discord Developer Portal](https://discord.com/developers/applications))
- A **Groq API Key** (get one free at [Groq Console](https://console.groq.com))
- Basic knowledge of Discord bot setup

## 🚀 Step-by-Step Setup

### 1. Clone the Repository

```bash
git clone https://github.com/FocusedOVPDiscord/supreme-ai.git
cd supreme-ai
```

### 2. Install Dependencies

```bash
npm install
```

This will install:
- `discord.js` - Discord API wrapper
- `groq-sdk` - Groq AI SDK
- `better-sqlite3` - SQLite database
- `dotenv` - Environment variable management

### 3. Create Discord Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application"
3. Give it a name (e.g., "Supreme AI")
4. Go to the "Bot" section
5. Click "Add Bot"
6. **Copy the Token** (you'll need this)
7. Enable these **Privileged Gateway Intents**:
   - ✅ Server Members Intent
   - ✅ Message Content Intent
8. Go to "OAuth2" → "URL Generator"
9. Select scopes:
   - ✅ `bot`
   - ✅ `applications.commands`
10. Select bot permissions:
    - ✅ Read Messages/View Channels
    - ✅ Send Messages
    - ✅ Send Messages in Threads
    - ✅ Manage Messages
    - ✅ Read Message History
    - ✅ Use Slash Commands
11. Copy the generated URL and invite the bot to your server

### 4. Get Groq API Key

1. Go to [Groq Console](https://console.groq.com)
2. Sign up or log in
3. Navigate to API Keys section
4. Click "Create API Key"
5. **Copy the API key** (you'll need this)

### 5. Configure Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` and add your credentials:

```env
# Discord Configuration
DISCORD_TOKEN=your_discord_bot_token_here
DISCORD_CLIENT_ID=your_discord_client_id_here
DISCORD_GUILD_ID=your_guild_id_optional

# Groq AI Configuration
GROQ_API_KEY=your_groq_api_key_here

# Optional Configuration
DB_PATH=./data/bot.db
PORT=10000
```

**How to get these values:**

- **DISCORD_TOKEN**: From Discord Developer Portal → Your App → Bot → Token
- **DISCORD_CLIENT_ID**: From Discord Developer Portal → Your App → General Information → Application ID
- **DISCORD_GUILD_ID**: Right-click your server in Discord → Copy Server ID (enable Developer Mode in Discord settings first)
- **GROQ_API_KEY**: From Groq Console → API Keys

### 6. Test the Setup

Run the test scripts to verify everything works:

```bash
# Test database functionality
node test-database.js

# Test AI integration (requires GROQ_API_KEY)
node test-ai.js
```

Expected output:
```
✅ Database initialized
✅ Training data added successfully
✅ Groq API is healthy and accessible
```

### 7. Start the Bot

```bash
npm start
```

You should see:
```
✅ Logged in as Supreme AI#1234
✅ Synced commands to guild 123456789
📊 Connected to 1 guilds
```

## 🎯 Initial Configuration

### Add Training Data

Once the bot is running, use the `/train` command to teach it responses:

```
/train add question:"How do I reset my password?" answer:"Click 'Forgot Password' on the login page."
/train add question:"What are your hours?" answer:"We're available 24/7!"
/train add question:"How do I contact support?" answer:"Create a ticket or email support@example.com"
```

### Test the Bot

1. **Check Status**: `/status` - Verify bot is healthy
2. **Test AI**: `/test message:"Hello!"` - Test AI response generation
3. **Create a Ticket Channel**: Name it `ticket-0001` or similar
4. **Send a Message**: The bot should automatically respond

## 🎫 Ticket Channel Setup

The bot automatically detects these ticket channel patterns:

- `ticket-0001`, `ticket-1234`
- `ticket_0001`
- `0001-ticket`
- `support-0001`
- `help-0001`
- Any channel with "ticket" in the name

**Recommended Setup:**

1. Use a ticket bot (like Ticket Tool, Ticket Bot, etc.)
2. The bot will automatically detect and respond in ticket channels
3. No additional configuration needed!

## 🔧 Advanced Configuration

### Custom Database Location

```env
DB_PATH=/custom/path/to/database.db
```

### Guild-Specific Commands (Faster Sync)

```env
DISCORD_GUILD_ID=your_server_id_here
```

This makes commands sync instantly to your server instead of globally (which takes 1 hour).

### Change AI Model

Edit `src/utils/ai.js` and change the model:

```javascript
model: "llama3-70b-8192",  // More powerful model
// or
model: "mixtral-8x7b-32768",  // Longer context
```

Available models:
- `llama3-8b-8192` (default, fast)
- `llama3-70b-8192` (more accurate)
- `mixtral-8x7b-32768` (long context)
- `gemma-7b-it` (Google's model)

## 🐛 Troubleshooting

### Bot doesn't respond to commands

**Solution:**
1. Check bot has "Use Application Commands" permission
2. Wait 1 hour for global commands to sync (or use DISCORD_GUILD_ID)
3. Kick and re-invite the bot with the correct permissions

### Bot doesn't respond in tickets

**Solution:**
1. Verify channel name matches ticket patterns
2. Check bot has "Read Messages" and "Send Messages" permissions
3. Look at console logs for errors

### AI responses not working

**Solution:**
1. Verify GROQ_API_KEY is correct in `.env`
2. Run `/status` to check AI health
3. Test with `/test message:"hello"`
4. Check Groq API quota at console.groq.com

### Database errors

**Solution:**
1. Delete `data/bot.db` and restart (will reset all data)
2. Check file permissions on `data/` directory
3. Run `node test-database.js` to verify

### "Module not found" errors

**Solution:**
```bash
rm -rf node_modules package-lock.json
npm install
```

## 📊 Monitoring

### Check Bot Status

```
/status
```

Shows:
- AI health
- Training entries count
- Open tickets
- Total messages processed

### View Logs

The bot logs important events to console:
- Message processing
- AI responses
- Database operations
- Errors and warnings

### Database Management

View database contents:
```bash
sqlite3 data/bot.db
```

SQL commands:
```sql
-- View all training data
SELECT * FROM training;

-- View all tickets
SELECT * FROM tickets;

-- View conversation history
SELECT * FROM conversations WHERE ticket_id = 'ticket-0001';
```

## 🚀 Deployment Options

### Option 1: Local Machine

Just run `npm start` and keep the terminal open.

### Option 2: VPS (Recommended)

1. Get a VPS (DigitalOcean, Linode, AWS, etc.)
2. Install Node.js
3. Clone repository
4. Set up `.env`
5. Use PM2 to keep bot running:

```bash
npm install -g pm2
pm2 start src/index.js --name supreme-ai
pm2 save
pm2 startup
```

### Option 3: Docker

```bash
docker build -t supreme-ai .
docker run -d --env-file .env supreme-ai
```

### Option 4: Cloud Platforms

- **Heroku**: Add Procfile with `worker: node src/index.js`
- **Railway**: Connect GitHub repo, add environment variables
- **Render**: Create new Web Service, add environment variables
- **Replit**: Import from GitHub, add secrets

## 🔐 Security Best Practices

1. **Never commit `.env` file** - It's in `.gitignore`
2. **Regenerate tokens** if accidentally exposed
3. **Use environment variables** for all secrets
4. **Restrict bot permissions** to minimum required
5. **Regularly update dependencies**: `npm update`
6. **Monitor API usage** on Groq Console

## 📈 Scaling

### For Multiple Servers

The bot automatically handles multiple servers with:
- Separate training data per server (if needed)
- Shared AI responses
- Independent ticket systems

### For High Traffic

1. Increase Groq API rate limits
2. Use caching for common responses
3. Implement rate limiting per user
4. Use Redis for distributed caching

## 🆘 Getting Help

If you encounter issues:

1. Check console logs for error messages
2. Run test scripts: `node test-database.js` and `node test-ai.js`
3. Verify all environment variables are set correctly
4. Check Discord bot permissions
5. Open an issue on GitHub with:
   - Error message
   - Steps to reproduce
   - Console logs (remove sensitive data)

## 📚 Additional Resources

- [Discord.js Guide](https://discordjs.guide/)
- [Groq Documentation](https://console.groq.com/docs)
- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

---

**Need more help?** Open an issue on GitHub or check the README.md file.
