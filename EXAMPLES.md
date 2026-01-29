# Discord AI Ticket Bot - Examples & Usage Scenarios

This document provides practical examples of how to use the Discord AI Ticket Bot in real-world scenarios.

## Example 1: E-Commerce Support Bot

### Setup
```
/setup [forum_channel] [support_staff_role]
/ticket_panel title:"Customer Support" categories:"Shipping,Returns,Billing,Technical"
```

### Training Data
```
/train question:"How do I track my order?" answer:"You can track your order using the tracking number sent to your email. Visit our tracking page at shop.example.com/track" category:"shipping"

/train question:"What's your return policy?" answer:"We accept returns within 30 days of purchase. Items must be unused and in original packaging. Contact support for a return label." category:"returns"

/train question:"How do I get a refund?" answer:"Refunds are processed within 5-7 business days after we receive your return. You'll receive an email confirmation." category:"returns"

/train question:"Can I change my payment method?" answer:"You can update your payment method in account settings. Go to Settings > Payment Methods > Add New Card" category:"billing"
```

### User Interaction
1. Customer clicks "Shipping" category
2. Creates ticket: "Where is my order?"
3. Bot searches training data and finds similar match
4. Bot responds: "You can track your order using the tracking number sent to your email..."
5. Customer satisfied, ticket auto-closes

## Example 2: SaaS Technical Support

### Training Data
```
/train question:"How do I reset my password?" answer:"Click 'Forgot Password' on the login page. Check your email for a reset link. If you don't see it, check spam folder." category:"account"

/train question:"API rate limit exceeded" answer:"Free tier has 1000 requests/hour. Upgrade to Pro for 10,000 requests/hour. See pricing at app.example.com/pricing" category:"technical"

/train question:"How do I export data?" answer:"Go to Settings > Data Export. Select date range and format (CSV/JSON). Export will be emailed within 24 hours." category:"technical"

/train question:"Integration not working" answer:"1. Check API key is correct\n2. Verify webhook URL is accessible\n3. Check logs in Settings > Webhooks\n4. Contact support with error message" category:"technical"
```

### Advanced Usage
```
/test_ai prompt:"My API keeps returning 401 errors"
# Bot generates contextual response about authentication issues

/training_stats
# Shows 4 training entries, 12 conversations, 2 open tickets

/export_training
# Downloads backup of all training data
```

## Example 3: Community Discord Server

### Setup for Multiple Categories
```
/kb_create name:"gaming-support" description:"Gaming help and troubleshooting"
/kb_add kb_name:"gaming-support" query:"Game won't launch" response:"Try: 1) Restart launcher 2) Verify files 3) Update drivers 4) Reinstall" category:"technical"

/kb_create name:"account-help" description:"Account and profile help"
/kb_add kb_name:"account-help" query:"How to enable 2FA?" response:"Settings > Security > Two-Factor Auth > Enable > Scan QR code with authenticator app" category:"account"
```

### Workflow
1. Community member creates ticket in "Support" forum
2. Bot automatically searches knowledge bases
3. If match found (>85% similarity), uses trained response
4. If no match, generates response using AI
5. Staff can review and close ticket

## Example 4: Training Workflow

### Initial Setup
```
# Create knowledge base for your domain
/kb_create name:"product-docs" description:"Product documentation and FAQs"

# Add initial training data
/kb_add kb_name:"product-docs" query:"What are the system requirements?" response:"Minimum: Windows 10, 4GB RAM, 2GB disk space" category:"technical"

# Check what we've trained
/kb_view kb_name:"product-docs"
```

### Continuous Learning
```
# After handling support tickets, add new patterns
/train question:"Can I use this on Mac?" answer:"Yes, we support Mac OS 10.15+. Download from our website." category:"technical"

# Monitor usage
/training_stats
# Output: 15 training entries, 45 conversations, 3 open tickets

# Export for backup
/export_training
```

### Import from External Source
```
# If you have existing FAQ data
/kb_import kb_name:"imported-faq" file:"faq_backup.json"

# Verify import
/kb_view kb_name:"imported-faq"
```

## Example 5: Response Generation Flow

### Scenario: User asks about password reset

**Step 1: User Message**
```
User: "I forgot my password, how do I reset it?"
```

**Step 2: Bot Processing**
- Searches training data for similar queries
- Finds: "How do I reset my password?" with 92% similarity
- Similarity > 85%, so uses trained response

**Step 3: Bot Response**
```
Bot: "Click 'Forgot Password' on the login page. Check your email for a reset link. 
If you don't see it, check spam folder."
```

