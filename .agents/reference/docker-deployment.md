# LAZI Docker & Deployment Reference

## Overview

LAZI uses Docker Compose for local development and production deployment, with Traefik as a reverse proxy for SSL termination and routing.

---

## Docker Compose Files

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Local development - all services |
| `docker-compose.production.yml` | Production deployment |
| `docker-compose.traefik.yml` | Traefik routing labels |
| `infrastructure/docker/docker-compose.studio.yml` | Supabase Studio |

---

## Container Architecture

### Development Environment

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         docker-compose.yml                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  postgres   │  │    redis    │  │  temporal   │  │ temporal-ui │        │
│  │  Port 5432  │  │  Port 6379  │  │  Port 7233  │  │  Port 8088  │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ prometheus  │  │   grafana   │  │  metabase   │  │  lazi-api   │        │
│  │  Port 9090  │  │  Port 3031  │  │  Port 3030  │  │  Port 3001  │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                                              │
│  ┌─────────────────────────────┐  ┌─────────────────────────────┐          │
│  │      supabase-meta          │  │      supabase-studio        │          │
│  │        Port 8080            │  │        Port 54323           │          │
│  └─────────────────────────────┘  └─────────────────────────────┘          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Production Environment

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    docker-compose.production.yml                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         Traefik (External)                             │  │
│  │                    SSL Termination & Routing                           │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                    │                                        │
│                    ┌───────────────┼───────────────┐                       │
│                    │               │               │                       │
│                    ▼               ▼               ▼                       │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────┐    │
│  │      lazi-api       │  │      lazi-web       │  │   lazi-redis    │    │
│  │  api.lazilabs.com   │  │    lazilabs.com     │  │   (internal)    │    │
│  │     Port 3001       │  │     Port 3000       │  │   Port 6379     │    │
│  └─────────────────────┘  └─────────────────────┘  └─────────────────┘    │
│                                                                              │
│  Networks: lazi-internal (bridge), traefik-net (external)                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Service Details

### PostgreSQL (Development)

```yaml
postgres:
  container_name: lazi-postgres
  image: postgres:16
  environment:
    POSTGRES_USER: ${POSTGRES_USER:-postgres}
    POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-postgres}
    POSTGRES_DB: ${POSTGRES_DB:-lazi}
  volumes:
    - postgres_data:/var/lib/postgresql/data
  ports:
    - "5432:5432"
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U postgres"]
    interval: 10s
    timeout: 5s
    retries: 5
```

**Notes:**
- Production uses Supabase hosted PostgreSQL
- Local dev uses containerized PostgreSQL 16
- Health check ensures DB is ready before dependent services start

### Redis

```yaml
redis:
  container_name: lazi-redis
  image: redis:7-alpine
  command: redis-server --appendonly yes  # Production only
  ports:
    - "6379:6379"
  volumes:
    - redis_data:/data
  healthcheck:
    test: ["CMD", "redis-cli", "ping"]
    interval: 10s
    timeout: 5s
    retries: 3
```

**Purpose:**
- BullMQ job queues
- API response caching
- Session storage
- Real-time pub/sub

### Temporal

```yaml
temporal:
  container_name: lazi-temporal
  image: temporalio/auto-setup:1.22
  depends_on:
    - temporal-db
  environment:
    - DB=postgresql
    - DB_PORT=5432
    - POSTGRES_USER=temporal
    - POSTGRES_PWD=temporal
    - POSTGRES_SEEDS=temporal-db
  ports:
    - "7233:7233"

temporal-ui:
  container_name: lazi-temporal-ui
  image: temporalio/ui:2.21.0
  depends_on:
    - temporal
  environment:
    - TEMPORAL_ADDRESS=temporal:7233
  ports:
    - "8088:8080"
```

**Purpose:**
- Long-running workflow orchestration
- Scheduled sync operations
- Durable execution with automatic retries

### LAZI API

