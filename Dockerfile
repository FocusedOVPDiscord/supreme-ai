FROM node:20-slim

# Install build tools for better-sqlite3
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

# Create data directory for SQLite
RUN mkdir -p data

ENV NODE_ENV=production
ENV DB_PATH=/app/data/bot.db

CMD ["node", "src/index.js"]
