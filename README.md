# Supreme AI Bot (Discord.js Version)

A powerful Discord bot for ticket management and AI-driven support, now rewritten in Discord.js for maximum reliability and performance.

## 🚀 Features

- **Slash Commands**: Modern and intuitive command interface.
- **Ticket Management**: Automatic AI responses in ticket channels.
- **Training System**: Teach the bot custom responses.
- **Groq AI**: Fast and intelligent responses using Llama 3.
- **SQLite Database**: Persistent storage for training and conversations.

## 🛠️ Setup

### 1. Discord Developer Portal
- Enable **Message Content Intent** under the "Bot" tab.
- Copy your **Bot Token**.
- Copy your **Client ID** (Application ID).

### 2. Environment Variables
Set the following variables in Koyeb:
- `DISCORD_TOKEN`: Your bot token.
- `DISCORD_CLIENT_ID`: Your bot's application ID.
- `GROQ_API_KEY`: Your Groq API key.
- `DISCORD_GUILD_ID`: (Optional) Your server ID for instant command sync.

## 📜 Commands

- `/status`: Check bot and AI health.
- `/train add`: Add a custom response.
- `/train list`: View all training data.
- `/train delete`: Remove a training entry.
- `/ticket close`: Close a support ticket.

## 📦 Deployment

This bot is ready for deployment on **Koyeb** using the included `Dockerfile`.
