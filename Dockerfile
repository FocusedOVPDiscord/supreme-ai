FROM node:20-bullseye

# Install build dependencies and python
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-dev \
    build-essential \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

# Install g4f
RUN pip3 install --no-cache-dir -U g4f --break-system-packages

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including dev for potential builds)
RUN npm install

# Copy application source
COPY . .

# Ensure data directory exists for persistent storage
RUN mkdir -p /app/data && chmod 777 /app/data

# Environment configuration
ENV NODE_ENV=production
ENV DB_PATH=/app/data/bot.db
ENV PORT=10000
ENV PYTHON_PATH=python3

# Verify G4F installation
RUN python3 -c "import g4f; print('G4F verified')"

# Expose port for Koyeb health checks
EXPOSE 10000

# Start the bot
CMD ["node", "src/index.js"]
