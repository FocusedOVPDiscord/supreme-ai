# Troubleshooting Guide

Solutions to common issues with the Discord AI Ticket Bot.

## Connection Issues

### Ollama Connection Failed

**Error**: `Ollama connection failed - AI features will be limited`

**Causes & Solutions**:

1. **Ollama not running**
   ```bash
   # Check if Ollama is running
   curl http://localhost:11434/api/tags
   
   # If not running, start it
   ollama serve
   ```

2. **Wrong URL in .env**
   ```bash
   # Check OLLAMA_URL setting
   cat bot/.env | grep OLLAMA_URL
   
   # Should be: http://localhost:11434
   # Update if needed and restart bot
   ```

3. **Firewall blocking connection**
   - Windows: Check Windows Defender Firewall
   - Mac: Check System Preferences > Security & Privacy
   - Linux: Check firewall rules with `ufw status`

4. **Port already in use**
   ```bash
   # Check if port 11434 is in use
   # Windows: netstat -ano | findstr 11434
   # Mac/Linux: lsof -i :11434
   
   # If in use, change OLLAMA_URL to different port
   ```

### Discord Bot Token Invalid

**Error**: `Invalid token`

**Solutions**:

1. **Verify token is correct**
   - Go to Discord Developer Portal
   - Applications > Your Bot > Bot > TOKEN > Copy
   - Paste in `.env` file

2. **Token has spaces**
   ```bash
   # Make sure no spaces around token
   DISCORD_TOKEN=your_token_here  # ✓ Correct
   DISCORD_TOKEN= your_token_here  # ✗ Wrong (space)
   ```

3. **Token is expired**
   - Regenerate token in Developer Portal
   - Update `.env` and restart bot

4. **Bot not invited to server**
   - Go to OAuth2 > URL Generator
   - Select `bot` scope and necessary permissions
   - Copy URL and open in browser
   - Select server and authorize

## Performance Issues

### Bot Responses Are Slow

**Symptoms**: Bot takes 30+ seconds to respond

**Solutions**:

1. **Use faster model**
   ```bash
   # Edit .env
   OLLAMA_MODEL=mistral  # Faster than llama3
   
   # Restart bot
   ```

2. **Reduce context length**
   ```bash
   # Edit .env
   MAX_CONTEXT_LENGTH=1000  # Reduced from 2000
   
   # Restart bot
   ```

3. **Increase timeout**
   ```bash
   # Edit .env
   RESPONSE_TIMEOUT=60  # Increased from 30
   
   # Restart bot
   ```

4. **Check system resources**
   ```bash
   # Monitor CPU and RAM
   # Windows: Task Manager
   # Mac: Activity Monitor
   # Linux: top or htop
   
   # If low on RAM, close other applications
   # Consider upgrading system RAM
   ```

5. **Use GPU acceleration**
   - If you have NVIDIA GPU, install CUDA
   - Ollama will automatically use GPU if available
   - Significantly faster inference

### High Memory Usage

**Symptoms**: Bot uses 6GB+ RAM

**Solutions**:

1. **Use smaller model**
   ```bash
   ollama pull mistral  # 4GB vs 7GB for llama3
   
   # Update .env
   OLLAMA_MODEL=mistral
   ```

2. **Reduce batch size**
   - Fewer concurrent requests
   - Process tickets sequentially

3. **Monitor with top/htop**
   ```bash
   # Linux
   top -p $(pgrep -f "ollama serve")
   
   # Or use htop
   htop
   ```

## Database Issues

### Database Locked Error

**Error**: `database is locked`

**Causes**: Multiple processes accessing database simultaneously

**Solutions**:

1. **Restart bot**
   ```bash
   # Kill bot process
   # Restart: python run.py
   ```

2. **Check for multiple instances**
   ```bash
   # Find all Python processes
   # Windows: tasklist | findstr python
   # Mac/Linux: ps aux | grep python
   
   # Kill duplicates if found
   ```

3. **Backup and reset database**
   ```bash
   # Backup first
   cp data/training.db data/training.db.backup
   
   # Reset
   rm data/training.db
   
   # Restart bot (will recreate)
   ```

### Database Corruption

**Error**: `database disk image is malformed`

**Solutions**:

1. **Restore from backup**
   ```bash
   cp data/training.db.backup data/training.db
   ```

2. **Export and reimport**
   ```bash
   # Export training data
   /export_training
   
   # Delete corrupted database
   rm data/training.db
   
   # Restart bot
   # Import data: /import_training
   ```

3. **Fresh start**
   ```bash
   rm data/training.db
   # Bot will recreate on next start
   ```

## Command Issues

### Commands Not Appearing

**Symptoms**: `/train`, `/setup` commands don't show up

**Solutions**:

1. **Sync commands**
   - Discord sometimes delays command sync
   - Wait 5-10 minutes
   - Try restarting bot

2. **Check bot permissions**
   - Bot needs `applications.commands` permission
   - Go to OAuth2 > URL Generator
   - Select `applications.commands` scope
   - Reinvite bot

