FROM node:20-slim

# Install build dependencies for better-sqlite3
RUN apt-get update && apt-get install -y python3 python3-pip make g++ && rm -rf /var/lib/apt/lists/*
RUN pip3 install -U g4f[all]

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm install --production

# Copy source code
COPY . .

# Ensure data directory exists for persistent storage
RUN mkdir -p /app/data && chmod 777 /app/data

# Environment configuration
ENV NODE_ENV=production
ENV DB_PATH=/app/data/bot.db
ENV PORT=10000

# Expose port for Koyeb health checks
EXPOSE 10000

# Start the bot
CMD ["node", "src/index.js"]
