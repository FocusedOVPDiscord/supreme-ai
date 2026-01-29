const fs = require('fs');
const path = require('path');

/**
 * This script runs before the bot starts to ensure that the old, 
 * broken database file on the Koyeb volume is removed.
 */
function forceResetDatabase() {
    const dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/bot.db');
    const oldDbPath = path.join(__dirname, '../../data/bot.db');
    const v2DbPath = path.join(__dirname, '../../data/supreme_v2.db');

    const pathsToDelete = [oldDbPath, v2DbPath, dbPath];

    console.log('🧹 [DB RESET] Checking for old database files to clear constraints...');

    pathsToDelete.forEach(p => {
        try {
            if (fs.existsSync(p)) {
                fs.unlinkSync(p);
                console.log(`✅ [DB RESET] Deleted old database at: ${p}`);
            }
        } catch (err) {
            console.error(`❌ [DB RESET] Could not delete ${p}:`, err.message);
        }
    });
}

module.exports = forceResetDatabase;
