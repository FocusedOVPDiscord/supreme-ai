const { spawn } = require('child_process');
const path = require('path');

/**
 * G4F (GPT4Free) AI Module - Completely Free, No API Keys Required
 * 
 * This module uses the g4f Python library to access free AI models
 * without any rate limits or paid credits.
 */

// Check if g4f is installed on first load
let g4fInstalled = null;

async function checkG4FInstallation() {
    if (g4fInstalled !== null) return g4fInstalled;
    
    return new Promise((resolve) => {
        // Use full path to ensure we use the same python that has g4f installed
        const pythonPath = process.env.PYTHON_PATH || 'python3';
        const childProcess = spawn(pythonPath, ['-c', 'import sys; import g4f; print("OK")']);
        let output = '';
        let error = '';
        
        childProcess.stdout.on('data', (data) => {
            output += data.toString();
        });

        childProcess.stderr.on('data', (data) => {
            error += data.toString();
        });
        
        childProcess.on('close', (code) => {
            g4fInstalled = (code === 0 && output.includes('OK'));
            if (!g4fInstalled) {
                console.warn('⚠️  g4f not installed or error occurred.');
                console.error('Exit Code:', code);
                console.error('Error Output:', error.trim());
                console.warn('Attempting to install g4f dynamically...');
            }
            resolve(g4fInstalled);
        });
    });
}

/**
 * Call g4f Python library to generate AI response
 * @param {string} model - Model name (e.g., 'gpt-4', 'gpt-5', 'meta-ai')
 * @param {string} systemPrompt - System prompt
 * @param {string} userPrompt - User prompt
 * @returns {Promise<string|null>} - AI response or null on error
 */
async function callG4F(model, systemPrompt, userPrompt) {
    const isInstalled = await checkG4FInstallation();
    if (!isInstalled) {
        console.error('❌ g4f is not installed');
        return null;
    }

    return new Promise((resolve) => {
        const pythonPath = process.env.PYTHON_PATH || 'python3';
        const pythonScript = `
import sys
import json
try:
    from g4f.client import Client
except ImportError:
    import os
    # Try to add common paths if missing
    sys.path.append('/usr/local/lib/python3.11/dist-packages')
    sys.path.append('/usr/local/lib/python3.10/dist-packages')
    from g4f.client import Client

try:
    client = Client()
    response = client.chat.completions.create(
        model="${model}",
        messages=[
            {"role": "system", "content": ${JSON.stringify(systemPrompt)}},
            {"role": "user", "content": ${JSON.stringify(userPrompt)}}
        ],
        web_search=False
    )
    print(response.choices[0].message.content)
except Exception as e:
    print(f"ERROR: {str(e)}", file=sys.stderr)
    sys.exit(1)
`;

        const childProcess = spawn(pythonPath, ['-c', pythonScript]);
        let output = '';
        let errorOutput = '';

        childProcess.stdout.on('data', (data) => {
            output += data.toString();
        });

        childProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        childProcess.on('close', (code) => {
            if (code === 0 && output.trim()) {
                resolve(output.trim());
            } else {
                console.error(`❌ g4f error (${model}):`, errorOutput);
                resolve(null);
            }
        });

        // Timeout after 30 seconds
        setTimeout(() => {
            childProcess.kill();
            resolve(null);
        }, 30000);
    });
}

// List of models to try in order of preference
// These are all FREE and require NO authentication
const MODELS = [
    "gpt-4",           // Via AnyProvider (aggregates multiple sources)
    "gpt-5",           // Via AnyProvider (latest model)
    "meta-ai",         // Via MetaAI (very reliable)
    "qwen-max",        // Via Qwen (powerful Chinese model)
    "gpt-4o-mini",     // Fallback option
];

