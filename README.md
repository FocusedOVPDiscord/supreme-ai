# Discord AI Ticket Bot 🤖

A powerful, self-hosted Discord bot that manages support tickets with AI-powered responses. Uses **Ollama** for local LLM inference—no paid APIs required, complete privacy, and full control.

## Features

### 🎫 Ticket Management
- **Forum-based tickets**: Organize support requests in Discord forum channels
- **Category system**: Create tickets in different categories (Billing, Technical, General, etc.)
- **Thread-based conversations**: Each ticket is a dedicated thread for organized discussion
- **Auto-archiving**: Close and archive resolved tickets

### 🧠 AI-Powered Responses
- **Local LLM**: Uses Ollama with Llama 3, Mistral, or other open-source models
- **Context-aware**: Maintains conversation history for better responses
- **Intelligent matching**: Finds and uses trained responses when appropriate
- **Fallback system**: Uses trained data when AI is unavailable

### 📚 Training System
- **`/train` command**: Teach the bot custom responses
- **Persistent memory**: SQLite database stores all training data
- **Similarity search**: Automatically finds relevant training data for queries
- **Usage tracking**: Monitor which responses are most helpful
- **Category organization**: Organize training data by topic

### 📊 Admin Features
- **`/status` command**: Check bot and Ollama health
- **`/test_ai` command**: Test AI responses before deployment
- **`/export_training`**: Backup training data as JSON
- **`/import_training`**: Restore training data from backup
- **Statistics**: Track conversations, tickets, and training usage

### 🔒 Privacy & Control
- **Self-hosted**: Runs entirely on your machine
- **No external APIs**: No data sent to third parties
- **Open-source models**: Use community-maintained LLMs
- **Local database**: All data stays on your server

## Quick Start

### 1. Install Requirements
```bash
# Install Ollama
# Download from https://ollama.ai

# Install Python dependencies
pip install -r requirements.txt

# Download LLM model
ollama pull llama3
```

### 2. Configure Bot
```bash
# Copy and edit configuration
cd bot
cp ../.env.example .env
# Edit .env with your Discord token and settings
```

### 3. Start Services
```bash
# Terminal 1: Start Ollama
ollama serve

# Terminal 2: Start Bot
cd bot
python run.py
```

### 4. Setup in Discord
```
/setup [forum_channel] [staff_role]
/ticket_panel
```

## Commands

### User Commands
| Command | Description |
|---------|-------------|
| `/ticket_panel` | Create ticket creation interface |
| `/close_ticket` | Close current ticket |
| `/ticket_info` | Get ticket information |

### Training Commands
| Command | Description |
|---------|-------------|
| `/train` | Add training data |
| `/training_list` | View all training data |
| `/training_delete` | Delete training entry |
| `/training_stats` | Show statistics |

### Admin Commands
| Command | Description |
|---------|-------------|
| `/setup` | Configure bot for server |
| `/status` | Check bot health |
| `/test_ai` | Test AI response |
| `/export_training` | Export training data |
| `/import_training` | Import training data |

## Architecture

```
Discord Server
    ↓
Bot (discord.py)
    ├─ Message Handler
    ├─ Command Handler
    └─ AI Integration
        ↓
    Memory System
    ├─ Training Database (SQLite)
    ├─ Conversation History
    └─ Context Manager
        ↓
    Ollama LLM
    ├─ Llama 3 / Mistral
    └─ Local Inference
```

## Configuration

### Environment Variables
```env
# Discord
DISCORD_TOKEN=your_bot_token
DISCORD_GUILD_ID=your_server_id

# Ollama
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3

# Bot
BOT_PREFIX=!
LOG_LEVEL=INFO

# Memory
DB_PATH=./data/training.db
SIMILARITY_THRESHOLD=0.7
MAX_CONTEXT_LENGTH=2000

# Features
ENABLE_AUTO_RESPONSE=true
ENABLE_TRAINING=true
RESPONSE_TIMEOUT=30
```

## Performance

| Metric | Value |
|--------|-------|
| Response Time | 2-10 seconds |
| Memory Usage | 2-6GB (Llama 3 7B) |
| Concurrent Tickets | 5-10 |
| Database Size | ~1MB per 1000 entries |

## System Requirements

- **Python**: 3.9+
- **RAM**: 4GB minimum (8GB+ recommended)
- **Storage**: 10GB for models + database
- **GPU**: Optional (NVIDIA CUDA recommended)
- **OS**: Windows, Mac, Linux

## File Structure

```
discord-ai-ticket-bot/
├── bot/
│   ├── main.py              # Main ticket handler
│   ├── run.py               # Bot entry point
│   ├── config.py            # Configuration
│   ├── memory/
│   │   └── training_db.py   # Database management
│   ├── ai/
│   │   └── ollama_client.py # LLM integration
│   └── commands/
│       ├── training.py      # Training commands
│       ├── tickets.py       # Ticket commands
│       └── admin.py         # Admin commands
├── data/                    # Database storage
├── logs/                    # Bot logs
├── ARCHITECTURE.md          # System design
├── SETUP.md                 # Installation guide
└── README.md               # This file
```

## Troubleshooting

### Bot not responding
1. Check Ollama is running: `curl http://localhost:11434/api/tags`
2. Verify bot token in `.env`
3. Check logs: `logs/bot.log`

### Slow responses
- Use smaller model: `ollama pull mistral`
- Reduce `MAX_CONTEXT_LENGTH`
- Increase `RESPONSE_TIMEOUT`

### Database errors
- Reset database: `rm data/training.db`
- Check file permissions
- Ensure `data/` directory exists

## Advanced Usage

### Custom Models
```bash
ollama pull neural-chat
# Then update OLLAMA_MODEL in .env
```

### Fine-tuning
```bash
# Create custom model based on Llama 3
ollama create custom-model -f Modelfile
```

### Backup & Restore
```bash
# Export training data
/export_training

# Import on new instance
/import_training [file]
```

## Contributing

Contributions welcome! Areas for improvement:
- Vector embeddings for better similarity matching
- Multi-language support
- Dashboard UI
- Integration with external ticketing systems
- Advanced analytics

## License

MIT License - See LICENSE file for details

## Disclaimer

This bot uses open-source LLMs which may generate inaccurate information. Always review AI responses before sending to users. Use for support automation, not critical decisions.

## Support

- **Documentation**: See SETUP.md and ARCHITECTURE.md
- **Issues**: Check logs in `logs/bot.log`
- **Discord.py Docs**: https://discordpy.readthedocs.io/
- **Ollama Docs**: https://github.com/ollama/ollama

## Roadmap

- [ ] Vector embeddings for semantic search
- [ ] Multi-language support
- [ ] Web dashboard
- [ ] Slack integration
- [ ] Analytics dashboard
- [ ] Custom model training
- [ ] API endpoints
- [ ] Webhook support

---

**Made with ❤️ for Discord communities**

Start supporting your community with AI today! 🚀
