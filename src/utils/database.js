const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// NEW DATABASE FILENAME to force fresh start on Koyeb and bypass old constraints
const dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/supreme_v2.db');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// Open database with NO foreign key enforcement
const db = new Database(dbPath);
db.pragma('foreign_keys = OFF');

// Initialize Clean Schema - NO Foreign Key constraints defined in the SQL
db.exec(`
    CREATE TABLE IF NOT EXISTS training (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        query TEXT NOT NULL,
        response TEXT NOT NULL,
        category TEXT DEFAULT 'general',
        usage_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tickets (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        category TEXT DEFAULT 'general',
        status TEXT DEFAULT 'open',
        ai_resolved INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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

console.log('🚀 [SUPREME V2] Database initialized: ' + dbPath);

module.exports = {
    // --- Training System ---
    addTraining: (query, response, category = 'general') => {
        try {
            return db.prepare('INSERT INTO training (query, response, category) VALUES (?, ?, ?)').run(query, response, category);
        } catch (e) { return null; }
    },
    
    getAllTraining: () => {
        try { return db.prepare('SELECT * FROM training ORDER BY created_at DESC').all(); } catch (e) { return []; }
    },
    
    deleteTraining: (id) => {
        try { return db.prepare('DELETE FROM training WHERE id = ?').run(id); } catch (e) { return null; }
    },
    
    searchSimilar: (query) => {
        try {
            const q = query.toLowerCase();
            // Priority 1: Exact Match
            let res = db.prepare('SELECT * FROM training WHERE LOWER(query) = ? LIMIT 1').get(q);
            if (res) return res;
            // Priority 2: Fuzzy Match
            return db.prepare('SELECT * FROM training WHERE LOWER(query) LIKE ? ORDER BY usage_count DESC LIMIT 1').get(`%${q}%`);
        } catch (e) { return null; }
    },
    
    incrementUsage: (id) => {
        try { return db.prepare('UPDATE training SET usage_count = usage_count + 1 WHERE id = ?').run(id); } catch (e) { return null; }
    },
    
    // --- Ticket System ---
    createTicket: (id, userId, category = 'general') => {
        try {
            return db.prepare('INSERT OR IGNORE INTO tickets (id, user_id, category) VALUES (?, ?, ?)').run(id, userId, category);
        } catch (e) { return null; }
    },
    
    updateTicketStatus: (id, status) => {
        try {
            return db.prepare('UPDATE tickets SET status = ? WHERE id = ?').run(status, id);
        } catch (e) { return null; }
    },
    
    markResolvedByAI: (id) => {
        try { return db.prepare('UPDATE tickets SET ai_resolved = 1 WHERE id = ?').run(id); } catch (e) { return null; }
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

    // --- Conversation Logging (CRASH PROOF) ---
    addConversation: (ticketId, userId, message, isAi = 0) => {
        try {
            // Force create ticket entry if missing
            db.prepare('INSERT OR IGNORE INTO tickets (id, user_id, status) VALUES (?, ?, \'open\')').run(ticketId, userId);
            
            // Log message
            const stmt = db.prepare('INSERT INTO conversations (ticket_id, user_id, message, is_ai) VALUES (?, ?, ?, ?)');
            return stmt.run(ticketId, userId, message, isAi);
        } catch (error) {
            console.error('🛡️ [DATABASE SAFETY] Blocked crash:', error.message);
            return null;
        }
    },
    
    getTicketHistory: (ticketId, limit = 10) => {
        try { return db.prepare('SELECT * FROM conversations WHERE ticket_id = ? ORDER BY created_at DESC LIMIT ?').all(ticketId, limit).reverse(); } catch (e) { return []; }
    }
};
