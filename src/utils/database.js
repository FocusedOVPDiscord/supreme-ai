const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

/**
 * DATABASE PERSISTENCE CONFIGURATION
 */
const pathConfig = require('../../pathConfig');
const finalDbPath = pathConfig.getPath('supreme_final.db');

// --- DEBUG LOGGING FOR VOLUME VERIFICATION ---
console.log('-------------------------------------------');
console.log('🔍 [DATABASE DEBUG] Initialization Started');
console.log(`📂 [DATABASE DEBUG] Target Path: ${finalDbPath}`);
console.log(`📂 [DATABASE DEBUG] Directory: ${path.dirname(finalDbPath)}`);
console.log(`✅ [DATABASE DEBUG] Directory exists: ${fs.existsSync(path.dirname(finalDbPath))}`);
try {
    const testFile = path.join(path.dirname(finalDbPath), '.write_test');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    console.log('📝 [DATABASE DEBUG] Volume Write Test: SUCCESS');
} catch (e) {
    console.error('❌ [DATABASE DEBUG] Volume Write Test: FAILED -', e.message);
}
console.log('-------------------------------------------');

const db = new Database(finalDbPath);
db.pragma('foreign_keys = OFF');

// --- SCHEMA MIGRATION / INITIALIZATION ---
db.exec(`
    CREATE TABLE IF NOT EXISTS training (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        query TEXT NOT NULL,
        response TEXT NOT NULL,
        category TEXT DEFAULT 'general',
        usage_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
`);

// Check and add missing columns for flow features
const tableInfo = db.prepare("PRAGMA table_info(training)").all();
const columns = tableInfo.map(c => c.name);

if (!columns.includes('next_step_id')) {
    console.log('🛠️ [DATABASE] Adding missing column: next_step_id');
    db.exec("ALTER TABLE training ADD COLUMN next_step_id INTEGER");
}
if (!columns.includes('data_point_name')) {
    console.log('🛠️ [DATABASE] Adding missing column: data_point_name');
    db.exec("ALTER TABLE training ADD COLUMN data_point_name TEXT");
}

db.exec(`
    CREATE TABLE IF NOT EXISTS tickets (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        category TEXT DEFAULT 'general',
        status TEXT DEFAULT 'open',
        current_step_id INTEGER,
        collected_data TEXT,
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

console.log('🚀 [DATABASE] Supreme Summary Engine initialized and migrated.');

module.exports = {
    // --- Flow & State Management ---
    getTicket: (ticketId) => {
        try {
            return db.prepare("SELECT * FROM tickets WHERE id = ?").get(ticketId);
        } catch (e) { return null; }
    },

    updateTicketState: (ticketId, stepId, collectedData = null) => {
        try {
            console.log(`💾 [DATABASE DEBUG] Updating Ticket State: ${ticketId} | Step: ${stepId}`);
            if (collectedData !== null) {
                const stmt = db.prepare("UPDATE tickets SET current_step_id = ?, collected_data = ? WHERE id = ?");
                return stmt.run(stepId, JSON.stringify(collectedData), ticketId);
            } else {
                const stmt = db.prepare("UPDATE tickets SET current_step_id = ? WHERE id = ?");
                return stmt.run(stepId, ticketId);
            }
        } catch (e) { 
            console.error(`❌ [DATABASE ERROR] updateTicketState:`, e.message);
            return null; 
        }
    },

    getTrainingById: (id) => {
        try {
            return db.prepare("SELECT * FROM training WHERE id = ?").get(id);
        } catch (e) { return null; }
    },

    // --- Conversation Logging ---
    addConversation: (ticketId, userId, message, isAi = 0) => {
        try {
            console.log(`📝 [DATABASE DEBUG] Saving Conversation: [${ticketId}] ${isAi ? 'AI' : 'User'}: ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`);
            db.prepare("INSERT OR IGNORE INTO tickets (id, user_id, status) VALUES (?, ?, 'open')").run(ticketId, userId);
            const stmt = db.prepare("INSERT INTO conversations (ticket_id, user_id, message, is_ai) VALUES (?, ?, ?, ?)");
            return stmt.run(ticketId, userId, message, isAi);
        } catch (error) {
            console.error('🛡️ [DATABASE SAFETY] Blocked crash:', error.message);
            return null;
        }
    },

    // --- Training System ---
    addTraining: (query, response, category = 'general', nextStepId = null, dataPointName = null) => {
        console.log(`📚 [DATABASE DEBUG] Adding Training Entry: ${query.substring(0, 30)}...`);
        const stmt = db.prepare('INSERT INTO training (query, response, category, next_step_id, data_point_name) VALUES (?, ?, ?, ?, ?)');
        return stmt.run(query, response, category, nextStepId, dataPointName); 
    },
    
    getAllTraining: () => {
        try { return db.prepare('SELECT * FROM training ORDER BY created_at DESC').all(); } catch (e) { return []; }
    },

    getTrainingByCategory: (category) => {
        try { return db.prepare('SELECT * FROM training WHERE category = ? ORDER BY created_at DESC').all(category); } catch (e) { return []; }
    },
    
    deleteTraining: (id) => {
        try { 
            console.log(`🗑️ [DATABASE DEBUG] Deleting Training ID: ${id}`);
            return db.prepare('DELETE FROM training WHERE id = ?').run(id); 
        } catch (e) { return null; }
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
        try { 
            console.log(`🎫 [DATABASE DEBUG] Updating Ticket Status: ${id} -> ${status}`);
            return db.prepare('UPDATE tickets SET status = ? WHERE id = ?').run(status, id); 
        } catch (e) { return null; }
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
        try { 
            console.log(`✅ [DATABASE DEBUG] Ticket Marked Resolved by AI: ${id}`);
            return db.prepare('UPDATE tickets SET ai_resolved = 1 WHERE id = ?').run(id); 
        } catch (e) { return null; }
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
