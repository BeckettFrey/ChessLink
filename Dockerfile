FROM node:20

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src/ ./src/

# Expose port
EXPOSE 3000

# Run with ts-node (same as your local setup)
CMD ["npx", "ts-node", "-r", "tsconfig-paths/register", "src/server.ts"]