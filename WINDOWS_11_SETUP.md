# Discord AI Ticket Bot - Complete Windows 11 Setup Guide

Complete step-by-step guide to run the Discord AI Ticket Bot on Windows 11.

## Prerequisites Check

Before starting, make sure you have:
- Windows 11 (Home, Pro, or Enterprise)
- At least 4GB RAM (8GB+ recommended)
- 10GB free disk space
- Internet connection
- Administrator access

## Step 1: Install Python 3.11+ (5 minutes)

### Download Python
1. Go to https://www.python.org/downloads/
2. Click the big yellow "Download Python 3.12" button
3. Save the installer to your Downloads folder

### Install Python
1. Open the downloaded installer
2. **IMPORTANT**: Check the box "Add Python 3.12 to PATH" at the bottom
3. Click "Install Now"
4. Wait for installation to complete
5. Click "Close"

### Verify Python Installation
1. Open Command Prompt (Win + R, type `cmd`, press Enter)
2. Type: `python --version`
3. You should see: `Python 3.12.x` (or similar)

If you see "python is not recognized", go back and make sure you checked "Add Python to PATH"

## Step 2: Install Ollama (10 minutes)

### Download Ollama
1. Go to https://ollama.ai
2. Click "Download for Windows"
3. Save the installer to your Downloads folder

### Install Ollama
1. Open the downloaded installer
2. Click "Install"
3. Wait for installation to complete
4. Ollama will start automatically

### Verify Ollama is Running
1. Open Command Prompt
2. Type: `curl http://localhost:11434/api/tags`
3. You should see a response (not an error)

If you see an error, Ollama might not be running. Check the system tray (bottom right) for the Ollama icon.

## Step 3: Download AI Model (10-20 minutes)

This downloads the AI model that powers the bot. First time only.

### Download Llama 3 Model
1. Open Command Prompt
2. Type: `ollama pull llama3`
3. Wait for download to complete (4-5GB)

You should see:
```
pulling manifest
pulling 6a0746a1ec1a
...
success
```

**Alternative: Faster Model (if Llama 3 is too slow)**
```
ollama pull mistral
```

## Step 4: Extract Your Bot Files (2 minutes)

### Extract ZIP File
1. Go to your Downloads folder
2. Right-click `discord-ai-ticket-bot.zip`
3. Select "Extract All..."
4. Choose where to extract (e.g., `C:\Users\YourName\Desktop\discord-ai-ticket-bot`)
5. Click "Extract"

### Open Bot Folder
1. Navigate to the extracted folder
2. You should see folders: `bot`, `data`, `logs`
3. And files: `README.md`, `SETUP.md`, `QUICKSTART.md`, etc.

## Step 5: Create Discord Bot Token (5 minutes)

### Create Application
1. Go to https://discord.com/developers/applications
2. Click "New Application"
3. Name it: `AI Ticket Bot`
4. Click "Create"

### Create Bot
1. In the left sidebar, click "Bot"
2. Click "Add Bot"
3. Under "TOKEN", click "Copy"
4. **Save this token somewhere safe** - you'll need it soon!

### Configure Permissions
1. In the left sidebar, click "OAuth2"
2. Click "URL Generator"
3. Under "SCOPES", select: `bot`
4. Under "PERMISSIONS", select:
   - ✓ Read Messages/View Channels
   - ✓ Send Messages
   - ✓ Create Public Threads
   - ✓ Create Private Threads
   - ✓ Send Messages in Threads
   - ✓ Manage Threads
   - ✓ Manage Channels

5. Copy the generated URL at the bottom
6. Open the URL in your browser
7. Select your Discord server
8. Click "Authorize"

## Step 6: Setup Bot Configuration (3 minutes)

### Find Your Server ID
1. In Discord, go to User Settings (gear icon)
2. Go to "Advanced" tab
3. Enable "Developer Mode"
4. Right-click your server name
5. Click "Copy Server ID"
6. Save this ID

### Create .env File
1. Open Notepad
2. Paste the following:

