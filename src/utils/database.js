const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/bot.db');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

// Initialize tables with enhanced schema
db.exec(`
    CREATE TABLE IF NOT EXISTS training (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        query TEXT NOT NULL,
        response TEXT NOT NULL,
        category TEXT DEFAULT 'general',
        usage_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tickets (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        category TEXT DEFAULT 'general',
        status TEXT DEFAULT 'open',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        closed_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticket_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        message TEXT NOT NULL,
        is_ai INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_training_query ON training(query);
    CREATE INDEX IF NOT EXISTS idx_conversations_ticket ON conversations(ticket_id);
    CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
`);

console.log('✅ Database initialized at:', dbPath);

module.exports = {
    // Training data management
    addTraining: (query, response, category = 'general') => {
        const stmt = db.prepare('INSERT INTO training (query, response, category) VALUES (?, ?, ?)');
        const result = stmt.run(query, response, category);
        console.log(`✅ Training added: ID ${result.lastInsertRowid}`);
        return result;
    },
    
    getAllTraining: () => {
        return db.prepare('SELECT * FROM training ORDER BY created_at DESC').all();
    },
    
    getTrainingByCategory: (category) => {
        return db.prepare('SELECT * FROM training WHERE category = ? ORDER BY created_at DESC').all(category);
    },
    
    deleteTraining: (id) => {
        const result = db.prepare('DELETE FROM training WHERE id = ?').run(id);
        console.log(`✅ Training deleted: ID ${id}`);
        return result;
    },
    
    updateTraining: (id, query, response, category) => {
        const stmt = db.prepare('UPDATE training SET query = ?, response = ?, category = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
        return stmt.run(query, response, category, id);
    },
    
    // Search for similar training data (fuzzy matching)
    searchSimilar: (query) => {
        const lowerQuery = query.toLowerCase();
        
        // Try exact match first
        let result = db.prepare('SELECT * FROM training WHERE LOWER(query) = ? LIMIT 1').get(lowerQuery);
        if (result) return result;
        
        // Try partial match
        result = db.prepare('SELECT * FROM training WHERE LOWER(query) LIKE ? ORDER BY usage_count DESC LIMIT 1').get(`%${lowerQuery}%`);
        if (result) return result;
        
        // Try word-based matching
        const words = lowerQuery.split(/\s+/).filter(w => w.length > 3);
        if (words.length > 0) {
            const conditions = words.map(() => 'LOWER(query) LIKE ?').join(' OR ');
            const params = words.map(w => `%${w}%`);
            result = db.prepare(`SELECT * FROM training WHERE ${conditions} ORDER BY usage_count DESC LIMIT 1`).get(...params);
        }
        
        return result;
    },
    
    incrementUsage: (id) => {
        return db.prepare('UPDATE training SET usage_count = usage_count + 1 WHERE id = ?').run(id);
    },
    
    // Ticket management
    createTicket: (id, userId, category = 'general') => {
        try {
            const stmt = db.prepare('INSERT INTO tickets (id, user_id, category) VALUES (?, ?, ?)');
            return stmt.run(id, userId, category);
        } catch (error) {
            // Ticket might already exist, ignore
            console.log(`ℹ️ Ticket ${id} already exists`);
            return null;
        }
    },
    
    updateTicketStatus: (id, status) => {
        const stmt = db.prepare('UPDATE tickets SET status = ?, closed_at = CASE WHEN ? = "closed" THEN CURRENT_TIMESTAMP ELSE closed_at END WHERE id = ?');
        return stmt.run(status, status, id);
    },
    
    getTicket: (id) => {
        return db.prepare('SELECT * FROM tickets WHERE id = ?').get(id);
    },
    
    getAllTickets: (status = null) => {
        if (status) {
            return db.prepare('SELECT * FROM tickets WHERE status = ? ORDER BY created_at DESC').all(status);
        }
        return db.prepare('SELECT * FROM tickets ORDER BY created_at DESC').all();
    },
    
    // Conversation management
    addConversation: (ticketId, userId, message, isAi = 0) => {
        // Ensure ticket exists
        const ticket = db.prepare('SELECT id FROM tickets WHERE id = ?').get(ticketId);
        if (!ticket) {
            // Auto-create ticket if it doesn't exist
            db.prepare('INSERT OR IGNORE INTO tickets (id, user_id) VALUES (?, ?)').run(ticketId, userId);
        }
        
        const stmt = db.prepare('INSERT INTO conversations (ticket_id, user_id, message, is_ai) VALUES (?, ?, ?, ?)');
        return stmt.run(ticketId, userId, message, isAi);
    },
    
    getTicketHistory: (ticketId, limit = 10) => {
        return db.prepare('SELECT * FROM conversations WHERE ticket_id = ? ORDER BY created_at DESC LIMIT ?').all(ticketId, limit).reverse();
    },
    
    getAllConversations: (ticketId) => {
        return db.prepare('SELECT * FROM conversations WHERE ticket_id = ? ORDER BY created_at ASC').all(ticketId);
    },
    
    // Statistics
    getStats: () => {
        const trainingCount = db.prepare('SELECT COUNT(*) as count FROM training').get().count;
        const ticketCount = db.prepare("SELECT COUNT(*) as count FROM tickets WHERE status = 'open'").get().count;
        const conversationCount = db.prepare('SELECT COUNT(*) as count FROM conversations').get().count;
        const totalTickets = db.prepare('SELECT COUNT(*) as count FROM tickets').get().count;
        
        return { 
            trainingCount, 
            ticketCount, 
            conversationCount,
            totalTickets
        };
    },
    
    getTopTraining: (limit = 10) => {
        return db.prepare('SELECT * FROM training ORDER BY usage_count DESC LIMIT ?').all(limit);
    },
    
    // Export/Import functionality
    exportData: () => {
        return {
            training: db.prepare('SELECT * FROM training').all(),
            tickets: db.prepare('SELECT * FROM tickets').all(),
            conversations: db.prepare('SELECT * FROM conversations').all()
        };
    },
    
    importTraining: (data) => {
        const stmt = db.prepare('INSERT INTO training (query, response, category, usage_count) VALUES (?, ?, ?, ?)');
        const insertMany = db.transaction((items) => {
            for (const item of items) {
                stmt.run(item.query, item.response, item.category || 'general', item.usage_count || 0);
            }
        });
        insertMany(data);
    },
    
    // Database maintenance
    clearOldConversations: (daysOld = 30) => {
        const stmt = db.prepare(`DELETE FROM conversations WHERE created_at < datetime('now', '-' || ? || ' days')`);
        return stmt.run(daysOld);
    },
    
    vacuum: () => {
        db.exec('VACUUM');
        console.log('✅ Database optimized');
    }
};
