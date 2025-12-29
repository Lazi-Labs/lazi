# LAZI API Service Dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies for native modules and healthcheck
RUN apk add --no-cache curl python3 make g++

# Copy package files and prisma schema
COPY package*.json ./
COPY prisma ./prisma

# Install dependencies
RUN npm ci --only=production

# Generate Prisma Client for linux-musl
RUN npx prisma generate

# Copy source code
COPY . .

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

# Start the server
CMD ["node", "src/server.js"]