```yaml
lazi-api:
  container_name: lazi-api
  build:
    context: ./services/api
    dockerfile: Dockerfile
  environment:
    - NODE_ENV=production
    - PORT=3001
    - DATABASE_URL=${DATABASE_URL}
    - REDIS_URL=redis://lazi-redis:6379
    - SERVICE_TITAN_CLIENT_ID=${SERVICE_TITAN_CLIENT_ID}
    - SERVICE_TITAN_CLIENT_SECRET=${SERVICE_TITAN_CLIENT_SECRET}
    - SERVICE_TITAN_APP_KEY=${SERVICE_TITAN_APP_KEY}
    - SERVICE_TITAN_TENANT_ID=${SERVICE_TITAN_TENANT_ID}
    - PRICEBOOK_SYNC_ENABLED=true
    - CACHE_ENABLED=true
    - BULLMQ_WORKERS_ENABLED=true
  ports:
    - "3001:3001"
  depends_on:
    postgres:
      condition: service_healthy
    redis:
      condition: service_healthy
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 40s
```

### LAZI Web (Production)

```yaml
lazi-web:
  container_name: lazi-web
  build:
    context: ../../apps/web
    dockerfile: Dockerfile
    args:
      - NEXT_PUBLIC_API_URL=https://api.lazilabs.com
      - NEXT_PUBLIC_AUTH_API_URL=https://api.lazilabs.com/api/auth
      - NEXT_PUBLIC_CRM_API_URL=https://api.lazilabs.com/api/crm
      - NEXT_PUBLIC_TENANT_ID=${SERVICE_TITAN_TENANT_ID}
  environment:
    - NODE_ENV=production
    - NEXT_PUBLIC_API_URL=https://api.lazilabs.com
    - NEXT_INTERNAL_API_URL=http://lazi-api:3001
    - PLAID_CLIENT_ID=${PLAID_CLIENT_ID}
    - PLAID_SECRET=${PLAID_SECRET}
    - ENCRYPTION_KEY=${ENCRYPTION_KEY}
  depends_on:
    lazi-api:
      condition: service_healthy
```

---

## Dockerfiles

### API Dockerfile (`services/api/Dockerfile`)

```dockerfile
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
```

---

## Traefik Configuration

### Routing Labels (Production)

```yaml
# API Service
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.lazi-api.rule=Host(`api.lazilabs.com`)"
  - "traefik.http.routers.lazi-api.entrypoints=websecure"
  - "traefik.http.routers.lazi-api.tls.certresolver=letsencrypt"
  - "traefik.http.services.lazi-api.loadbalancer.server.port=3001"
  - "traefik.docker.network=traefik-net"

# Web Service
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.lazi-web.rule=Host(`lazilabs.com`) || Host(`www.lazilabs.com`)"
  - "traefik.http.routers.lazi-web.entrypoints=websecure"
  - "traefik.http.routers.lazi-web.tls.certresolver=letsencrypt"
  - "traefik.http.routers.lazi-web.priority=1"
  - "traefik.http.services.lazi-web.loadbalancer.server.port=3000"
  - "traefik.docker.network=traefik-net"
```

### Routing Rules

| Domain | Service | Port |
|--------|---------|------|
| `api.lazilabs.com` | lazi-api | 3001 |
| `lazilabs.com` | lazi-web | 3000 |
| `www.lazilabs.com` | lazi-web | 3000 |

---

## Networks

### Development
- Default bridge network (implicit)

### Production
```yaml
networks:
  lazi-internal:
    driver: bridge      # Internal service communication
  traefik-net:
    external: true      # Shared with Traefik reverse proxy
```

---

## Volumes

```yaml
volumes:
  postgres_data:        # PostgreSQL data persistence
  redis_data:           # Redis AOF persistence
  temporal_db_data:     # Temporal PostgreSQL data
  prometheus_data:      # Prometheus metrics
  grafana_data:         # Grafana dashboards
  lazi-redis-data:      # Production Redis data
```

