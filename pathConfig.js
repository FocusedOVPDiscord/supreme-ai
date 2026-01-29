const path = require('path');
const fs = require('fs');

/**
 * PathConfig ensures the bot uses a persistent directory for data.
 * On Koyeb, this is mapped to the Volume at /app/data.
 */
const DATA_DIR = process.env.DATA_DIR || '/app/data';

// Ensure the directory exists
if (!fs.existsSync(DATA_DIR)) {
    try {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch (err) {
        console.error(`[PATH CONFIG] Error creating directory ${DATA_DIR}:`, err.message);
        // Fallback to local data directory if /app/data is not writable
        const fallbackDir = path.join(__dirname, 'data');
        if (!fs.existsSync(fallbackDir)) {
            fs.mkdirSync(fallbackDir, { recursive: true });
        }
        module.exports = {
            DATA_DIR: fallbackDir,
            getPath: (filename) => path.join(fallbackDir, filename)
        };
        return;
    }
}

module.exports = {
    DATA_DIR,
    getPath: (filename) => path.join(DATA_DIR, filename)
};
