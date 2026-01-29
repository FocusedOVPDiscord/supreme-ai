# 🚀 Quick Fix for Koyeb Deployment

## The Issue
Commands not appearing in Discord after deploying to Koyeb.

## The Solution
Set `DISCORD_GUILD_ID` environment variable for instant command sync!

## Step-by-Step Fix

### 1. Get Your Server ID
1. Enable Developer Mode in Discord (Settings → Advanced → Developer Mode)
2. Right-click your server icon
3. Click "Copy Server ID"
4. You'll get something like: `1234567890123456789`

### 2. Add to Koyeb Environment Variables
1. Go to Koyeb Dashboard
2. Select your service
3. Click "Settings" → "Environment"
4. Add this variable:
   ```
   DISCORD_GUILD_ID=1234567890123456789
   ```
   (Replace with your actual server ID)

### 3. Redeploy
1. Click "Redeploy" in Koyeb
2. Wait for deployment to complete
3. Check logs for: `✓ Synced X commands to guild 1234567890123456789 (instant)`

### 4. Test in Discord
Type `/` in your Discord server - commands should appear immediately!

## Available Commands
- `/train add` - Add training data
- `/train list` - List training data  
- `/train stats` - Show statistics
- `/train delete` - Delete entry
- `/ticket info` - Get ticket info
- `/ticket close` - Close ticket
- `/sync` - Manual sync (admin only)

## Still Not Working?

### Check Logs
Look for errors in Koyeb logs. Common issues:
- Wrong DISCORD_GUILD_ID
- Bot not in that server
- Missing bot permissions

### Use Manual Sync
If you can see the `/sync` command, run it to re-sync all commands.

### Verify Bot Permissions
Bot needs these permissions:
- Send Messages
- Read Messages
- Use Slash Commands
- Manage Threads (for tickets)

### Reinvite Bot
If permissions are wrong, reinvite with this URL:
```
https://discord.com/api/oauth2/authorize?client_id=YOUR_BOT_ID&permissions=328565385280&scope=bot%20applications.commands
```

## Why This Works

**Before**: Only global sync → 1 hour delay
**After**: Guild-specific sync → instant registration

The bot now syncs commands directly to your server first (instant), then globally (1 hour) as backup.

---

**Need help?** Check `COMMAND_REGISTRATION_FIX.md` for detailed documentation.
