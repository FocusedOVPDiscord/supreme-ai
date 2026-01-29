# Discord AI Ticket Bot - Setup Guide

Complete guide to set up and run the Discord AI Ticket Bot locally.

## Prerequisites

- **Python 3.9+** - [Download](https://www.python.org/downloads/)
- **Ollama** - [Download](https://ollama.ai)
- **Discord Server** - Where you'll run the bot
- **Discord Bot Token** - From Discord Developer Portal
- **4GB+ RAM** - For running the LLM model
- **GPU (Optional)** - Recommended for faster responses

## Step 1: Install Ollama

### On Windows/Mac
1. Download Ollama from [https://ollama.ai](https://ollama.ai)
2. Run the installer
3. Ollama will start automatically and run on `http://localhost:11434`

### On Linux
```bash
curl -fsSL https://ollama.ai/install.sh | sh
ollama serve
```

## Step 2: Download and Setup LLM Model

Ollama requires a model to run. We recommend **Llama 3** or **Mistral 7B** for balance between quality and speed.

### Download Llama 3 (Recommended)
```bash
ollama pull llama3
```

### Alternative: Download Mistral 7B (Faster)
```bash
ollama pull mistral
```

### Alternative: Download Neural Chat (Optimized for chat)
```bash
ollama pull neural-chat
```

**Note:** First download takes 5-20 minutes depending on your internet speed. Models are 4-7GB.

## Step 3: Create Discord Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application"
3. Name your bot (e.g., "AI Ticket Bot")
4. Go to "Bot" section and click "Add Bot"
5. Under "TOKEN", click "Copy" to copy your bot token
6. **Keep this token secret!** You'll need it in Step 5

### Configure Bot Permissions
1. Go to "OAuth2" → "URL Generator"
2. Select scopes: `bot`
3. Select permissions:
   - `Read Messages/View Channels`
   - `Send Messages`
   - `Create Public Threads`
   - `Create Private Threads`
   - `Send Messages in Threads`
   - `Manage Threads`
   - `Manage Channels`
4. Copy the generated URL and open it to invite bot to your server

## Step 4: Setup Project

### Clone or Extract Files
```bash
# If you have git
git clone <repository-url>
cd discord-ai-ticket-bot

# Or extract the provided zip file
```

### Create Virtual Environment
```bash
# On Windows
python -m venv venv
venv\Scripts\activate

# On Mac/Linux
python3 -m venv venv
source venv/bin/activate
```

### Install Dependencies
```bash
pip install -r requirements.txt
```

## Step 5: Configure Environment

### Create `.env` file
Create a file named `.env` in the `bot/` directory:

```bash
cd bot
```

Create `.env` with your configuration:
```
# Discord Bot Configuration
DISCORD_TOKEN=your_bot_token_here
DISCORD_GUILD_ID=your_server_id_here

# Ollama Configuration
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3

# Bot Settings
BOT_PREFIX=!
LOG_LEVEL=INFO

# Memory & Training
DB_PATH=./data/training.db
SIMILARITY_THRESHOLD=0.7
MAX_CONTEXT_LENGTH=2000

# Features
ENABLE_AUTO_RESPONSE=true
ENABLE_TRAINING=true
RESPONSE_TIMEOUT=30
```

### Find Your Server ID
1. In Discord, enable Developer Mode (User Settings → Advanced → Developer Mode)
2. Right-click your server name and select "Copy Server ID"
3. Paste this in `DISCORD_GUILD_ID`

## Step 6: Run the Bot

### Start Ollama (if not already running)
```bash
ollama serve
```

### In a new terminal, start the bot
```bash
cd bot
python run.py
```

You should see:
```
✓ Bot logged in as AI Ticket Bot#1234
✓ Ollama connection successful
✓ Database: 0 training entries, 0 conversations, 0 open tickets
```

## Step 7: Setup Bot in Discord

1. In your Discord server, use `/setup` command
2. Select the forum channel for tickets
3. Select the staff role
4. Use `/ticket_panel` to create the ticket creation interface

## Usage

### For Users
1. Click a category button on the ticket panel
2. A new ticket thread is created
3. Ask your question
4. The bot responds automatically with trained or AI-generated answers

### For Admins

#### Train the Bot
```
/train question:"How do I reset my password?" answer:"Go to settings.com/reset" category:"account"
```

#### View Training Data
```
/training_list
```

#### Check Status
```
/status
```

#### Test AI
```
/test_ai prompt:"What is your name?"
```

#### Export Training Data
```
/export_training
```

## Troubleshooting

### Bot doesn't respond
1. Check if Ollama is running: `http://localhost:11434/api/tags`
2. Check bot logs: `logs/bot.log`
3. Verify DISCORD_TOKEN is correct
4. Make sure bot has permissions in the channel

### Ollama connection failed
```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# If not, start Ollama
ollama serve

# Check if model is downloaded
ollama list

# If not, download it
ollama pull llama3
```

### Bot is slow
- Reduce `MAX_CONTEXT_LENGTH` in `.env`
- Use a smaller model (Mistral 7B instead of Llama 3)
- Increase `RESPONSE_TIMEOUT` if responses are timing out
- Ensure you have enough RAM (4GB minimum)

### Database errors
```bash
# Reset database (WARNING: deletes all training data)
rm data/training.db
```

## Performance Tips

1. **Use GPU** - If you have NVIDIA GPU, Ollama can use CUDA for faster inference
2. **Smaller Models** - Mistral 7B is faster than Llama 3
3. **Batch Training** - Train multiple Q&A pairs during off-peak hours
4. **Monitor Resources** - Watch CPU/RAM usage and adjust settings

## Advanced Configuration

### Change Model
Edit `.env`:
```
OLLAMA_MODEL=mistral
```

Then restart the bot.

### Adjust Response Quality
- Lower `SIMILARITY_THRESHOLD` (0.5-0.7) for more aggressive matching
- Increase `MAX_CONTEXT_LENGTH` (2000-5000) for better context
- Adjust `temperature` in code for more/less creative responses

### Database Backup
```bash
# Backup training data
cp data/training.db data/training.db.backup

# Export to JSON
# Use /export_training command in Discord
```

## Security Notes

- **Never share your DISCORD_TOKEN** - Treat it like a password
- **Keep `.env` file private** - Don't commit to git
- **Use strong permissions** - Only give bot necessary permissions
- **Audit training data** - Review what the bot learns
- **Monitor logs** - Check `logs/bot.log` for suspicious activity

## Support & Resources

- **Discord.py Documentation**: https://discordpy.readthedocs.io/
- **Ollama Documentation**: https://github.com/ollama/ollama
- **Discord Developer Portal**: https://discord.com/developers/

## Next Steps

1. Train the bot with your support responses
2. Monitor performance and adjust settings
3. Consider backing up training data regularly
4. Explore advanced features like custom models

---

**Happy ticketing! 🎫**
