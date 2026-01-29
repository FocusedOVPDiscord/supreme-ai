# 🚀 Koyeb Deployment Guide for Supreme AI

Since you already have your bot deployed on Koyeb, follow these steps to ensure the new AI and Ticket features work correctly.

## 1. Update Environment Variables

The new version requires additional environment variables. Go to your **Koyeb Service Settings** and add:

| Key | Value |
|-----|-------|
| `GROQ_API_KEY` | Your API key from [Groq Console](https://console.groq.com) |
| `DISCORD_TOKEN` | Your Discord Bot Token |
| `DISCORD_CLIENT_ID` | Your Bot's Application ID |
| `DISCORD_GUILD_ID` | (Optional) Your Server ID for instant command sync |

## 2. Persistent Storage (Important)

Koyeb's file system is **ephemeral** by default, meaning your database (`bot.db`) will be deleted every time the bot restarts or redeploys.

### Option A: Use Koyeb Persistent Volumes (Recommended)
1. In Koyeb, go to your Service → **Storage**.
2. Create a **Persistent Volume** (e.g., 1GB).
3. Mount it to `/home/node/app/data`.
4. The bot will now save the SQLite database permanently.

### Option B: External Database
If you prefer not to use volumes, you would need to migrate the `database.js` to use a hosted PostgreSQL or MySQL database (like Supabase or TiDB).

## 3. Deployment Trigger

Once you've added the environment variables:
1. Push these changes to your GitHub (I have already done this for you).
2. Koyeb will automatically detect the new commit and start a **Redeploy**.
3. Check the **Runtime Logs** in Koyeb to ensure the bot connects to Groq.

## 4. Health Checks

The bot now includes an Express server on port `10000` for Koyeb health checks.
- **Port**: 10000
- **Path**: `/health`

If Koyeb reports "Healthy", your bot is running correctly!