```
DISCORD_TOKEN=paste_your_token_here
DISCORD_GUILD_ID=paste_your_server_id_here
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3
BOT_PREFIX=!
LOG_LEVEL=INFO
DB_PATH=./data/training.db
SIMILARITY_THRESHOLD=0.7
MAX_CONTEXT_LENGTH=2000
ENABLE_AUTO_RESPONSE=true
ENABLE_TRAINING=true
RESPONSE_TIMEOUT=30
```

3. Replace:
   - `paste_your_token_here` with your Discord bot token
   - `paste_your_server_id_here` with your server ID

4. Save As:
   - Filename: `.env`
   - Location: `C:\Users\YourName\Desktop\discord-ai-ticket-bot\bot\`
   - File type: "All Files (*.*)"
   - Click "Save"

**Important**: Make sure the file is named `.env` (with the dot), not `.env.txt`

## Step 7: Install Python Dependencies (3 minutes)

### Open Command Prompt in Bot Folder
1. Navigate to `C:\Users\YourName\Desktop\discord-ai-ticket-bot\bot\`
2. Hold Shift and right-click in empty space
3. Select "Open PowerShell window here"

### Install Requirements
1. Type: `pip install -r ../requirements.txt`
2. Wait for installation to complete

You should see:
```
Successfully installed discord-py aiohttp ollama ...
```

## Step 8: Run the Bot (2 minutes)

### Terminal 1: Start Ollama
1. Open Command Prompt
2. Type: `ollama serve`
3. Wait for it to say: `Listening on 127.0.0.1:11434`
4. **Keep this window open**

### Terminal 2: Start Bot
1. Open a new Command Prompt
2. Navigate to bot folder: `cd C:\Users\YourName\Desktop\discord-ai-ticket-bot\bot`
3. Type: `python run.py`
4. Wait for it to say:
   ```
   ✓ Bot logged in as AI Ticket Bot#1234
   ✓ Ollama connection successful
   ```

**Success!** Your bot is now running! 🎉

## Step 9: Setup in Discord (2 minutes)

### Create Forum Channel
1. In Discord, right-click your server name
2. Select "Create Channel"
3. Name it: `support-tickets`
4. Channel type: "Forum"
5. Click "Create Channel"

### Create Staff Role
1. Go to Server Settings > Roles
2. Click "Create Role"
3. Name it: `Support Staff`
4. Click "Save"

### Configure Bot
1. In Discord, type: `/setup`
2. Select the `support-tickets` forum channel
3. Select the `Support Staff` role
4. Press Enter

You should see: "✓ Bot Setup Complete"

### Create Ticket Panel
1. Type: `/ticket_panel`
2. Press Enter

You should see a panel with category buttons (Billing, Technical, General)

## Step 10: Test the Bot (1 minute)

### Create a Test Ticket
1. Click one of the category buttons on the ticket panel
2. A new thread should be created
3. Type a message: "Hello, can you help me?"
4. The bot should respond within 5-10 seconds

**If bot responds**: Everything is working! ✓

**If bot doesn't respond**: Check:
- Is Ollama window still showing "Listening on 127.0.0.1:11434"?
- Is the bot window still running?
- Check the bot window for error messages

## Step 11: Train Your Bot (Optional)

### Add Training Data
1. In Discord, type: `/train`
2. Fill in:
   - **question**: "How do I reset my password?"
   - **answer**: "Click Settings > Account > Reset Password"
   - **category**: "account"
3. Press Enter

You should see: "✓ Training Added"

### View Training Data
1. Type: `/training_list`
2. You should see your training entry

### Check Status
1. Type: `/status`
2. You should see:
   - Ollama Server: ✓ Online
   - Training Entries: 1
   - Total Conversations: 1

## Troubleshooting for Windows 11

### "Python is not recognized"
**Solution**: 
1. Go to Control Panel > System > Advanced system settings
2. Click "Environment Variables"
3. Under "User variables", click "New"
4. Variable name: `PATH`
5. Variable value: `C:\Users\YourName\AppData\Local\Programs\Python\Python312`
6. Click OK and restart Command Prompt

### "Ollama connection failed"
**Solution**:
1. Check if Ollama is running (look for icon in system tray)
2. If not running, search for "Ollama" in Start menu and click it
3. Wait 10 seconds for it to start
4. Try bot again

### "Bot doesn't respond"
**Solution**:
1. Check both windows are still running
2. In bot window, look for errors
3. Try `/status` command
4. If Ollama shows offline, restart it

### "Port 11434 already in use"
**Solution**:
1. Open Command Prompt
2. Type: `netstat -ano | findstr 11434`
3. Note the PID number
4. Type: `taskkill /PID <number> /F`
5. Restart Ollama

### "Database locked" error
**Solution**:
1. Close bot window (Ctrl+C)
2. Wait 5 seconds
3. Restart bot: `python run.py`

### ".env file not found" error
**Solution**:
1. Make sure file is named `.env` (not `.env.txt`)
2. Make sure it's in the `bot/` folder
3. In Notepad, go to File > Save As
4. File type: "All Files (*.*)"
5. Name: `.env`

## Keeping Bot Running 24/7 (Optional)

### Using Task Scheduler
1. Open Task Scheduler (search in Start menu)
2. Click "Create Basic Task"
3. Name: "Discord AI Bot"
4. Trigger: "At startup"
5. Action: "Start a program"
6. Program: `C:\Users\YourName\AppData\Local\Programs\Python\Python312\python.exe`
7. Arguments: `C:\path\to\bot\run.py`
8. Click "Finish"

**Note**: You also need to keep Ollama running. Create another task for `ollama serve`.

### Using Batch Script
1. Create a file named `start-bot.bat` in your bot folder
2. Paste:
```batch
@echo off
cd /d %~dp0
python run.py
pause
```
3. Double-click to run

## Common Commands Reference

```
/setup [forum_channel] [staff_role]     - Configure bot
/ticket_panel                            - Create ticket UI
/train question:"..." answer:"..."       - Train bot
/training_list                           - View training data
/status                                  - Check health
/test_ai prompt:"..."                    - Test AI
/close_ticket                            - Close ticket
/export_training                         - Backup data
```

## File Locations on Windows 11

- **Bot folder**: `C:\Users\YourName\Desktop\discord-ai-ticket-bot\bot\`
- **.env file**: `C:\Users\YourName\Desktop\discord-ai-ticket-bot\bot\.env`
- **Database**: `C:\Users\YourName\Desktop\discord-ai-ticket-bot\data\training.db`
- **Logs**: `C:\Users\YourName\Desktop\discord-ai-ticket-bot\logs\bot.log`
- **Python**: `C:\Users\YourName\AppData\Local\Programs\Python\Python312\`
- **Ollama**: `C:\Users\YourName\AppData\Local\Programs\Ollama\`

## Performance Tips for Windows 11

1. **Use GPU Acceleration** (if you have NVIDIA GPU):
   - Install NVIDIA CUDA Toolkit
   - Ollama will automatically use GPU
   - Much faster responses (2-3 seconds vs 10 seconds)

2. **Reduce Response Time**:
   - Use smaller model: `ollama pull mistral`
   - Update `.env`: `OLLAMA_MODEL=mistral`

3. **Monitor Resources**:
   - Open Task Manager (Ctrl+Shift+Esc)
   - Watch CPU and RAM usage
   - If >90% RAM, close other apps

4. **Increase RAM**:
   - If responses are very slow, consider upgrading RAM
   - Minimum 4GB, recommended 8GB+

## Next Steps

1. ✓ Python installed
2. ✓ Ollama installed
3. ✓ Model downloaded
4. ✓ Bot configured
5. ✓ Bot running
6. **Next**: Train your bot with your support responses!

## Support & Help

- **Setup issues**: See SETUP.md
- **Troubleshooting**: See TROUBLESHOOTING.md
- **Examples**: See EXAMPLES.md
- **Architecture**: See ARCHITECTURE.md

---

**Congratulations!** You now have a working AI ticket bot on Windows 11! 🚀

If you encounter any issues, check the TROUBLESHOOTING.md file or review the error messages in the bot window.