---

## Health Check Endpoints

| Service | Endpoint | Purpose |
|---------|----------|---------|
| lazi-api | `/health` | Liveness probe |
| lazi-api | `/ready` | Readiness (DB + ST connection) |
| lazi-api | `/api/health` | Detailed health status |
| postgres | `pg_isready` | Database ready |
| redis | `redis-cli ping` | Redis ready |

---

## Commands

### Development

```bash
# Start all services
docker-compose up -d

# Start specific services
docker-compose up -d postgres redis

# View logs
docker-compose logs -f
docker-compose logs -f lazi-api

# Stop all
docker-compose down

# Stop and remove volumes (DESTRUCTIVE)
docker-compose down -v

# Rebuild containers
docker-compose up -d --build

# Shell into container
docker exec -it lazi-api sh
docker exec -it lazi-postgres psql -U postgres
docker exec -it lazi-redis redis-cli
```

### Production

```bash
# Deploy with production compose
cd infrastructure/docker
docker-compose -f docker-compose.production.yml up -d

# View production logs
docker-compose -f docker-compose.production.yml logs -f

# Scale API (if needed)
docker-compose -f docker-compose.production.yml up -d --scale lazi-api=2

# Rolling update
docker-compose -f docker-compose.production.yml pull
docker-compose -f docker-compose.production.yml up -d --no-deps lazi-api
```

### Build Commands

```bash
# Build API image
docker build -t lazi-api:latest ./services/api

# Build Web image
docker build -t lazi-web:latest ./apps/web \
  --build-arg NEXT_PUBLIC_API_URL=https://api.lazilabs.com

# Tag for registry
docker tag lazi-api:latest registry.example.com/lazi-api:latest

# Push to registry
docker push registry.example.com/lazi-api:latest
```

---

## Environment Variables per Container

### lazi-api
| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | Yes | `production` or `development` |
| `PORT` | Yes | API port (3001) |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_URL` | Yes | Redis connection string |
| `SERVICE_TITAN_*` | Yes | ST API credentials (4 vars) |
| `JWT_SECRET` | Yes | JWT signing secret |
| `CORS_ORIGIN` | Yes | Allowed origins |
| `PRICEBOOK_SYNC_ENABLED` | No | Enable sync workers |
| `CACHE_ENABLED` | No | Enable Redis caching |
| `BULLMQ_WORKERS_ENABLED` | No | Enable job workers |
| `AWS_*` | No | S3 credentials for images |

### lazi-web
| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | Yes | `production` |
| `NEXT_PUBLIC_API_URL` | Yes | Public API URL |
| `NEXT_INTERNAL_API_URL` | Yes | Internal API URL (container) |
| `NEXT_PUBLIC_TENANT_ID` | Yes | ServiceTitan tenant |
| `PLAID_*` | No | Plaid integration |
| `ENCRYPTION_KEY` | No | Data encryption |

---

## Monitoring UIs

| Service | URL | Credentials |
|---------|-----|-------------|
| Temporal UI | http://localhost:8088 | None |
| Grafana | http://localhost:3031 | admin/admin |
| Prometheus | http://localhost:9090 | None |
| Metabase | http://localhost:3030 | Setup on first run |
| Supabase Studio | http://localhost:54323 | None |

---

## Troubleshooting

### Container won't start
```bash
# Check logs
docker-compose logs lazi-api

# Check health
docker inspect --format='{{.State.Health.Status}}' lazi-api

# Check dependencies
docker-compose ps
```

### Database connection issues
```bash
# Verify postgres is healthy
docker-compose exec postgres pg_isready -U postgres

# Check connection from API container
docker-compose exec lazi-api sh -c 'nc -zv postgres 5432'
```

### Redis connection issues
```bash
# Verify redis is healthy
docker-compose exec redis redis-cli ping

# Check memory
docker-compose exec redis redis-cli INFO memory
```

---

*Docker deployment documentation - January 2025*
