# Quick Start Guide - 5 Minutes to Running Bot

Get your Discord AI Ticket Bot running in just 5 minutes.

## Prerequisites (Install First)

1. **Python 3.9+** - https://www.python.org/downloads/
2. **Ollama** - https://ollama.ai

## Step 1: Download Model (2 minutes)

Open terminal/command prompt and run:

```bash
ollama pull llama3
```

This downloads the AI model (~4GB). First time only.

## Step 2: Get Discord Bot Token (1 minute)

1. Go to https://discord.com/developers/applications
2. Click "New Application"
3. Name it "AI Ticket Bot"
4. Go to "Bot" tab → "Add Bot"
5. Click "Copy" under TOKEN
6. Keep this token safe!

## Step 3: Setup Project (1 minute)

```bash
# Navigate to bot directory
cd discord-ai-ticket-bot/bot

# Create .env file with your token
# On Windows:
echo DISCORD_TOKEN=your_token_here > .env
echo DISCORD_GUILD_ID=0 >> .env
echo OLLAMA_URL=http://localhost:11434 >> .env
echo OLLAMA_MODEL=llama3 >> .env

# On Mac/Linux:
cat > .env << EOF
DISCORD_TOKEN=your_token_here
DISCORD_GUILD_ID=0
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3
ENABLE_AUTO_RESPONSE=true
ENABLE_TRAINING=true
EOF
```

Replace `your_token_here` with your actual token!

## Step 4: Install Dependencies (1 minute)

```bash
# Go back to project root
cd ..

# Install Python packages
pip install -r requirements.txt
```

## Step 5: Run Bot (1 minute)

**Terminal 1 - Start Ollama:**
```bash
ollama serve
```

Wait for: `Listening on 127.0.0.1:11434`

**Terminal 2 - Start Bot:**
```bash
cd discord-ai-ticket-bot/bot
python run.py
```

You should see:
```
✓ Bot logged in as AI Ticket Bot#1234
✓ Ollama connection successful
```

## Step 6: Setup in Discord

1. In your Discord server, type: `/setup`
2. Select a forum channel for tickets
3. Select a staff role
4. Type: `/ticket_panel`
5. Choose ticket categories

**Done!** Your bot is now running! 🎉

## First Test

1. Click a category button on the ticket panel
2. Ask a question in the ticket
3. Bot should respond within 5-10 seconds

## Next Steps

- **Train the bot**: `/train question:"..." answer:"..."`
- **Check status**: `/status`
- **View training**: `/training_list`
- **Get help**: See README.md or SETUP.md

## Common Issues

### Bot not responding
```bash
# Check Ollama is running
curl http://localhost:11434/api/tags

# If error, restart Ollama in Terminal 1
```

### Can't find bot token
```bash
# Go to Discord Developer Portal
# Applications > Your App > Bot > TOKEN > Copy
```

### Commands not showing
```bash
# Wait 5 minutes for Discord to sync
# Or restart bot: Ctrl+C and python run.py
```

## Need Help?

- **Setup issues**: See SETUP.md
- **Troubleshooting**: See TROUBLESHOOTING.md
- **Examples**: See EXAMPLES.md
- **Architecture**: See ARCHITECTURE.md

---

**Congratulations!** You now have a working AI ticket bot! 🚀