**Step 4: Database Update**
- Increments usage count for that training entry
- Stores conversation in history
- Updates ticket context

### Alternative Scenario: Novel Question

**Step 1: User Message**
```
User: "Can I use this with my custom domain?"
```

**Step 2: Bot Processing**
- Searches training data - no match found
- Similarity threshold not met
- Sends to Ollama for AI generation

**Step 3: AI Generation**
```
System Prompt: "You are a helpful support bot. Use the following context...
Known Solutions: [training data]
Conversation History: [previous messages]"

User Query: "Can I use this with my custom domain?"
```

**Step 4: Bot Response**
```
Bot: "Yes, custom domain support is available on our Pro plan and above. 
You can configure it in Settings > Domains. For setup help, see our documentation 
at docs.example.com/custom-domains"
```

## Example 6: Admin Monitoring

### Daily Monitoring
```
/status
# Output:
# ✓ Ollama Server: Online
# ✓ Active Model: llama3
# Training Entries: 25
# Conversations: 156
# Open Tickets: 3
```

### Performance Analysis
```
/training_stats
# Shows which responses are most used
# Identifies gaps in training data

/kb_search kb_name:"support" query:"error"
# Finds all training entries related to errors
# Helps identify common issues
```

### Backup & Restore
```
# Regular backups
/export_training
# Save to secure location

# If needed, restore
/import_training kb_name:"support" file:"backup.json"
```

## Example 7: Multi-Language Support (Future)

```
# Train bot in multiple languages
/train question:"¿Cómo restablezco mi contraseña?" answer:"Haz clic en 'Olvidé mi contraseña'..." category:"account" tags:"spanish"

/train question:"Wie setze ich mein Passwort zurück?" answer:"Klicken Sie auf 'Passwort vergessen'..." category:"account" tags:"german"

# Bot automatically detects language and responds appropriately
```

## Example 8: Custom Model Configuration

### Using Different Models
```
# Switch to faster model
# Edit .env: OLLAMA_MODEL=mistral
# Restart bot

# Test performance
/test_ai prompt:"What is your response time now?"

# Monitor quality
/training_stats
```

### Fine-tuning for Domain
```
# Create custom model based on Llama 3
# ollama create my-support-bot -f Modelfile

# Update configuration
# OLLAMA_MODEL=my-support-bot

# Test with domain-specific queries
/test_ai prompt:"What's your API rate limit?"
```

## Example 9: Ticket Lifecycle

### Ticket Creation
```
User clicks "Technical Support" button
→ Thread created: "Technical Support - john_doe"
→ Bot stores ticket context in database
```

### Handling
```
User: "My app crashes on startup"
Bot: [generates response based on training]
User: "I tried that, still doesn't work"
Bot: [uses conversation context for better response]
```

### Resolution
```
User: "That fixed it, thanks!"
Admin: /close_ticket
→ Thread archived
→ Ticket marked as closed
→ Conversation stored for future reference
```

## Example 10: Scaling to Multiple Servers

### Setup for Multiple Guilds
```
# Each server can have its own configuration
# Bot stores separate training data per server
# Use DISCORD_GUILD_ID to target specific server

# Server 1: E-commerce support
/setup [forum_channel_1] [staff_role_1]

# Server 2: Community support
/setup [forum_channel_2] [staff_role_2]

# Each maintains separate training data
/training_list  # Shows only current server's data
```

## Performance Tips

### For High-Volume Support
1. **Use smaller model**: Mistral 7B instead of Llama 3
2. **Increase training data**: More patterns = faster responses
3. **Optimize context**: Reduce `MAX_CONTEXT_LENGTH` if needed
4. **Monitor resources**: Watch CPU/RAM usage

### For Quality Responses
1. **Comprehensive training**: Cover all common scenarios
2. **Regular updates**: Add new patterns as issues arise
3. **Review AI responses**: Ensure quality before deployment
4. **Use appropriate model**: Llama 3 for complex queries

## Troubleshooting Examples

### Bot Not Responding
```
/status
# Check if Ollama is online
# If offline, start: ollama serve

/test_ai prompt:"Hello"
# Test if AI is working
```

### Slow Responses
```
# Check model size
ollama list

# Switch to faster model
# Edit .env: OLLAMA_MODEL=mistral
# Restart bot

# Monitor performance
/status
```

### Database Issues
```
# Check database exists
ls -la data/training.db

# Reset if corrupted
rm data/training.db
# Bot will recreate on next start
```

---

**Next Steps**: Customize these examples for your specific use case and start training your bot!