module.exports = {
    /**
     * Generate AI response using G4F with automatic model fallback
     * @param {string} query - User's question
     * @param {string} context - Conversation history or additional context
     * @returns {Promise<string|null>} - AI response or null on error
     */
    generateResponse: async (query, context = "") => {
        const systemPrompt = `You are Supreme AI, a helpful and professional Discord support assistant.

Your role:
- Answer user questions clearly and concisely
- Be friendly, professional, and empathetic
- If you don't know something, admit it and suggest waiting for human staff
- Keep responses under 500 characters when possible
- Use Discord-friendly formatting (bold with **, italic with *, code with \`)

Context Awareness:
- If a trade is in progress, use the provided trade details (items, quantities, partner) to answer accurately.
- Recognize item names mentioned in the trade context (e.g., "Garbagzilla", "Dragon").

Important:
- Never make up information
- Always prioritize user safety and privacy
- Be respectful and inclusive`;

        const userPrompt = context 
            ? `Recent conversation:\n${context}\n\nCurrent question: ${query}`
            : query;

        // Try models one by one until one works
        for (const modelName of MODELS) {
            try {
                console.log(`🤖 [G4F] Attempting response with model: ${modelName}`);
                
                const response = await callG4F(modelName, systemPrompt, userPrompt);
                
                if (response) {
                    console.log(`✅ [G4F] Generated response using ${modelName} (${response.length} chars)`);
                    return response.trim();
                }
            } catch (error) {
                console.error(`⚠️ [G4F] Model ${modelName} failed:`, error.message);
                continue;
            }
        }

        console.error('❌ [G4F] All models failed');
        return null;
    },

    /**
     * Check if G4F is accessible and healthy
     */
    checkHealth: async () => {
        return await checkG4FInstallation();
    },

    /**
     * Get available models
     */
    getModels: async () => {
        return MODELS;
    },

    /**
     * Extract Q&A pair from a single training message using AI
     */
    extractTrainingData: async (trainingMessage) => {
        const systemPrompt = `You are a highly intelligent training data extractor for a Discord Support Bot. 
        Your goal is to understand the user's INTENT and convert it into a functional trigger (question) and response (answer).

        Rules:
        1. "question": Extract the core trigger or scenario. If the user says "When someone says X", the question is "X". If they describe a situation like "if they mention items", the question should be a common way users mention items (e.g., "i give").
        2. "answer": This MUST be the exact, professional message the bot will send. 
        3. AUTOMATICALLY map natural terms to these placeholders:
           - USER -> Mentions the ticket owner.
           - PARTNER -> Mentions the trade partner.
           - ITEMS -> The items being traded.
           - QUANTITY -> The quantity.
        4. BE SMART: If the user says "replace users and items", automatically use USER and ITEMS in the answer.
        5. DO NOT repeat the user's instructions in the answer. Only provide the final bot response.

        Example Input: "if i mention an item say Okay! and ask what the partner is giving"
        Example Output: {"question": "i give", "answer": "Okay! And what is your partner giving?"}

        Example Input: "When users ask about the trade setup, show: # Trade Setup (Final) USER is trading with PARTNER... replace users and items"
        Example Output: {"question": "trade setup", "answer": "# Trade Setup (Final)\\n\\nUSER is trading with PARTNER\\n\\nUSER gives:\\n- ITEMS xQUANTITY\\n\\nPARTNER gives:\\n- ITEMS xQUANTITY\\n\\nBoth of you, please type confirm if correct."}

        Return ONLY a valid JSON object.`;

        try {
            const response = await callG4F("gpt-4", systemPrompt, trainingMessage);
            if (!response) return null;
            
            return JSON.parse(response);
        } catch (error) {
            console.error('❌ [G4F EXTRACTION ERROR]', error.message);
            return null;
        }
    },

    /**
     * Smart AI-driven trade flow processor
     */
    processTradeMessage: async (message, currentData = {}) => {
        const systemPrompt = `You are the brain of a Discord Trade Support Bot. Your job is to analyze the user's message and update the trade data.
        
        Current Trade Data: ${JSON.stringify(currentData)}
        
        Fields to fill:
        - user_item: What the user is giving.
        - user_qty: Quantity the user is giving.
        - partner_item: What the partner is giving.
        - partner_qty: Quantity the partner is giving.
        - partner_id: The partner's mention or ID.
        
        Rules:
        1. Extract any new information from the user's message.
        2. If the user makes a typo (e.g., "drag" instead of "dragon"), correct it if obvious.
        3. Determine the NEXT question to ask to complete the trade setup.
        4. If ALL fields are filled, the next_step should be "summary".
        5. Return a JSON object with:
           - "updated_data": The full updated trade data object.
           - "bot_response": The natural response/question to the user.
           - "is_complete": Boolean, true if all data is collected.
        
        Example Response:
        {
            "updated_data": {"user_item": "Dragon", "user_qty": "3", "partner_item": "Gorgonzilla"},
            "bot_response": "Got it. What quantity of Gorgonzilla does your partner give?",
            "is_complete": false
        }`;

        try {
            const response = await callG4F("gpt-4", systemPrompt, message);
            if (!response) return null;
            
            return JSON.parse(response);
        } catch (error) {
            console.error('❌ [G4F TRADE PROCESS ERROR]', error.message);
            return null;
        }
    }
};
