const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

/**
 * DATABASE PERSISTENCE CONFIGURATION
 * We use /app/data/supreme_final.db which matches the Koyeb Volume mount path.
 */
const dbPath = '/app/data/supreme_final.db';
const dbDir = path.dirname(dbPath);

// Fallback for local testing if /app/data doesn't exist
const finalDbPath = fs.existsSync('/app') ? dbPath : path.join(__dirname, '../../data/supreme_final.db');
const finalDbDir = path.dirname(finalDbPath);

if (!fs.existsSync(finalDbDir)) {
    try {
        fs.mkdirSync(finalDbDir, { recursive: true });
    } catch (e) {
        console.warn('⚠️ Could not create directory, using local fallback');
    }
}

// Open database and STRICTLY DISABLE foreign keys
const db = new Database(finalDbPath);
db.pragma('foreign_keys = OFF');

// Create tables without ANY foreign key keywords in the SQL
db.exec(`
    CREATE TABLE IF NOT EXISTS training (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        query TEXT NOT NULL,
        response TEXT NOT NULL,
        category TEXT DEFAULT 'general',
        next_step_id INTEGER, -- Link to another training ID for multi-step flows
        usage_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tickets (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        category TEXT DEFAULT 'general',
        status TEXT DEFAULT 'open',
        current_step_id INTEGER, -- Tracks which step the user is on in a flow
        collected_data TEXT, -- JSON string to store form data like quantity, items, etc.
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

console.log('🚀 [DATABASE] Supreme Flow Engine initialized at: ' + finalDbPath);

module.exports = {
    // --- Flow & State Management ---
    getTicketState: (ticketId) => {
        try {
            return db.prepare("SELECT current_step_id, collected_data FROM tickets WHERE id = ?").get(ticketId);
        } catch (e) { return null; }
    },

    updateTicketState: (ticketId, stepId, data = null) => {
        try {
            if (data) {
                const stmt = db.prepare("UPDATE tickets SET current_step_id = ?, collected_data = ? WHERE id = ?");
                return stmt.run(stepId, JSON.stringify(data), ticketId);
            } else {
                const stmt = db.prepare("UPDATE tickets SET current_step_id = ? WHERE id = ?");
                return stmt.run(stepId, ticketId);
            }
        } catch (e) { return null; }
    },

    getTrainingById: (id) => {
        try {
            return db.prepare("SELECT * FROM training WHERE id = ?").get(id);
        } catch (e) { return null; }
    },

    // --- Conversation Logging ---
    addConversation: (ticketId, userId, message, isAi = 0) => {
        try {
            db.prepare("INSERT OR IGNORE INTO tickets (id, user_id, status) VALUES (?, ?, 'open')").run(ticketId, userId);
            const stmt = db.prepare("INSERT INTO conversations (ticket_id, user_id, message, is_ai) VALUES (?, ?, ?, ?)");
            return stmt.run(ticketId, userId, message, isAi);
        } catch (error) {
            console.error('🛡️ [DATABASE SAFETY] Blocked crash:', error.message);
            return null;
        }
    },

    // --- Training System ---
    addTraining: (query, response, category = 'general', nextStepId = null) => {
        try { 
            const stmt = db.prepare('INSERT INTO training (query, response, category, next_step_id) VALUES (?, ?, ?, ?)');
            return stmt.run(query, response, category, nextStepId); 
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
    
    searchSimilar: (query) => {
        try {
            const q = query.toLowerCase();
            let res = db.prepare('SELECT * FROM training WHERE LOWER(query) = ? LIMIT 1').get(q);
            if (res) return res;
            return db.prepare('SELECT * FROM training WHERE LOWER(query) LIKE ? ORDER BY usage_count DESC LIMIT 1').get(`%${q}%`);
        } catch (e) { return null; }
    },
    
    incrementUsage: (id) => {
        try { return db.prepare('UPDATE training SET usage_count = usage_count + 1 WHERE id = ?').run(id); } catch (e) { return null; }
    },
    
    updateTicketStatus: (id, status) => {
        try { return db.prepare('UPDATE tickets SET status = ? WHERE id = ?').run(status, id); } catch (e) { return null; }
    },
    
    getTicketHistory: (ticketId, limit = 10) => {
        try { return db.prepare('SELECT * FROM conversations WHERE ticket_id = ? ORDER BY created_at DESC LIMIT ?').all(ticketId, limit).reverse(); } catch (e) { return []; }
    },

    getAllConversations: (ticketId) => {
        try { return db.prepare('SELECT * FROM conversations WHERE ticket_id = ? ORDER BY created_at ASC').all(ticketId); } catch (e) { return []; }
    },

    getAllTickets: (status = null) => {
        try {
            if (status) return db.prepare('SELECT * FROM tickets WHERE status = ? ORDER BY created_at DESC').all(status);
            return db.prepare('SELECT * FROM tickets ORDER BY created_at DESC').all();
        } catch (e) { return []; }
    },

    getTopTraining: (limit = 10) => {
        try { return db.prepare('SELECT * FROM training ORDER BY usage_count DESC LIMIT ?').all(limit); } catch (e) { return []; }
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
    }
};
