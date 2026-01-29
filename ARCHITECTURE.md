# Discord AI Ticket Bot - Architecture & Design

## Overview

This document outlines the architecture of a Discord ticket bot powered by a local LLM (Ollama) with persistent memory and training capabilities. The bot runs entirely on your local machine without requiring paid APIs.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Discord Server                           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Forum Channel (Tickets)                             │   │
│  │  - /setup: Configure bot                             │   │
│  │  - /ticket_panel: Create ticket UI                   │   │
│  │  - /train: Train AI responses                        │   │
│  │  - /close: Close ticket                              │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│              Discord Bot (Python/discord.py)                │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Command Handler                                     │   │
│  │  - Process slash commands                           │   │
│  │  - Handle ticket creation/closure                   │   │
│  │  - Manage training data                             │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Message Handler                                     │   │
│  │  - Listen to ticket messages                        │   │
│  │  - Route to AI for responses                        │   │
│  │  - Format and send replies                          │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│           Memory & Knowledge Management System              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Training Database (SQLite/JSON)                     │   │
│  │  - Trained responses                                │   │
│  │  - User patterns                                    │   │
│  │  - Context history                                 │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Memory Retrieval System                             │   │
│  │  - Search similar queries                           │   │
│  │  - Retrieve relevant training data                  │   │
│  │  - Build context for AI                             │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│         Local LLM Integration (Ollama)                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Ollama API (http://localhost:11434)                │   │
│  │  - Model: Llama 3 / Mistral 7B                      │   │
│  │  - Generate responses                              │   │
│  │  - Process natural language                        │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Discord Bot Core (`bot.py`)
- **Responsibilities:**
  - Initialize Discord client with intents
  - Register slash commands
  - Handle events (ready, message, interaction)
  - Manage bot state and configuration

### 2. Command Handler (`commands/`)
- **`/setup`**: Configure forum channel and staff role
- **`/ticket_panel`**: Create interactive ticket creation UI
- **`/train`**: Add training data for AI responses
- **`/close`**: Close ticket and archive conversation
- **`/status`**: Check bot and Ollama status

### 3. Memory System (`memory/`)
- **Training Database**: Store trained Q&A pairs
- **Context Manager**: Maintain conversation history
- **Similarity Search**: Find relevant training data for queries
- **Persistence**: SQLite or JSON-based storage

### 4. AI Integration (`ai/`)
- **Ollama Client**: Connect to local LLM
- **Prompt Builder**: Construct context-aware prompts
- **Response Generator**: Generate and format AI responses
- **Fallback Handler**: Use trained responses when LLM unavailable

### 5. Ticket Manager (`tickets/`)
- **Ticket Creation**: Create forum posts for tickets
- **Ticket Tracking**: Monitor ticket status
- **Auto-Response**: Generate AI responses in tickets
- **Ticket Closure**: Archive and summarize tickets

## Data Flow

### Training Flow
```
User: /train "How do I reset my password?" "Go to settings.com/reset"
  ↓
Bot validates and stores training data
  ↓
Memory System indexes the Q&A pair
  ↓
Stored in training database with metadata (timestamp, category, etc.)
```

### Response Generation Flow
```
User message in ticket: "I forgot my password"
  ↓
Bot retrieves conversation context
  ↓
Memory System searches for similar trained responses
  ↓
If match found (similarity > threshold):
  - Use trained response directly
  ↓
Else:
  - Build prompt with context + training data
  - Send to Ollama API
  - Get AI-generated response
  ↓
Format and send response to Discord
  ↓
Store interaction in memory for future learning
```

## Memory System Details

### Training Data Structure
```json
{
  "id": "unique_id",
  "query": "user question",
  "response": "trained response",
  "category": "billing|technical|general",
  "created_at": "2026-01-29T14:00:00Z",
  "usage_count": 5,
  "confidence": 0.95
}
```

### Context Window
- Maintain last 10-20 messages in ticket
- Include user metadata (username, account age)
- Track conversation sentiment and urgency
- Store resolved vs. unresolved tickets

### Similarity Matching
- Use embedding-based search (optional: sentence-transformers)
- Or simple keyword/TF-IDF matching
- Return top 3-5 similar training entries
- Use similarity score to determine response strategy

## Technology Stack

| Component | Technology | Notes |
|-----------|-----------|-------|
| Bot Framework | discord.py | Async Python Discord library |
| Local LLM | Ollama | Free, runs locally |
| LLM Model | Llama 3 / Mistral 7B | High quality, open-source |
| Database | SQLite / JSON | Lightweight, no external deps |
| API Client | requests / aiohttp | HTTP client for Ollama |
| Search | Fuzzy matching / embeddings | Optional: sentence-transformers |

## Setup Requirements

### Local Machine
- Python 3.9+
- Ollama installed and running
- Discord bot token (free from Discord Developer Portal)
- 4GB+ RAM (for LLM inference)
- GPU optional but recommended

### Discord Server
- Admin permissions to create forum channels
- Ability to create roles
- Bot invited with permissions: `read_messages`, `send_messages`, `manage_channels`, `manage_threads`

## Key Features

### 1. Trainable AI
- **`/train` Command**: Teach bot specific responses
- **Pattern Learning**: Bot learns from interactions
- **Category Management**: Organize training data by topic

### 2. Persistent Memory
- **Conversation History**: Maintain context across sessions
- **User Profiles**: Remember user preferences
- **Ticket Analytics**: Track common issues

### 3. Local Execution
- **No API Costs**: Everything runs on your machine
- **Privacy**: No data sent to external services
- **Offline Capable**: Works without internet (after setup)

### 4. Ticket Management
- **Forum-Based**: Uses Discord forum channels
- **Auto-Response**: AI responds to user messages
- **Staff Notifications**: Alert support team
- **Auto-Close**: Close resolved tickets

## Configuration

### Environment Variables
```
DISCORD_TOKEN=your_bot_token
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3  # or mistral, neural-chat, etc.
DB_PATH=./data/training.db
SIMILARITY_THRESHOLD=0.7
MAX_CONTEXT_LENGTH=2000
```

### Ollama Setup
```bash
# Install Ollama from https://ollama.ai
ollama pull llama3      # Download model
ollama serve            # Start server (runs on :11434)
```

## Performance Considerations

- **Response Time**: 2-10 seconds (depends on model size and hardware)
- **Memory Usage**: 2-6GB (Llama 3 7B model)
- **Concurrent Requests**: Handle 5-10 simultaneous tickets
- **Database Size**: ~1MB per 1000 training entries

## Future Enhancements

1. **Advanced Memory**: Implement vector embeddings for better similarity matching
2. **Multi-Model Support**: Switch between models based on query complexity
3. **Analytics Dashboard**: Track bot performance and common issues
4. **Fine-Tuning**: Adapt LLM to your specific domain
5. **Integration**: Connect to external APIs (email, ticketing systems)
6. **Backup & Sync**: Cloud backup of training data

## Security Notes

- Bot token stored in environment variables only
- Training data stored locally (no external transmission)
- Discord permissions limited to necessary functions
- Input validation on all user commands
- Rate limiting to prevent abuse

---

**Next Steps**: Proceed to implementation phase to build the bot components.
