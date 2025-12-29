# LAZI Server Deployment Guide

> Complete guide for deploying LAZI on a production server
> Generated: December 2024

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         INTERNET                                     │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      NGINX (Reverse Proxy)                           │
│  - lazi.perfectcatch.ai → Next.js (port 3000)                       │
│  - api.lazi.perfectcatch.ai → Express API (port 3001)               │
└─────────────────────────────────────────────────────────────────────┘
                                │
                ┌───────────────┴───────────────┐
                ▼                               ▼
┌───────────────────────────┐   ┌───────────────────────────┐
│      Next.js Web App      │   │      Express API          │
│      (apps/web)           │   │      (services/api)       │
│      Port: 3000           │   │      Port: 3001           │
└───────────────────────────┘   └───────────────────────────┘
                                                │
                                ┌───────────────┴───────────────┐
                                ▼                               ▼
                ┌───────────────────────────┐   ┌───────────────────────────┐
                │         Redis             │   │       Supabase            │
                │    (Job Queues/Cache)     │   │    (PostgreSQL)           │
                │      Port: 6379           │   │    (Cloud-hosted)         │
                └───────────────────────────┘   └───────────────────────────┘
```

---

## Prerequisites

### Server Requirements
- **OS:** Ubuntu 22.04 LTS (recommended)
- **RAM:** 4GB minimum, 8GB recommended
- **CPU:** 2 cores minimum
- **Storage:** 50GB SSD
- **Node.js:** v18+ (LTS)
- **Docker:** Optional but recommended

### Domain Configuration
- `lazi.perfectcatch.ai` → Web frontend
- `api.lazi.perfectcatch.ai` → API backend

---

## Option 1: Docker Deployment (Recommended)

### Docker Compose for Production

Create `docker-compose.production.yml`:

```yaml
version: '3.8'

services:
  # Redis for job queues and caching
  redis:
    image: redis:7-alpine
    container_name: lazi-redis
    restart: unless-stopped
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Express API Server
  api:
    build:
      context: ./services/api
      dockerfile: Dockerfile.production
    container_name: lazi-api
    restart: unless-stopped
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=redis://redis:6379
      - SERVICE_TITAN_CLIENT_ID=${SERVICE_TITAN_CLIENT_ID}
      - SERVICE_TITAN_CLIENT_SECRET=${SERVICE_TITAN_CLIENT_SECRET}
      - SERVICE_TITAN_APP_KEY=${SERVICE_TITAN_APP_KEY}
      - SERVICE_TITAN_TENANT_ID=${SERVICE_TITAN_TENANT_ID}
      - PRICEBOOK_SYNC_SCHEDULER_ENABLED=true
    depends_on:
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Next.js Web Application
  web:
    build:
      context: ./apps/web
      dockerfile: Dockerfile.production
    container_name: lazi-web
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=https://api.lazi.perfectcatch.ai
    depends_on:
      - api
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  redis_data:
```

### API Dockerfile

Create `services/api/Dockerfile.production`:

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --only=production

# Generate Prisma client
RUN npx prisma generate

# Copy source
COPY . .

FROM node:18-alpine AS runner

WORKDIR /app

# Copy from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src ./src
COPY --from=builder /app/package*.json ./

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 expressjs
USER expressjs

EXPOSE 3001

ENV NODE_ENV=production
ENV PORT=3001

CMD ["node", "src/server.js"]
```

### Web Dockerfile

The web app already has `apps/web/Dockerfile.production`. Verify it exists or create:

```dockerfile
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT 3000

CMD ["node", "server.js"]
```

### Deploy with Docker

