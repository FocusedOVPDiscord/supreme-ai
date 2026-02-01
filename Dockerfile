# --- Stage 1: Build Stage ---
FROM node:20.11.0-slim AS builder

# Install build dependencies for native modules
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies if needed for build)
# Then force a clean rebuild of better-sqlite3
RUN npm install && npm rebuild better-sqlite3

# --- Stage 2: Production Stage ---
FROM node:20.11.0-slim

# Install runtime dependencies (Python for G4F)
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Install g4f with the bypass flag
RUN pip3 install --no-cache-dir -U g4f[all] --break-system-packages

WORKDIR /app

# Copy built node_modules from builder stage
COPY --from=builder /app/node_modules ./node_modules
# Copy application source
COPY . .

# Ensure data directory exists for persistent storage
RUN mkdir -p /app/data && chmod 777 /app/data

# Environment configuration
ENV NODE_ENV=production
ENV DB_PATH=/app/data/bot.db
ENV PORT=10000

# Verify G4F installation
RUN python3 -c "import g4f; print('G4F verified')"

# Expose port for Koyeb health checks
EXPOSE 10000

# Start the bot
CMD ["node", "src/index.js"]
