const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/bot.db');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize database with foreign keys DISABLED to prevent constraint crashes
const db = new Database(dbPath);
db.pragma('foreign_keys = OFF');

// Initialize tables with enhanced schema
// Note: We use separate exec calls to ensure clarity
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

// Add indexes for performance if they don't exist
try {
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_training_query ON training(query);
        CREATE INDEX IF NOT EXISTS idx_conversations_ticket ON conversations(ticket_id);
        CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
    `);
} catch (e) {
    console.warn('⚠️ Could not create indexes, skipping...');
}

console.log('✅ Database initialized at:', dbPath);
console.log('🔒 Foreign key enforcement: OFF');

module.exports = {
    // Training data management
    addTraining: (query, response, category = 'general') => {
        try {
            const stmt = db.prepare('INSERT INTO training (query, response, category) VALUES (?, ?, ?)');
            const result = stmt.run(query, response, category);
            return result;
        } catch (error) {
            console.error('❌ Error in addTraining:', error.message);
            return null;
        }
    },
    
    getAllTraining: () => {
        try {
            return db.prepare('SELECT * FROM training ORDER BY created_at DESC').all();
        } catch (error) {
            return [];
        }
    },
    
    getTrainingByCategory: (category) => {
        try {
            return db.prepare('SELECT * FROM training WHERE category = ? ORDER BY created_at DESC').all(category);
        } catch (error) {
            return [];
        }
    },
    
    deleteTraining: (id) => {
        try {
            return db.prepare('DELETE FROM training WHERE id = ?').run(id);
        } catch (error) {
            return null;
        }
    },
    
    updateTraining: (id, query, response, category) => {
        try {
            const stmt = db.prepare('UPDATE training SET query = ?, response = ?, category = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
            return stmt.run(query, response, category, id);
        } catch (error) {
            return null;
        }
    },
    
    searchSimilar: (query) => {
        try {
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
        } catch (error) {
            return null;
        }
    },
    
    incrementUsage: (id) => {
        try {
            return db.prepare('UPDATE training SET usage_count = usage_count + 1 WHERE id = ?').run(id);
        } catch (error) {
            return null;
        }
    },
    
    // Ticket management
    createTicket: (id, userId, category = 'general') => {
        try {
            const stmt = db.prepare('INSERT OR IGNORE INTO tickets (id, user_id, category) VALUES (?, ?, ?)');
            return stmt.run(id, userId, category);
        } catch (error) {
            console.error(`❌ Error creating ticket ${id}:`, error.message);
            return null;
        }
    },
    
    updateTicketStatus: (id, status) => {
        try {
            const stmt = db.prepare('UPDATE tickets SET status = ?, closed_at = CASE WHEN ? = \'closed\' THEN CURRENT_TIMESTAMP ELSE closed_at END WHERE id = ?');
            return stmt.run(status, status, id);
        } catch (error) {
            return null;
        }
    },
    
    getTicket: (id) => {
        try {
            return db.prepare('SELECT * FROM tickets WHERE id = ?').get(id);
        } catch (error) {
            return null;
        }
    },
    
    getAllTickets: (status = null) => {
        try {
            if (status) {
                return db.prepare('SELECT * FROM tickets WHERE status = ? ORDER BY created_at DESC').all(status);
            }
            return db.prepare('SELECT * FROM tickets ORDER BY created_at DESC').all();
        } catch (error) {
            return [];
        }
    },
    
    // Conversation management
    addConversation: (ticketId, userId, message, isAi = 0) => {
        try {
            // Ensure ticket entry exists (no foreign key enforcement, but good for structure)
            db.prepare('INSERT OR IGNORE INTO tickets (id, user_id, status) VALUES (?, ?, \'open\')').run(ticketId, userId);
            
            const stmt = db.prepare('INSERT INTO conversations (ticket_id, user_id, message, is_ai) VALUES (?, ?, ?, ?)');
            return stmt.run(ticketId, userId, message, isAi);
        } catch (error) {
            console.error('❌ Database error in addConversation:', error.message);
            // We do NOT rethrow here to keep the bot alive
            return null;
        }
    },
    
    getTicketHistory: (ticketId, limit = 10) => {
        try {
            return db.prepare('SELECT * FROM conversations WHERE ticket_id = ? ORDER BY created_at DESC LIMIT ?').all(ticketId, limit).reverse();
        } catch (error) {
            return [];
        }
    },
    
    getAllConversations: (ticketId) => {
        try {
            return db.prepare('SELECT * FROM conversations WHERE ticket_id = ? ORDER BY created_at ASC').all(ticketId);
        } catch (error) {
            return [];
        }
    },
    
    // Statistics
    getStats: () => {
        try {
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
        } catch (error) {
            console.error('Error in getStats:', error.message);
            return { trainingCount: 0, ticketCount: 0, conversationCount: 0, totalTickets: 0 };
        }
    },
    
    getTopTraining: (limit = 10) => {
        try {
            return db.prepare('SELECT * FROM training ORDER BY usage_count DESC LIMIT ?').all(limit);
        } catch (error) {
            return [];
        }
    },
    
    // Export/Import functionality
    exportData: () => {
        try {
            return {
                training: db.prepare('SELECT * FROM training').all(),
                tickets: db.prepare('SELECT * FROM tickets').all(),
                conversations: db.prepare('SELECT * FROM conversations').all()
            };
        } catch (error) {
            return { training: [], tickets: [], conversations: [] };
        }
    },
    
    importTraining: (data) => {
        try {
            const stmt = db.prepare('INSERT INTO training (query, response, category, usage_count) VALUES (?, ?, ?, ?)');
            const insertMany = db.transaction((items) => {
                for (const item of items) {
                    stmt.run(item.query, item.response, item.category || 'general', item.usage_count || 0);
                }
            });
            insertMany(data);
        } catch (error) {
            console.error('❌ Error importing training:', error.message);
        }
    },
    
    // Database maintenance
    clearOldConversations: (daysOld = 30) => {
        try {
            const stmt = db.prepare('DELETE FROM conversations WHERE created_at < datetime(\'now\', \'-\' || ? || \' days\')');
            return stmt.run(daysOld);
        } catch (error) {
            return null;
        }
    },
    
    vacuum: () => {
        try {
            db.exec('VACUUM');
            console.log('✅ Database optimized');
        } catch (error) {
            console.error('❌ Vacuum failed:', error.message);
        }
    }
};
