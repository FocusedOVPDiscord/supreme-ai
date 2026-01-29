const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/bot.db');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// NUCLEAR OPTION: Initialize database with absolutely NO foreign key enforcement
const db = new Database(dbPath);
db.pragma('foreign_keys = OFF');

// Initialize tables without ANY foreign key references in the SQL
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
`);

console.log('🚀 [DATABASE] Nuclear initialization complete.');
console.log('🛡️ [DATABASE] Foreign keys are strictly DISABLED.');

module.exports = {
    addTraining: (query, response, category = 'general') => {
        try {
            return db.prepare('INSERT INTO training (query, response, category) VALUES (?, ?, ?)').run(query, response, category);
        } catch (e) { return null; }
    },
    
    getAllTraining: () => {
        try { return db.prepare('SELECT * FROM training ORDER BY created_at DESC').all(); } catch (e) { return []; }
    },
    
    getTrainingByCategory: (category) => {
        try { return db.prepare('SELECT * FROM training WHERE category = ? ORDER BY created_at DESC').all(category); } catch (e) { return []; }
    },
    
    deleteTraining: (id) => {
        try { return db.prepare('DELETE FROM training WHERE id = ?').run(id); } catch (e) { return null; }
    },
    
    updateTraining: (id, query, response, category) => {
        try {
            return db.prepare('UPDATE training SET query = ?, response = ?, category = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(query, response, category, id);
        } catch (e) { return null; }
    },
    
    searchSimilar: (query) => {
        try {
            const q = query.toLowerCase();
            let res = db.prepare('SELECT * FROM training WHERE LOWER(query) = ? LIMIT 1').get(q);
            if (res) return res;
            res = db.prepare('SELECT * FROM training WHERE LOWER(query) LIKE ? ORDER BY usage_count DESC LIMIT 1').get(`%${q}%`);
            return res;
        } catch (e) { return null; }
    },
    
    incrementUsage: (id) => {
        try { return db.prepare('UPDATE training SET usage_count = usage_count + 1 WHERE id = ?').run(id); } catch (e) { return null; }
    },
    
    createTicket: (id, userId, category = 'general') => {
        try {
            return db.prepare('INSERT OR IGNORE INTO tickets (id, user_id, category) VALUES (?, ?, ?)').run(id, userId, category);
        } catch (e) { return null; }
    },
    
    updateTicketStatus: (id, status) => {
        try {
            return db.prepare('UPDATE tickets SET status = ?, closed_at = CASE WHEN ? = \'closed\' THEN CURRENT_TIMESTAMP ELSE closed_at END WHERE id = ?').run(status, status, id);
        } catch (e) { return null; }
    },
    
    getTicket: (id) => {
        try { return db.prepare('SELECT * FROM tickets WHERE id = ?').get(id); } catch (e) { return null; }
    },
    
    getAllTickets: (status = null) => {
        try {
            if (status) return db.prepare('SELECT * FROM tickets WHERE status = ? ORDER BY created_at DESC').all(status);
            return db.prepare('SELECT * FROM tickets ORDER BY created_at DESC').all();
        } catch (e) { return []; }
    },
    
    // THE CRITICAL FUNCTION
    addConversation: (ticketId, userId, message, isAi = 0) => {
        try {
            // Step 1: Force disable foreign keys again for this session
            db.pragma('foreign_keys = OFF');
            
            // Step 2: Ensure the ticket entry exists (no constraint, just for logic)
            db.prepare('INSERT OR IGNORE INTO tickets (id, user_id, status) VALUES (?, ?, \'open\')').run(ticketId, userId);
            
            // Step 3: Insert conversation
            const stmt = db.prepare('INSERT INTO conversations (ticket_id, user_id, message, is_ai) VALUES (?, ?, ?, ?)');
            return stmt.run(ticketId, userId, message, isAi);
        } catch (error) {
            console.error('⚠️ [DATABASE ERROR] Blocked a potential crash:', error.message);
            return null;
        }
    },
    
    getTicketHistory: (ticketId, limit = 10) => {
        try { return db.prepare('SELECT * FROM conversations WHERE ticket_id = ? ORDER BY created_at DESC LIMIT ?').all(ticketId, limit).reverse(); } catch (e) { return []; }
    },
    
    getAllConversations: (ticketId) => {
        try { return db.prepare('SELECT * FROM conversations WHERE ticket_id = ? ORDER BY created_at ASC').all(ticketId); } catch (e) { return []; }
    },
    
    getStats: () => {
        try {
            return { 
                trainingCount: db.prepare('SELECT COUNT(*) as count FROM training').get().count, 
                ticketCount: db.prepare("SELECT COUNT(*) as count FROM tickets WHERE status = 'open'").get().count, 
                conversationCount: db.prepare('SELECT COUNT(*) as count FROM conversations').get().count, 
                totalTickets: db.prepare('SELECT COUNT(*) as count FROM tickets').get().count 
            };
        } catch (e) { return { trainingCount: 0, ticketCount: 0, conversationCount: 0, totalTickets: 0 }; }
    },
    
    getTopTraining: (limit = 10) => {
        try { return db.prepare('SELECT * FROM training ORDER BY usage_count DESC LIMIT ?').all(limit); } catch (e) { return []; }
    },
    
    exportData: () => {
        try {
            return { training: db.prepare('SELECT * FROM training').all(), tickets: db.prepare('SELECT * FROM tickets').all(), conversations: db.prepare('SELECT * FROM conversations').all() };
        } catch (e) { return { training: [], tickets: [], conversations: [] }; }
    },
    
    importTraining: (data) => {
        try {
            const stmt = db.prepare('INSERT INTO training (query, response, category, usage_count) VALUES (?, ?, ?, ?)');
            db.transaction((items) => { for (const item of items) stmt.run(item.query, item.response, item.category || 'general', item.usage_count || 0); })(data);
        } catch (e) {}
    },
    
    clearOldConversations: (daysOld = 30) => {
        try { return db.prepare('DELETE FROM conversations WHERE created_at < datetime(\'now\', \'-\' || ? || \' days\')').run(daysOld); } catch (e) { return null; }
    },
    
    vacuum: () => { try { db.exec('VACUUM'); } catch (e) {} }
};
