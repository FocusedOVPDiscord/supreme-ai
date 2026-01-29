# Environment Variables for Koyeb Deployment

Add these environment variables in your Koyeb dashboard:

## Required Variables

```
DISCORD_TOKEN=your_discord_bot_token_here
DISCORD_GUILD_ID=your_guild_id_here
GROQ_API_KEY=your_groq_api_key_here
```

## Optional Variables

```
GROQ_MODEL=mixtral-8x7b-32768
BOT_PREFIX=!
LOG_LEVEL=INFO
DB_PATH=./data/training.db
SIMILARITY_THRESHOLD=0.7
MAX_CONTEXT_LENGTH=2000
ENABLE_AUTO_RESPONSE=true
ENABLE_TRAINING=true
RESPONSE_TIMEOUT=30
```

## How to Add to Koyeb

1. Go to your Koyeb dashboard
2. Select your app
3. Go to "Environment" or "Settings"
4. Click "Add environment variable"
5. Enter each variable name and value
6. Save and redeploy

## Getting Your Values

### Discord Token
- Go to https://discord.com/developers/applications
- Select your app
- Go to "Bot" section
- Copy the token under "TOKEN"

### Discord Guild ID
- Enable Developer Mode in Discord (User Settings > Advanced > Developer Mode)
- Right-click your server name
- Click "Copy Server ID"

### Groq API Key
- Go to https://console.groq.com
- Sign up or log in
- Go to "API Keys"
- Create a new API key
- Copy it

## Important Security Notes

- **NEVER** commit these values to GitHub
- **NEVER** share these values publicly
- Use Koyeb's environment variables feature to store secrets securely
- Regenerate keys if they're ever exposed
