// Test script for database functionality
require('dotenv').config();
const db = require('./src/utils/database');

console.log('🧪 Testing Supreme AI Database\n');

// Test 1: Add training data
console.log('Test 1: Adding training data...');
try {
    db.addTraining('How do I reset my password?', 'Click on "Forgot Password" on the login page.', 'account');
    db.addTraining('What are your hours?', 'We are available 24/7 to assist you!', 'general');
    db.addTraining('How do I contact support?', 'You can create a ticket or email us at support@example.com', 'support');
    console.log('✅ Training data added successfully\n');
} catch (error) {
    console.error('❌ Failed to add training data:', error.message);
}

// Test 2: List training data
console.log('Test 2: Listing training data...');
try {
    const allTraining = db.getAllTraining();
    console.log(`✅ Found ${allTraining.length} training entries:`);
    allTraining.forEach(entry => {
        console.log(`   - ID ${entry.id}: "${entry.query}" -> "${entry.response.substring(0, 50)}..."`);
    });
    console.log();
} catch (error) {
    console.error('❌ Failed to list training data:', error.message);
}

// Test 3: Search similar
console.log('Test 3: Testing search functionality...');
try {
    const queries = [
        'password reset',
        'what time are you open',
        'how to reach support'
    ];
    
    queries.forEach(query => {
        const result = db.searchSimilar(query);
        if (result) {
            console.log(`✅ Query: "${query}"`);
            console.log(`   Found: "${result.query}"`);
            console.log(`   Response: "${result.response.substring(0, 60)}..."`);
        } else {
            console.log(`❌ No match found for: "${query}"`);
        }
    });
    console.log();
} catch (error) {
    console.error('❌ Search test failed:', error.message);
}

// Test 4: Ticket and conversation management
console.log('Test 4: Testing ticket system...');
try {
    const ticketId = 'ticket-0001';
    const userId = '123456789';
    
    // Add conversation
    db.addConversation(ticketId, userId, 'Hello, I need help with my account');
    db.addConversation(ticketId, 'bot-id', 'Hi! How can I assist you today?', 1);
    db.addConversation(ticketId, userId, 'I forgot my password');
    
    console.log(`✅ Added conversations to ${ticketId}`);
    
    // Get history
    const history = db.getTicketHistory(ticketId, 10);
    console.log(`✅ Retrieved ${history.length} messages from history:`);
    history.forEach(msg => {
        const author = msg.is_ai ? 'AI' : 'User';
        console.log(`   [${author}]: ${msg.message.substring(0, 50)}...`);
    });
    console.log();
} catch (error) {
    console.error('❌ Ticket test failed:', error.message);
}

// Test 5: Statistics
console.log('Test 5: Getting statistics...');
try {
    const stats = db.getStats();
    console.log('✅ Database Statistics:');
    console.log(`   Training Entries: ${stats.trainingCount}`);
    console.log(`   Open Tickets: ${stats.ticketCount}`);
    console.log(`   Total Tickets: ${stats.totalTickets}`);
    console.log(`   Total Messages: ${stats.conversationCount}`);
    console.log();
} catch (error) {
    console.error('❌ Stats test failed:', error.message);
}

// Test 6: Usage tracking
console.log('Test 6: Testing usage tracking...');
try {
    const match = db.searchSimilar('password');
    if (match) {
        const beforeUsage = match.usage_count;
        db.incrementUsage(match.id);
        
        const allTraining = db.getAllTraining();
        const updated = allTraining.find(t => t.id === match.id);
        
        console.log(`✅ Usage count updated:`);
        console.log(`   Before: ${beforeUsage}`);
        console.log(`   After: ${updated.usage_count}`);
    }
    console.log();
} catch (error) {
    console.error('❌ Usage tracking test failed:', error.message);
}

// Test 7: Top training
console.log('Test 7: Getting top training data...');
try {
    const topTraining = db.getTopTraining(5);
    console.log(`✅ Top ${topTraining.length} most used responses:`);
    topTraining.forEach((entry, idx) => {
        console.log(`   ${idx + 1}. "${entry.query}" (used ${entry.usage_count} times)`);
    });
    console.log();
} catch (error) {
    console.error('❌ Top training test failed:', error.message);
}

console.log('🎉 All database tests completed!\n');
console.log('Database location:', process.env.DB_PATH || './data/bot.db');