```bash
# Clone repository on server
git clone <repository-url> /opt/lazi
cd /opt/lazi

# Create production .env file
cat > .env.production << 'EOF'
DATABASE_URL=postgresql://postgres.cvqduvqzkvqnjouuzldk:Catchadmin202525@aws-1-us-east-2.pooler.supabase.com:5432/postgres?sslmode=require
SERVICE_TITAN_CLIENT_ID=cid.xghkglqvj2akkx3ws4x6jrvxa
SERVICE_TITAN_CLIENT_SECRET=cs12.rd0iu7fd04xfcugls7qzwww4e1qb8ak4pp54v8p624rhqibx0c
SERVICE_TITAN_APP_KEY=ak1.v91sddwsy32cykc7k75qsq2un
SERVICE_TITAN_TENANT_ID=3222348440
EOF

# Build and start containers
docker-compose -f docker-compose.production.yml --env-file .env.production up -d --build

# Check status
docker-compose -f docker-compose.production.yml ps

# View logs
docker-compose -f docker-compose.production.yml logs -f
```

---

## Option 2: PM2 Deployment (Without Docker)

### Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install Redis
sudo apt install -y redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server

# Install pnpm (project uses pnpm)
sudo npm install -g pnpm
```

### Clone and Setup

```bash
# Clone repository
git clone <repository-url> /opt/lazi
cd /opt/lazi

# Install dependencies
pnpm install

# Setup API
cd services/api
cp .env.example .env
# Edit .env with production values
nano .env

# Generate Prisma client
npx prisma generate

# Build web app
cd /opt/lazi/apps/web
npm run build
```

### PM2 Ecosystem File

Create `ecosystem.config.js` in project root:

```javascript
module.exports = {
  apps: [
    {
      name: 'lazi-api',
      cwd: './services/api',
      script: 'src/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      error_file: '/var/log/lazi/api-error.log',
      out_file: '/var/log/lazi/api-out.log',
      merge_logs: true,
      max_memory_restart: '1G',
    },
    {
      name: 'lazi-web',
      cwd: './apps/web',
      script: 'node_modules/.bin/next',
      args: 'start',
      instances: 2,
      exec_mode: 'cluster',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: '/var/log/lazi/web-error.log',
      out_file: '/var/log/lazi/web-out.log',
      merge_logs: true,
      max_memory_restart: '1G',
    },
  ],
};
```

### Start with PM2

```bash
# Create log directory
sudo mkdir -p /var/log/lazi
sudo chown $USER:$USER /var/log/lazi

# Start applications
cd /opt/lazi
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Run the command it outputs

# Check status
pm2 status
pm2 logs
```

---

## Nginx Configuration

### Install Nginx

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
```

### Create Site Configuration

Create `/etc/nginx/sites-available/lazi`:

```nginx
# Web Frontend
server {
    listen 80;
    server_name lazi.perfectcatch.ai;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }
}

# API Backend
server {
    listen 80;
    server_name api.lazi.perfectcatch.ai;

    # Increase body size for file uploads
    client_max_body_size 50M;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
    }

    # WebSocket support for real-time features
    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Enable Site

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/lazi /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## SSL with Let's Encrypt

### Install Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### Obtain Certificates

```bash
# Get certificates for both domains
sudo certbot --nginx -d lazi.perfectcatch.ai -d api.lazi.perfectcatch.ai

# Follow prompts to configure
# Certbot will automatically update Nginx config
```

### Auto-Renewal

```bash
# Test renewal
sudo certbot renew --dry-run

# Certbot automatically adds cron job for renewal
```

---

## Firewall Configuration

```bash
# Install UFW if not present
sudo apt install -y ufw

# Allow SSH
sudo ufw allow ssh

# Allow HTTP and HTTPS
sudo ufw allow 'Nginx Full'

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

---

## Monitoring & Logging

### PM2 Monitoring

```bash
# Real-time monitoring
pm2 monit

# View logs
pm2 logs

# View specific app logs
pm2 logs lazi-api
pm2 logs lazi-web
```

### Log Rotation

Create `/etc/logrotate.d/lazi`:

```
/var/log/lazi/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
```

### Health Checks

```bash
# API health check
curl https://api.lazi.perfectcatch.ai/api/health

# Web health check
curl https://lazi.perfectcatch.ai
```

---

## Deployment Script

