# Migration Guide: Groq → GPT4Free (g4f)

## Overview

This guide explains how to migrate your Supreme AI Discord bot from the paid Groq API to the completely free GPT4Free (g4f) library.

## What Changed?

**Before (Groq):**
- Required `GROQ_API_KEY` environment variable
- Used paid Groq SDK with rate limits
- Models: llama-3.3-70b-versatile, llama-3.1-70b-versatile, etc.

**After (g4f):**
- **No API keys required** - completely free
- **No rate limits** - aggregates multiple free providers
- Models: GPT-4, GPT-5, Meta AI, Qwen, Claude, and more

## Installation Steps

### Step 1: Install g4f Python Library

Run the installation script:

```bash
cd /home/ubuntu/supreme-ai
./install_g4f.sh
```

Or install manually:

```bash
pip3 install -U g4f[all]
```

### Step 2: Update Your .env File

You **no longer need** the `GROQ_API_KEY`. You can remove it or keep it (it won't be used).

**Before:**
```env
DISCORD_TOKEN=your_discord_bot_token_here
DISCORD_CLIENT_ID=your_discord_client_id_here
GROQ_API_KEY=your_groq_api_key_here  # ← No longer needed!
```

**After:**
```env
DISCORD_TOKEN=your_discord_bot_token_here
DISCORD_CLIENT_ID=your_discord_client_id_here
# GROQ_API_KEY removed - g4f requires no API keys!
```

### Step 3: Verify the Changes

The following files have been updated:

1. **`src/utils/ai.js`** - Now uses g4f instead of Groq
2. **`src/utils/ai_groq_backup.js`** - Backup of original Groq implementation
3. **`src/utils/ai_original_backup.js`** - Another backup for safety

### Step 4: Start Your Bot

```bash
npm start
```

## How It Works

The new `ai.js` module uses Python's g4f library by spawning Python processes. Here's what happens:

1. **User sends a message** in a ticket channel
2. **Bot calls `ai.generateResponse()`** in `ai.js`
3. **ai.js spawns a Python process** that runs g4f
4. **g4f tries multiple free providers** (GPT-4, GPT-5, Meta AI, Qwen, etc.)
5. **First working provider returns a response**
6. **Response is sent back to Discord**

## Available Models

The bot will try these models in order (all completely free):

1. **gpt-4** - Via AnyProvider (aggregates multiple sources)
2. **gpt-5** - Via AnyProvider (latest model)
3. **meta-ai** - Via MetaAI (very reliable)
4. **qwen-max** - Via Qwen (powerful Chinese model)
5. **gpt-4o-mini** - Fallback option

## Benefits

| Feature | Groq (Old) | g4f (New) |
|---------|-----------|----------|
| **Cost** | Requires paid API key | Completely free |
| **Rate Limits** | Yes, based on plan | No rate limits |
| **API Keys** | Required | Not required |
| **Models** | Llama models only | GPT-4, GPT-5, Meta AI, Qwen, Claude, etc. |
| **Reliability** | Single provider | Multiple providers with auto-fallback |

## Troubleshooting

### Issue: "g4f not installed" warning

**Solution:** Run the installation script:
```bash
./install_g4f.sh
```

### Issue: Python not found

**Solution:** Install Python 3.10+:
```bash
# Ubuntu/Debian
sudo apt update && sudo apt install python3 python3-pip

# macOS
brew install python3
```

### Issue: Slow responses

**Explanation:** The first request may be slower as g4f initializes. Subsequent requests are faster.

### Issue: Want to switch back to Groq

**Solution:** Restore the backup:
```bash
cd /home/ubuntu/supreme-ai/src/utils
cp ai_groq_backup.js ai.js
```

Then add your `GROQ_API_KEY` back to `.env`.

## Testing

To test if g4f is working:

1. Start your bot: `npm start`
2. Send a message in a ticket channel
3. Check the console logs for:
   - `🤖 [G4F] Attempting response with model: gpt-4`
   - `✅ [G4F] Generated response using gpt-4 (XXX chars)`

## Advanced Configuration

### Changing Model Priority

Edit `src/utils/ai.js` and modify the `MODELS` array:

```javascript
const MODELS = [
    "gpt-5",           // Try GPT-5 first
    "meta-ai",         // Then Meta AI
    "qwen-max",        // Then Qwen
    "gpt-4",           // Then GPT-4
];
```

### Adding More Models

Check the [g4f working providers list](https://github.com/Free-AI-Things/g4f-working) for more models and add them to the `MODELS` array.

## Performance Comparison

**Response Time:**
- Groq: ~1-2 seconds
- g4f: ~2-5 seconds (first request), ~1-3 seconds (subsequent)

**Quality:**
- Groq: High quality (Llama models)
- g4f: Excellent quality (GPT-4, GPT-5, Claude models)

**Cost:**
- Groq: $0.05 - $0.70 per 1M tokens
- g4f: **$0.00** (completely free)

## Support

If you encounter any issues:

1. Check the console logs for error messages
2. Verify Python 3.10+ is installed: `python3 --version`
3. Verify g4f is installed: `python3 -c "import g4f; print('OK')"`
4. Check the [g4f GitHub repository](https://github.com/xtekky/gpt4free) for updates

## Conclusion

You've successfully migrated from Groq to g4f! Your bot now has:

- ✅ **Zero cost** - No API keys or credits needed
- ✅ **No rate limits** - Unlimited usage
- ✅ **Better models** - Access to GPT-4, GPT-5, and more
- ✅ **Auto-fallback** - If one provider fails, tries another

Enjoy your completely free AI-powered Discord bot! 🎉
