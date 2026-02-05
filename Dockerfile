FROM node:20-bullseye

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-dev \
    python-is-python3 \
    build-essential \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

# Install g4f (removed --break-system-packages for compatibility with older pip)
RUN pip3 install --no-cache-dir -U g4f

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Ensure data directory exists
RUN mkdir -p /app/data && chmod 777 /app/data

ENV NODE_ENV=production
ENV DB_PATH=/app/data/bot.db
ENV PORT=10000

# Verify installation
RUN python3 -c "import g4f; print('G4F verified')"

EXPOSE 10000

CMD ["node", "src/index.js"]