Create `scripts/deploy.sh`:

```bash
#!/bin/bash
set -e

echo "🚀 Starting LAZI deployment..."

# Navigate to project directory
cd /opt/lazi

# Pull latest code
echo "📥 Pulling latest code..."
git pull origin main

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Generate Prisma client
echo "🔧 Generating Prisma client..."
cd services/api
npx prisma generate

# Run migrations (if any)
echo "🗃️ Running database migrations..."
npx prisma migrate deploy

# Build web app
echo "🏗️ Building web application..."
cd /opt/lazi/apps/web
npm run build

# Restart applications
echo "🔄 Restarting applications..."
cd /opt/lazi
pm2 reload ecosystem.config.js --env production

echo "✅ Deployment complete!"

# Show status
pm2 status
```

Make executable:
```bash
chmod +x scripts/deploy.sh
```

---

## Environment Variables Reference

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `production` |
| `PORT` | API port | `3001` |
| `DATABASE_URL` | Supabase connection | `postgresql://...` |
| `REDIS_URL` | Redis connection | `redis://localhost:6379` |
| `SERVICE_TITAN_CLIENT_ID` | ST OAuth client ID | `cid.xxx` |
| `SERVICE_TITAN_CLIENT_SECRET` | ST OAuth secret | `cs12.xxx` |
| `SERVICE_TITAN_APP_KEY` | ST app key | `ak1.xxx` |
| `SERVICE_TITAN_TENANT_ID` | ST tenant ID | `3222348440` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PRICEBOOK_SYNC_SCHEDULER_ENABLED` | Enable pricebook sync | `true` |
| `PRICEBOOK_FULL_SYNC_CRON` | Full sync schedule | `0 2 * * *` |
| `PRICEBOOK_INCREMENTAL_SYNC_CRON` | Incremental sync | `0 */6 * * *` |
| `GHL_SYNC_ENABLED` | GoHighLevel sync | `false` |
| `CRM_SYNC_ENABLED` | CRM sync | `true` |

---

## Troubleshooting

### API Not Starting

```bash
# Check logs
pm2 logs lazi-api --lines 100

# Common issues:
# - DATABASE_URL not set
# - Redis not running
# - Port already in use
```

### Database Connection Failed

```bash
# Test connection
psql "$DATABASE_URL" -c "SELECT 1"

# Check if SSL is required
# Ensure ?sslmode=require in connection string
```

### Redis Connection Failed

```bash
# Check Redis status
sudo systemctl status redis-server

# Test connection
redis-cli ping
```

### Nginx 502 Bad Gateway

```bash
# Check if apps are running
pm2 status

# Check Nginx error log
sudo tail -f /var/log/nginx/error.log

# Verify ports
netstat -tlnp | grep -E '3000|3001'
```

---

## Backup Strategy

### Database Backups

Supabase Pro includes daily backups. For additional safety:

```bash
# Manual backup script
#!/bin/bash
BACKUP_DIR="/opt/backups/lazi"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Export from Supabase
pg_dump "$DATABASE_URL" -F c -f "$BACKUP_DIR/lazi_$DATE.dump"

# Keep only last 7 days
find $BACKUP_DIR -name "*.dump" -mtime +7 -delete
```

### Application Backups

```bash
# Backup configuration
tar -czf /opt/backups/lazi-config-$(date +%Y%m%d).tar.gz \
  /opt/lazi/.env* \
  /opt/lazi/ecosystem.config.js \
  /etc/nginx/sites-available/lazi
```

---

## Quick Reference Commands

```bash
# Start all services
pm2 start ecosystem.config.js --env production

# Stop all services
pm2 stop all

# Restart all services
pm2 reload all

# View logs
pm2 logs

# Check status
pm2 status

# Deploy updates
./scripts/deploy.sh

# Check Nginx
sudo nginx -t
sudo systemctl reload nginx

# Check Redis
redis-cli ping

# Check database connection
psql "$DATABASE_URL" -c "SELECT NOW()"
```
