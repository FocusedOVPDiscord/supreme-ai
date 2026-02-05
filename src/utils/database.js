const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");
const pathConfig = require("../../pathConfig");

const finalDbPath = pathConfig.getPath("supreme_final.db");
let db;

// Helper to run queries as promises
const run = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(query, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

const get = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const all = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const exec = (query) => {
  return new Promise((resolve, reject) => {
    db.exec(query, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};

const api = {
  // --- Flow & State Management ---
  getTicket: async (ticketId) => {
    try {
      return await get("SELECT * FROM tickets WHERE id = ?", [ticketId]);
    } catch (e) {
      return null;
    }
  },

  updateTicketState: async (ticketId, stepId, collectedData = null) => {
    try {
      console.log(
        `💾 [DATABASE DEBUG] Updating Ticket State: ${ticketId} | Step: ${stepId}`
      );
      if (collectedData !== null) {
        return await run(
          "UPDATE tickets SET current_step_id = ?, collected_data = ? WHERE id = ?",
          [stepId, JSON.stringify(collectedData), ticketId]
        );
      } else {
        return await run("UPDATE tickets SET current_step_id = ? WHERE id = ?", [
          stepId,
          ticketId,
        ]);
      }
    } catch (e) {
      console.error(`❌ [DATABASE ERROR] updateTicketState:`, e.message);
      return null;
    }
  },

  getTrainingById: async (id) => {
    try {
      return await get("SELECT * FROM training WHERE id = ?", [id]);
    } catch (e) {
      return null;
    }
  },

  // --- Conversation Logging ---
  addConversation: async (ticketId, userId, message, isAi = 0) => {
    try {
      console.log(
        `📝 [DATABASE DEBUG] Saving Conversation: [${ticketId}] ${
          isAi ? "AI" : "User"
        }: ${message.substring(0, 50)}${message.length > 50 ? "..." : ""}`
      );
      await run(
        "INSERT OR IGNORE INTO tickets (id, user_id, status) VALUES (?, ?, 'open')",
        [ticketId, userId]
      );
      return await run(
        "INSERT INTO conversations (ticket_id, user_id, message, is_ai) VALUES (?, ?, ?, ?)",
        [ticketId, userId, message, isAi]
      );
    } catch (error) {
      console.error("🛡️ [DATABASE SAFETY] Blocked crash:", error.message);
      return null;
    }
  },

  // --- Training System ---
  addTraining: async (
    query,
    response,
    category = "general",
    nextStepId = null,
    dataPointName = null
  ) => {
    console.log(
      `📚 [DATABASE DEBUG] Adding Training Entry: ${query.substring(0, 30)}...`
    );
    return await run(
      "INSERT INTO training (query, response, category, next_step_id, data_point_name) VALUES (?, ?, ?, ?, ?)",
      [query, response, category, nextStepId, dataPointName]
    );
  },

  getAllTraining: async () => {
    try {
      return await all("SELECT * FROM training ORDER BY created_at DESC");
    } catch (e) {
      return [];
    }
  },

  getTrainingByCategory: async (category) => {
    try {
      return await all(
        "SELECT * FROM training WHERE category = ? ORDER BY created_at DESC",
        [category]
      );
    } catch (e) {
      return [];
    }
  },

  deleteTraining: async (id) => {
    try {
      console.log(`🗑️ [DATABASE DEBUG] Deleting Training ID: ${id}`);
      return await run("DELETE FROM training WHERE id = ?", [id]);
    } catch (e) {
      return null;
    }
  },

  searchSimilar: async (query) => {
    try {
      const q = query.toLowerCase().trim();

      // 1. Exact match
      let res = await get("SELECT * FROM training WHERE LOWER(query) = ? LIMIT 1", [
        q,
      ]);
      if (res) return res;

      // 2. Keyword match (if query contains the trained phrase)
      res = await get(
        "SELECT * FROM training WHERE ? LIKE '%' || LOWER(query) || '%' ORDER BY LENGTH(query) DESC LIMIT 1",
        [q]
      );
      if (res) return res;

      // 3. Partial match (if trained phrase contains the query)
      return await get(
        "SELECT * FROM training WHERE LOWER(query) LIKE ? ORDER BY usage_count DESC LIMIT 1",
        [`%${q}%`]
      );
    } catch (e) {
      console.error("❌ [DATABASE] searchSimilar error:", e.message);
      return null;
    }
  },

  incrementUsage: async (id) => {
    try {
      return await run("UPDATE training SET usage_count = usage_count + 1 WHERE id = ?", [
        id,
      ]);
    } catch (e) {
      return null;
    }
  },

  updateTicketStatus: async (id, status) => {
    try {
      console.log(`🎫 [DATABASE DEBUG] Updating Ticket Status: ${id} -> ${status}`);
      return await run("UPDATE tickets SET status = ? WHERE id = ?", [
        status,
        id,
      ]);
    } catch (e) {
      return null;
    }
  },

  getTicketHistory: async (ticketId, limit = 10) => {
    try {
      const rows = await all(
        "SELECT * FROM conversations WHERE ticket_id = ? ORDER BY created_at DESC LIMIT ?",
        [ticketId, limit]
      );
      return rows.reverse();
    } catch (e) {
      return [];
    }
  },

  getAllConversations: async (ticketId) => {
    try {
      return await all(
        "SELECT * FROM conversations WHERE ticket_id = ? ORDER BY created_at ASC",
        [ticketId]
      );
    } catch (e) {
      return [];
    }
  },

  getAllTickets: async (status = null) => {
    try {
      if (status)
        return await all(
          "SELECT * FROM tickets WHERE status = ? ORDER BY created_at DESC",
          [status]
        );
      return await all("SELECT * FROM tickets ORDER BY created_at DESC");
    } catch (e) {
      return [];
    }
  },

  getTopTraining: async (limit = 10) => {
    try {
      return await all(
        "SELECT * FROM training ORDER BY usage_count DESC LIMIT ?",
        [limit]
      );
    } catch (e) {
      return [];
    }
  },

  markResolvedByAI: async (id) => {
    try {
      console.log(`✅ [DATABASE DEBUG] Ticket Marked Resolved by AI: ${id}`);
      return await run("UPDATE tickets SET ai_resolved = 1 WHERE id = ?", [id]);
    } catch (e) {
      return null;
    }
  },

  // --- Settings Management ---
  getSetting: async (key) => {
    try {
      const row = await get("SELECT value FROM settings WHERE key = ?", [key]);
      return row ? row.value : null;
    } catch (e) {
      return null;
    }
  },

  updateSetting: async (key, value) => {
    try {
      return await run("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", [
        key,
        value,
      ]);
    } catch (e) {
      return null;
    }
  },

  getStats: async () => {
    try {
      const trainingCount = (await get("SELECT COUNT(*) as count FROM training"))
        .count;
      const ticketCount = (await get(
        "SELECT COUNT(*) as count FROM tickets WHERE status = 'open'"
      )).count;
      const conversationCount = (await get(
        "SELECT COUNT(*) as count FROM conversations"
      )).count;
      const totalTickets = (await get("SELECT COUNT(*) as count FROM tickets"))
        .count;
      return { trainingCount, ticketCount, conversationCount, totalTickets };
    } catch (e) {
      return { trainingCount: 0, ticketCount: 0, conversationCount: 0, totalTickets: 0 };
    }
  },

  init: async () => {
    return new Promise((resolve, reject) => {
      db = new sqlite3.Database(finalDbPath, async (err) => {
        if (err) {
          console.error("❌ [DATABASE ERROR] Could not connect:", err.message);
          return reject(err);
        }
        try {
          // 1. Create all tables first
          await exec(`
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
                current_step_id INTEGER DEFAULT 0,
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

            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT
            );

            INSERT OR IGNORE INTO settings (key, value) VALUES ('ai_enabled', 'true');
          `);

          // 2. Perform migrations (add missing columns if they don't exist)
          const trainingTableInfo = await all("PRAGMA table_info(training)");
          const trainingColumns = trainingTableInfo.map((c) => c.name);

          if (!trainingColumns.includes("next_step_id")) {
            console.log(
              "🛠️ [DATABASE] Adding missing column: training.next_step_id"
            );
            await exec("ALTER TABLE training ADD COLUMN next_step_id INTEGER");
          }
          if (!trainingColumns.includes("data_point_name")) {
            console.log(
              "🛠️ [DATABASE] Adding missing column: training.data_point_name"
            );
            await exec("ALTER TABLE training ADD COLUMN data_point_name TEXT");
          }

          const ticketsTableInfo = await all("PRAGMA table_info(tickets)");
          const ticketsColumns = ticketsTableInfo.map((c) => c.name);

          if (!ticketsColumns.includes("current_step_id")) {
            console.log(
              "🛠️ [DATABASE] Adding missing column: tickets.current_step_id"
            );
            await exec(
              "ALTER TABLE tickets ADD COLUMN current_step_id INTEGER DEFAULT 0"
            );
          }
          if (!ticketsColumns.includes("collected_data")) {
            console.log(
              "🛠️ [DATABASE] Adding missing column: tickets.collected_data"
            );
            await exec("ALTER TABLE tickets ADD COLUMN collected_data TEXT");
          }

          console.log(
            "🚀 [DATABASE] Supreme Summary Engine initialized and migrated."
          );
          resolve();
        } catch (err) {
          console.error("❌ [DATABASE ERROR] Initialization failed:", err.message);
          reject(err);
        }
      });
    });
  },
};

module.exports = api;
