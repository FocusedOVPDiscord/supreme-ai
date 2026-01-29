# Supreme AI Bot - Koyeb Quick Start (5 Minutes)

Get your Discord AI bot running on Koyeb in 5 minutes with Groq AI.

## What You Have

✅ Complete bot code in your GitHub repo (`supreme-ai`)  
✅ Groq AI integration (no rate limits, cloud-based)  
✅ Docker configuration for Koyeb  
✅ All documentation and guides  

## Step 1: Verify GitHub Repo (1 minute)

1. Go to https://github.com/FocusedOVPDiscord/supreme-ai
2. You should see all the bot code
3. Check these files exist:
   - `Dockerfile`
   - `docker-compose.yml`
   - `bot/koyeb_run.py`
   - `bot/ai/groq_client.py`
   - `requirements.txt`

If you don't see them, the push might still be in progress. Wait 1-2 minutes and refresh.

## Step 2: Create Koyeb Account (2 minutes)

1. Go to https://www.koyeb.com
2. Click "Sign Up"
3. Use GitHub to sign up (easiest)
4. Authorize Koyeb to access your GitHub
5. Complete signup

## Step 3: Deploy on Koyeb (2 minutes)

### Create New Service

1. Go to Koyeb dashboard
2. Click "Create Service" or "New Service"
3. Select "GitHub"
4. Select your `supreme-ai` repository
5. Configure:
   - **Name**: `supreme-ai-bot`
   - **Builder**: Docker
   - **Dockerfile path**: `./Dockerfile`
   - **Port**: `8000`

6. Click "Create Service"

Koyeb will start building and deploying automatically!

## Step 4: Add Environment Variables (1 minute)

While Koyeb is building, add your secrets:

1. In Koyeb dashboard, go to your service
2. Click "Settings" or "Environment"
3. Click "Add Environment Variable"
4. Add these variables:

```
DISCORD_TOKEN = your_discord_bot_token
DISCORD_GUILD_ID = your_guild_id
GROQ_API_KEY = your_groq_api_key
GROQ_MODEL = mixtral-8x7b-32768
BOT_PREFIX = !
LOG_LEVEL = INFO
DB_PATH = ./data/training.db
SIMILARITY_THRESHOLD = 0.7
MAX_CONTEXT_LENGTH = 2000
ENABLE_AUTO_RESPONSE = true
ENABLE_TRAINING = true
RESPONSE_TIMEOUT = 30
```

5. Click "Save" or "Deploy"

## Getting Your Values

### Discord Token
```
1. Go to https://discord.com/developers/applications
2. Select your app
3. Click "Bot"
4. Copy the TOKEN
```

### Discord Guild ID
```
1. Enable Developer Mode in Discord
   (User Settings > Advanced > Developer Mode)
2. Right-click your server name
3. Click "Copy Server ID"
```

### Groq API Key
```
1. Go to https://console.groq.com
2. Sign up (free)
3. Go to "API Keys"
4. Create new key
5. Copy it
```

## Step 5: Monitor Deployment

1. Go to "Logs" in Koyeb
2. Wait for these messages:
   ```
   ✓ Bot logged in as Supreme AI Bot#1234
   ✓ Groq AI connection successful
   ✓ Loaded cog: training
   ✓ Loaded cog: tickets
   ```

3. If you see errors:
   - Check all environment variables are set
   - Verify Discord token is correct
   - Verify Groq API key is correct
   - Check guild ID is correct

## Step 6: Test Your Bot

1. Go to your Discord server
2. Type `/status`
3. You should see:
   ```
   ✓ Ollama Server: Online
   ✓ Active Model: mixtral-8x7b-32768
   Training Entries: 0
   ```

4. Create a test ticket
5. Bot should respond within 2-5 seconds

## Step 7: Configure Bot in Discord

1. Type `/setup`
2. Select your forum channel for tickets
3. Select your staff role
4. Type `/ticket_panel`
5. Done!

## Success! 🎉

Your bot is now:
- ✅ Running 24/7 on Koyeb
- ✅ Using Groq AI (no rate limits)
- ✅ Ready for production
- ✅ Automatically restarting if it crashes

## Next Steps

### Train Your Bot
```
/train question:"How do I reset my password?" answer:"Go to Settings > Account > Reset Password"
/train question:"What's your support email?" answer:"support@example.com"
```

### Monitor Bot
```
/status              - Check bot health
/training_list       - View training data
/training_stats      - See statistics
```

### Update Bot
1. Make changes to code
2. Push to GitHub: `git push origin main`
3. Koyeb automatically redeploys!

## Troubleshooting

### Bot not starting
- Check logs in Koyeb dashboard
- Verify all environment variables
- Regenerate Discord token if needed

### Bot not responding
- Check `/status` command
- Verify Groq API key is valid
- Check Koyeb logs for errors

### Slow responses
- First response takes 2-3 seconds (normal)
- Subsequent responses are faster
- If consistently slow, check Groq status

## Important Notes

### Security
- **NEVER** commit secrets to GitHub
- Use Koyeb's environment variables
- Regenerate keys if exposed

### Costs
- Koyeb: Free tier or $5+/month
- Groq: Free tier (generous limits)
- Total: Can be completely free!

### Scaling
- Single bot instance handles multiple servers
- Each server has separate training data
- Can add more features as needed

## File Structure in Koyeb

```
supreme-ai/
├── bot/
│   ├── koyeb_run.py        ← Main entry point
│   ├── ai/groq_client.py   ← Groq AI
│   ├── commands/           ← Discord commands
│   ├── memory/             ← Database
│   └── ...
├── Dockerfile              ← Docker config
├── requirements.txt        ← Python packages
└── ...
```

## Documentation

- **KOYEB_DEPLOYMENT.md** - Detailed deployment guide
- **ENV_TEMPLATE.md** - Environment variables reference
- **README.md** - Main documentation
- **EXAMPLES.md** - Usage examples
- **TROUBLESHOOTING.md** - Common issues

## Support

- Koyeb Docs: https://docs.koyeb.com
- Groq Docs: https://console.groq.com/docs
- Discord.py: https://discordpy.readthedocs.io/

---

**Your bot is now live!** 🚀

Start training it with `/train` and watch it handle support tickets automatically!
