FROM node:20-slim

# Install build dependencies for better-sqlite3 AND runtime dependencies for G4F
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-dev \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Install g4f with the bypass flag
RUN pip3 install --no-cache-dir -U g4f[all] --break-system-packages

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
# The postinstall script in package.json will now automatically run 'npm rebuild better-sqlite3'
# inside this specific container environment.
RUN npm install --production

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
