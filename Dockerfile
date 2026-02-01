FROM node:20-slim

# Install only essential build and runtime dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-dev \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Install MINIMAL g4f (without heavy [all] extras)
# This significantly reduces memory and CPU usage during build and run
RUN pip3 install --no-cache-dir -U g4f --break-system-packages

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies
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
