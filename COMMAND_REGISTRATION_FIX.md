# Command Registration Fix for Koyeb Deployment

## Problem

The Discord bot was not automatically registering slash commands when deployed to Koyeb. Commands would take up to 1 hour to appear because the bot was only syncing globally.

## Root Cause

The bot's `setup_hook()` method in `bot/main_direct.py` was only calling `self.tree.sync()` without a guild parameter, which triggers a **global sync**. Global command syncs can take up to 1 hour to propagate across Discord's infrastructure.

## Solution

The fix implements **guild-specific command synchronization** for instant command registration, while maintaining global sync as a fallback.

### Changes Made

#### 1. Updated `bot/main_direct.py`

Added guild-specific command sync in the `setup_hook()` method:

```python
# If DISCORD_GUILD_ID is set, sync to that guild for instant registration
if Config.DISCORD_GUILD_ID and str(Config.DISCORD_GUILD_ID) != "0":
    try:
        guild_id = int(Config.DISCORD_GUILD_ID)
        guild = discord.Object(id=guild_id)
        
        # Copy global commands to guild for instant sync
        self.tree.copy_global_to(guild=guild)
        
        # Sync to specific guild (instant)
        synced = await self.tree.sync(guild=guild)
        print(f"✓ Synced {len(synced)} commands to guild {guild_id} (instant)")
        
        for cmd in synced:
            print(f"  - /{cmd.name}")
    except Exception as e:
        print(f"⚠️ Guild sync failed: {e}, falling back to global sync")

# Also sync globally (takes up to 1 hour to propagate)
synced_global = await self.tree.sync()
print(f"✓ Synced {len(synced_global)} commands globally")
```

#### 2. Updated `bot/commands_v2.py`

Added a manual `/sync` command for troubleshooting:

```python
@bot.tree.command(name="sync", description="Manually sync slash commands (Admin only)")
@app_commands.default_permissions(administrator=True)
async def sync_commands(interaction: discord.Interaction):
    """Manual command sync for troubleshooting"""
    await interaction.response.defer(ephemeral=True)
    
    try:
        # Sync to current guild
        if interaction.guild:
            bot.tree.copy_global_to(guild=interaction.guild)
            synced = await bot.tree.sync(guild=interaction.guild)
            await interaction.followup.send(
                f"✓ Synced {len(synced)} commands to this server",
                ephemeral=True
            )
    except Exception as e:
        await interaction.followup.send(f"❌ Sync failed: {e}", ephemeral=True)
```

## How It Works

### Guild-Specific Sync (Instant)
- When `DISCORD_GUILD_ID` is set in environment variables
- Commands appear **immediately** in that specific Discord server
- Perfect for development and testing
- Recommended for Koyeb deployment

### Global Sync (1 Hour Delay)
- Commands available in **all servers** where the bot is installed
- Takes up to 1 hour to propagate
- Used as fallback if guild sync fails
- Required for public bots

### Manual Sync Command
- Use `/sync` in Discord to manually re-sync commands
- Admin-only command
- Useful for troubleshooting
- Syncs to the current server instantly

## Deployment Steps for Koyeb

### 1. Get Your Discord Guild ID

1. Enable Developer Mode in Discord:
   - User Settings → Advanced → Developer Mode
2. Right-click your server icon
3. Click "Copy Server ID"
4. Save this ID (e.g., `1234567890123456789`)

### 2. Set Environment Variables in Koyeb

In your Koyeb service settings, add/update these environment variables:

```bash
DISCORD_TOKEN=your_discord_bot_token
DISCORD_GUILD_ID=1234567890123456789  # Your server ID (REQUIRED for instant sync)
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=mixtral-8x7b-32768
BOT_PREFIX=!
LOG_LEVEL=INFO
```

**Important**: The `DISCORD_GUILD_ID` must be set for instant command registration!

### 3. Deploy to Koyeb

1. Push the updated code to GitHub:
   ```bash
   git add .
   git commit -m "fix: Add guild-specific command sync for instant registration"
   git push origin main
   ```

2. In Koyeb dashboard:
   - Go to your service
   - Click "Redeploy" or "Rebuild"
   - Wait for deployment to complete

3. Check the logs for:
   ```
   ✓ Synced X commands to guild 1234567890123456789 (instant)
     - /train
     - /ticket
     - /sync
   ✓ Synced X commands globally
   ✅ Bot is ready and commands are registered!
   ```

### 4. Verify Commands in Discord

1. Go to your Discord server
2. Type `/` in any channel
3. You should immediately see:
   - `/train add` - Add training data
   - `/train list` - List training data
   - `/train stats` - Show statistics
   - `/train delete` - Delete training
   - `/ticket info` - Get ticket info
   - `/ticket close` - Close a ticket
   - `/sync` - Manual sync (admin only)

## Troubleshooting

### Commands still not appearing?

1. **Check the logs in Koyeb**:
   - Look for "✓ Synced X commands to guild"
   - If you see errors, the DISCORD_GUILD_ID might be wrong

2. **Verify DISCORD_GUILD_ID**:
   - Make sure it's the correct server ID
   - No quotes around the number
   - No extra spaces

3. **Use the manual sync command**:
   - If you can see the `/sync` command, run it
   - This will re-sync all commands to your server

4. **Check bot permissions**:
   - Bot needs "applications.commands" scope
   - Reinvite bot with correct permissions if needed

5. **Wait for global sync**:
   - If guild sync fails, global sync takes up to 1 hour
   - Check back in 1 hour

### Bot logs show "Guild sync failed"?

This means the `DISCORD_GUILD_ID` is invalid or the bot is not in that server:

1. Verify the guild ID is correct
2. Make sure the bot is invited to that server
3. Check bot has proper permissions

### Commands appear but don't work?

This is a different issue - commands are registered but the handler is failing:

1. Check Koyeb logs for errors when running commands
2. Verify database is accessible
3. Check Groq API key is valid

## Benefits of This Fix

✅ **Instant command registration** - Commands appear immediately in your server
✅ **Better development experience** - Test changes instantly
✅ **Fallback to global sync** - Still works if guild sync fails
✅ **Manual sync command** - Troubleshoot without redeploying
✅ **Better logging** - See exactly what's happening
✅ **Production ready** - Works on Koyeb and other platforms

## Testing Locally

To test this fix locally before deploying:

1. Create a `.env` file in the project root:
   ```bash
   DISCORD_TOKEN=your_token
   DISCORD_GUILD_ID=your_guild_id
   GROQ_API_KEY=your_groq_key
   ```

2. Run the bot:
   ```bash
   cd bot
   python koyeb_run.py
   ```

3. Check the output:
   ```
   ✓ Synced X commands to guild 1234567890123456789 (instant)
   ```

4. Go to Discord and verify commands appear immediately

## Additional Notes

- The fix is backward compatible - if `DISCORD_GUILD_ID` is not set, it falls back to global sync only
- You can set `DISCORD_GUILD_ID=0` to disable guild sync and use only global sync
- The `/sync` command is admin-only and won't appear for regular users
- Commands are organized in groups: `/train` and `/ticket`

## Support

If you continue to have issues:

1. Check the Koyeb logs for detailed error messages
2. Verify all environment variables are set correctly
3. Make sure the bot has the correct permissions in Discord
4. Try the `/sync` command if you can see it

---

**Your commands should now register instantly on Koyeb!** 🚀
