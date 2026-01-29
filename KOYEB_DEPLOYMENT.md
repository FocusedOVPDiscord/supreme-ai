# Supreme AI Bot - Koyeb Deployment Guide

Complete guide to deploy your Discord AI Ticket Bot on Koyeb with Groq AI integration.

## Prerequisites

- GitHub account with your `supreme-ai` repository
- Koyeb account (free tier available)
- Discord bot token
- Groq API key
- Discord guild ID

## Step 1: Prepare Your GitHub Repository

Your repository should already have all the code pushed. Verify it contains:

```
supreme-ai/
├── bot/
│   ├── koyeb_run.py          # Main entry point for Koyeb
│   ├── main.py               # Ticket handler
│   ├── config.py             # Configuration
│   ├── memory/               # Database
│   ├── ai/
│   │   └── groq_client.py    # Groq AI integration
│   ├── commands/             # Discord commands
│   └── utils/                # Utilities
├── Dockerfile                # Docker configuration
├── docker-compose.yml        # Local testing
├── requirements.txt          # Python dependencies
└── ENV_TEMPLATE.md          # Environment variables guide
```

## Step 2: Create Koyeb Account

1. Go to https://www.koyeb.com
2. Click "Sign Up"
3. Choose your preferred sign-up method (GitHub recommended)
4. Complete the signup process
5. Verify your email

## Step 3: Deploy on Koyeb

### Option A: Deploy from GitHub (Recommended)

1. Log in to Koyeb dashboard
2. Click "Create Service"
3. Select "GitHub"
4. Authorize Koyeb to access your GitHub account
5. Select your `supreme-ai` repository
6. Configure deployment:
   - **Name**: `supreme-ai-bot`
   - **Builder**: Docker
   - **Dockerfile path**: `./Dockerfile`
   - **Port**: `8000` (or any available port)

### Option B: Deploy from Docker Image

1. Build and push Docker image to Docker Hub
2. In Koyeb, select "Docker"
3. Enter your Docker image URL
4. Configure as above

## Step 4: Add Environment Variables

1. In Koyeb dashboard, go to your service
2. Click "Settings" or "Environment"
3. Add these environment variables:

```
DISCORD_TOKEN=your_token_here
DISCORD_GUILD_ID=your_guild_id_here
GROQ_API_KEY=your_groq_api_key_here
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

4. Click "Save" or "Deploy"

## Step 5: Monitor Deployment

1. Go to "Logs" in Koyeb dashboard
2. Watch for these success messages:
   ```
   ✓ Bot logged in as Supreme AI Bot#1234
   ✓ Groq AI connection successful
   ✓ Loaded cog: training
   ✓ Loaded cog: tickets
   ```

3. If you see errors, check:
   - Discord token is correct
   - Groq API key is correct
   - Guild ID is correct
   - All environment variables are set

## Step 6: Test Your Bot

1. Go to your Discord server
2. Type `/status`
3. You should see:
   ```
   ✓ Ollama Server: Online (or Groq: Online)
   ✓ Active Model: mixtral-8x7b-32768
   Training Entries: 0
   Conversations: 0
   Open Tickets: 0
   ```

4. Create a test ticket and verify bot responds

## Step 7: Configure Bot in Discord

1. Type `/setup` in Discord
2. Select your forum channel for tickets
3. Select your staff role
4. Type `/ticket_panel` to create the ticket UI

## Koyeb Features

### Always-On Hosting
- Bot runs 24/7 without your computer
- Automatic restarts if bot crashes
- No need to keep terminal open

### Scalability
- Handles multiple Discord servers
- Auto-scales based on traffic
- Free tier suitable for most communities

### Monitoring
- View logs in real-time
- Monitor resource usage
- Get alerts on errors

### Custom Domain (Optional)
- Koyeb provides free `.koyeb.app` domain
- Option to add custom domain
- Useful if you add web dashboard later

## Troubleshooting

### Bot not starting
1. Check logs in Koyeb dashboard
2. Verify all environment variables are set
3. Check Discord token is valid (not expired)
4. Check Groq API key is valid

### Bot not responding to commands
1. Check bot is in the Discord server
2. Verify bot has necessary permissions
3. Check `/status` command works
4. Review logs for errors

### Slow responses
- Groq is fast, but first request may take 2-3 seconds
- Subsequent requests are faster (cached)
- If consistently slow, check Groq API status

### Database errors
- Koyeb provides persistent storage
- Database persists between restarts
- If corrupted, you can reset via logs

## Updating Your Bot

### Push code changes to GitHub
```bash
git add .
git commit -m "Update bot features"
git push origin main
```

### Redeploy on Koyeb
1. Go to Koyeb dashboard
2. Select your service
3. Click "Redeploy" or "Rebuild"
4. Koyeb automatically pulls latest code from GitHub
5. Bot restarts with new code

### Update environment variables
1. Go to Settings in Koyeb
2. Update the variable
3. Click "Save"
4. Bot automatically restarts

## Performance Optimization

### Use Smaller Model
```
GROQ_MODEL=llama2-70b-4096
```

### Reduce Context Length
```
MAX_CONTEXT_LENGTH=1000
```

### Increase Response Timeout
```
RESPONSE_TIMEOUT=60
```

## Costs

### Koyeb
- Free tier: 1 service, limited resources
- Paid tier: Starting at $5/month
- Perfect for Discord bots

### Groq
- Free tier: Generous rate limits, no credit card required
- Paid tier: Starting at $0.20 per 1M tokens
- Excellent value for AI

### Total Cost
- **Free**: Koyeb free tier + Groq free tier
- **Paid**: ~$5-10/month for reliable hosting + AI

## Advanced Features

### Persistent Database
- Training data stored in Koyeb's persistent storage
- Survives bot restarts
- Backup regularly via `/export_training`

### Multiple Servers
- Single bot instance can serve multiple Discord servers
- Each server has separate training data
- Use `DISCORD_GUILD_ID` to target specific server

### Custom Commands
- Add new commands in `bot/commands/`
- Redeploy to Koyeb
- Commands automatically loaded

## Security Best Practices

1. **Never commit secrets to GitHub**
   - Use Koyeb's environment variables
   - Use `.env.example` as template only

2. **Rotate tokens regularly**
   - Regenerate Discord token monthly
   - Regenerate Groq API key if exposed

3. **Use strong passwords**
   - Koyeb account password
   - GitHub account password
   - Discord developer account

4. **Monitor logs**
   - Check Koyeb logs regularly
   - Look for suspicious activity
   - Review error messages

## Support & Resources

- **Koyeb Docs**: https://docs.koyeb.com
- **Discord.py Docs**: https://discordpy.readthedocs.io/
- **Groq Docs**: https://console.groq.com/docs
- **GitHub Actions**: For CI/CD automation

## Next Steps

1. ✓ Code pushed to GitHub
2. ✓ Deployed on Koyeb
3. ✓ Environment variables configured
4. **Next**: Train your bot with support responses!

---

**Your bot is now live 24/7 on Koyeb!** 🚀

Start using `/train` to teach your bot, and it will automatically respond to support tickets using Groq AI.