3. **Check bot role**
   - Bot role must be high enough in role hierarchy
   - Move bot role above other roles in server settings

4. **Verify cogs loaded**
   - Check logs: `logs/bot.log`
   - Look for "Loaded cog:" messages
   - If missing, check for syntax errors

### Command Errors

**Error**: `This interaction failed`

**Solutions**:

1. **Check bot permissions**
   ```
   Bot needs: Send Messages, Create Threads, Manage Threads
   ```

2. **Check user permissions**
   ```
   /setup requires Administrator
   /train requires no special permissions
   ```

3. **Check channel type**
   ```
   /close_ticket only works in ticket threads
   /ticket_panel only works in regular channels
   ```

4. **Check logs for details**
   ```bash
   tail -f logs/bot.log
   # Look for error messages
   ```

## Model Issues

### Model Download Fails

**Error**: `Failed to download model`

**Solutions**:

1. **Check internet connection**
   ```bash
   ping ollama.ai
   ```

2. **Retry download**
   ```bash
   ollama pull llama3  # Will resume if interrupted
   ```

3. **Use alternative model**
   ```bash
   ollama pull mistral  # Smaller, faster to download
   ```

4. **Check disk space**
   ```bash
   # Need at least 8GB free
   # Windows: Check C: drive properties
   # Mac/Linux: df -h
   ```

### Model Not Found

**Error**: `Model not found: llama3`

**Solutions**:

1. **List available models**
   ```bash
   ollama list
   ```

2. **Download model**
   ```bash
   ollama pull llama3
   ```

3. **Update .env**
   ```bash
   # Use model name from ollama list
   OLLAMA_MODEL=llama3
   ```

4. **Restart bot**
   ```bash
   python run.py
   ```

## Training Data Issues

### Training Not Working

**Error**: Training command fails or doesn't save

**Solutions**:

1. **Check if training is enabled**
   ```bash
   # In .env
   ENABLE_TRAINING=true
   ```

2. **Check database permissions**
   ```bash
   # Ensure data/ directory is writable
   # Windows: Right-click > Properties > Security
   # Mac/Linux: chmod 755 data/
   ```

3. **Check for duplicates**
   ```
   Each question must be unique
   /train question:"How to reset?" answer:"..."
   # Second attempt with same question will fail
   ```

4. **Check database size**
   ```bash
   # If database is very large (>100MB)
   # Export and reimport to optimize
   /export_training
   rm data/training.db
   /import_training
   ```

### Training Data Lost

**Error**: Training data disappeared after restart

**Solutions**:

1. **Check database file exists**
   ```bash
   ls -la data/training.db
   ```

2. **Restore from backup**
   ```bash
   cp data/training.db.backup data/training.db
   ```

3. **Check logs for errors**
   ```bash
   grep -i error logs/bot.log
   ```

4. **Verify database integrity**
   ```bash
   sqlite3 data/training.db "SELECT COUNT(*) FROM training_data;"
   ```

## Logging & Debugging

### Enable Debug Logging

```bash
# Edit .env
LOG_LEVEL=DEBUG

# Restart bot
python run.py

# Check logs
tail -f logs/bot.log
```

### Check Recent Logs

```bash
# Last 50 lines
tail -50 logs/bot.log

# Search for errors
grep ERROR logs/bot.log

# Search for specific issue
grep "timeout" logs/bot.log
```

### Clear Logs

```bash
# Backup first
cp logs/bot.log logs/bot.log.backup

# Clear
> logs/bot.log

# Or delete
rm logs/bot.log
```

## System-Specific Issues

### Windows

**Python not found**
```bash
# Add Python to PATH
# Or use full path: C:\Python311\python.exe run.py
```

**Port already in use**
```bash
# Find process using port 11434
netstat -ano | findstr 11434

# Kill process
taskkill /PID <PID> /F
```

### Mac

**Permission denied**
```bash
chmod +x run.py
python3 run.py
```

**M1/M2 Compatibility**
```bash
# Ollama has native M1/M2 support
# Should work out of the box
# If issues, check Ollama version
```

### Linux

**Permission denied**
```bash
chmod +x run.py
python3 run.py
```

**Firewall blocking**
```bash
# Check UFW status
sudo ufw status

# Allow port 11434
sudo ufw allow 11434
```

## Getting Help

### Collect Debug Information

When reporting issues, provide:

1. **Bot logs**
   ```bash
   cat logs/bot.log
   ```

2. **System info**
   ```bash
   # Python version
   python --version
   
   # Ollama version
   ollama --version
   
   # Available models
   ollama list
   ```

3. **Configuration (without token)**
   ```bash
   cat bot/.env | grep -v TOKEN
   ```

4. **Error message**
   - Full error text
   - When it occurred
   - What you were doing

### Resources

- **Discord.py Docs**: https://discordpy.readthedocs.io/
- **Ollama Docs**: https://github.com/ollama/ollama
- **Python Docs**: https://docs.python.org/3/
- **SQLite Docs**: https://www.sqlite.org/docs.html

---

**Still having issues?** Check the logs and compare with examples in EXAMPLES.md
