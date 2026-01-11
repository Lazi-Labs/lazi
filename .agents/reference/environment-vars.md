# LAZI Environment Variables Reference

## Overview

This document lists all environment variables used across the LAZI platform, grouped by service and purpose.

---

## Quick Reference

### Required for All Environments

| Variable | Example | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://...` | PostgreSQL connection string |
| `SERVICE_TITAN_CLIENT_ID` | `cid.1abc...` | ST OAuth client ID |
| `SERVICE_TITAN_CLIENT_SECRET` | `cs1.xyz...` | ST OAuth client secret |
| `SERVICE_TITAN_APP_KEY` | `ak1.abc...` | ST application key |
| `SERVICE_TITAN_TENANT_ID` | `3222348440` | ST tenant ID |

### Required for Production

| Variable | Example | Description |
|----------|---------|-------------|
| `JWT_SECRET` | `your-32-char-secret` | JWT signing secret |
| `CORS_ORIGIN` | `https://lazilabs.com` | Allowed CORS origins |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection |

---

## API Service (`services/api`)

### Core Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3001` | API server port |
| `NODE_ENV` | No | `development` | Environment mode |
| `LOG_LEVEL` | No | `info` | Log level (debug, info, warn, error) |

### Database

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | **Yes** | - | PostgreSQL connection string |
| `DATABASE_MAX_CONNECTIONS` | No | `20` | Max DB pool connections |
| `ST_SCHEMA` | No | `servicetitan` | ServiceTitan schema name |
| `PRICEBOOK_SCHEMA` | No | `pricebook` | Pricebook schema name |
| `AUTOMATION_SCHEMA` | No | `automation` | Automation schema name |
| `INTEGRATIONS_SCHEMA` | No | `integrations` | Integrations schema name |

### ServiceTitan API

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SERVICE_TITAN_CLIENT_ID` | **Yes** | - | OAuth client ID |
| `SERVICE_TITAN_CLIENT_SECRET` | **Yes** | - | OAuth client secret |
| `SERVICE_TITAN_APP_KEY` | **Yes** | - | Application key |
| `SERVICE_TITAN_TENANT_ID` | **Yes** | - | Tenant ID |
| `DEFAULT_TENANT_ID` | No | `3222348440` | Default tenant for requests |

### Redis & Caching

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `REDIS_URL` | No | `redis://localhost:6379` | Redis connection |
| `CACHE_ENABLED` | No | `true` | Enable Redis caching |
| `CACHE_TTL_SECONDS` | No | `300` | Default cache TTL |

### Security

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_SECRET` | Prod | - | JWT signing secret (32+ chars) |
| `API_KEY` | No | - | Optional API key requirement |
| `CORS_ORIGIN` | Prod | `*` | Allowed CORS origins |

### Rate Limiting

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `RATE_LIMIT_WINDOW_MS` | No | `60000` | Rate limit window (ms) |
| `RATE_LIMIT_MAX_REQUESTS` | No | `100` | Max requests per window |

### Token Management

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `TOKEN_REFRESH_BUFFER_SECONDS` | No | `300` | Refresh token before expiry |
| `MAX_RETRIES` | No | `3` | Max API retry attempts |
| `RETRY_DELAY_MS` | No | `1000` | Delay between retries |

### Sync Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ENABLE_SCHEDULED_SYNC` | No | `true` | Enable scheduled syncs |
| `PRICEBOOK_SYNC_ENABLED` | No | `true` | Enable pricebook sync |
| `PRICEBOOK_CATEGORY_SYNC_ENABLED` | No | `true` | Enable category sync |
| `PRICEBOOK_FULL_SYNC_ENABLED` | No | `true` | Enable full sync |
| `SYNC_SCHEDULER_ENABLED` | No | `true` | Enable sync scheduler |
| `SYNC_FULL_CRON` | No | `0 2 * * *` | Full sync cron (2 AM) |
| `SYNC_INCREMENTAL_CRON` | No | `0 */6 * * *` | Incremental cron (6h) |
| `BULLMQ_WORKERS_ENABLED` | No | `true` | Enable BullMQ workers |

### AI/LLM Integration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | No | - | OpenAI API key |
| `ANTHROPIC_API_KEY` | No | - | Anthropic API key |

### Twilio SMS

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `TWILIO_ACCOUNT_SID` | No | - | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | No | - | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | No | - | Twilio phone number |

### SendGrid Email

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SENDGRID_API_KEY` | No | - | SendGrid API key |
| `SENDGRID_FROM_EMAIL` | No | - | From email address |
| `SENDGRID_FROM_NAME` | No | - | From display name |

### Slack Integration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SLACK_BOT_TOKEN` | No | - | Slack bot token (xoxb-) |
| `SLACK_SIGNING_SECRET` | No | - | Slack signing secret |
| `SLACK_WEBHOOK_URL` | No | - | Slack webhook URL |
| `SLACK_DISPATCH_CHANNEL` | No | - | Dispatch channel ID |
| `SLACK_SALES_CHANNEL` | No | - | Sales channel ID |
| `SLACK_ACCOUNTING_CHANNEL` | No | - | Accounting channel ID |
| `SLACK_EMERGENCY_CHANNEL` | No | - | Emergency channel ID |
| `SLACK_REPORTS_CHANNEL` | No | - | Reports channel ID |
| `SLACK_ONCALL_USER` | No | - | On-call user ID |

### Salesforce Integration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SALESFORCE_CLIENT_ID` | No | - | SF consumer key |
| `SALESFORCE_CLIENT_SECRET` | No | - | SF consumer secret |
| `SALESFORCE_REDIRECT_URI` | No | - | OAuth callback URL |
| `SALESFORCE_LOGIN_URL` | No | `https://login.salesforce.com` | SF login URL |
| `SALESFORCE_API_VERSION` | No | `v59.0` | SF API version |
| `SALESFORCE_SYNC_ENABLED` | No | `false` | Enable SF sync |
| `SALESFORCE_AUTO_SYNC_CUSTOMERS` | No | `false` | Auto-sync customers |
| `SALESFORCE_SYNC_BATCH_SIZE` | No | `200` | Sync batch size |

### AWS S3 (Image Storage)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AWS_REGION` | No | - | AWS region |
| `AWS_ACCESS_KEY_ID` | No | - | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | No | - | AWS secret key |
| `S3_BUCKET_NAME` | No | - | S3 bucket name |

### Temporal Workflows

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `TEMPORAL_ADDRESS` | No | `localhost:7233` | Temporal server |
| `TEMPORAL_NAMESPACE` | No | `default` | Temporal namespace |

---

## Web App (`apps/web`)

### Public Variables (NEXT_PUBLIC_*)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | **Yes** | `http://localhost:3000/api` | Public API URL |
| `NEXT_PUBLIC_AUTH_API_URL` | No | `http://localhost:3001/api/auth` | Auth API URL |
| `NEXT_PUBLIC_CRM_API_URL` | No | `http://localhost:3001/api/crm` | CRM API URL |
| `NEXT_PUBLIC_TENANT_ID` | No | `3222348440` | ServiceTitan tenant |
| `NEXT_PUBLIC_SOCKET_URL` | No | - | Socket.io server URL |
| `NEXT_PUBLIC_BUILDER_API_KEY` | No | - | Builder.io API key |

### Server Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ST_AUTOMATION_URL` | **Yes** | `http://localhost:3001` | Backend API URL |
| `NEXT_INTERNAL_API_URL` | No | - | Internal API URL (Docker) |

### Plaid Integration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PLAID_CLIENT_ID` | No | - | Plaid client ID |
| `PLAID_SECRET` | No | - | Plaid secret |
| `PLAID_ENV` | No | `sandbox` | Plaid environment |
| `PLAID_WEBHOOK_URL` | No | - | Plaid webhook URL |
| `PLAID_REDIRECT_URI` | No | - | Plaid OAuth redirect |

### Security

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ENCRYPTION_KEY` | No | - | Data encryption key |

---

## Docker Compose

### PostgreSQL

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_USER` | `postgres` | Database user |
| `POSTGRES_PASSWORD` | `postgres` | Database password |
| `POSTGRES_DB` | `lazi` | Database name |

### Grafana

| Variable | Default | Description |
|----------|---------|-------------|
| `GF_SECURITY_ADMIN_PASSWORD` | `admin` | Grafana admin password |

---

## Environment Files

### Development

```bash
# Root .env (Docker Compose)
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=lazi

# services/api/.env
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/lazi
REDIS_URL=redis://localhost:6379
SERVICE_TITAN_CLIENT_ID=your_client_id
SERVICE_TITAN_CLIENT_SECRET=your_client_secret
SERVICE_TITAN_APP_KEY=your_app_key
SERVICE_TITAN_TENANT_ID=3222348440
DEFAULT_TENANT_ID=3222348440
PRICEBOOK_SYNC_ENABLED=true
CORS_ORIGIN=*

# apps/web/.env.local
NEXT_PUBLIC_API_URL=http://localhost:3000/api
ST_AUTOMATION_URL=http://localhost:3001
NEXT_PUBLIC_TENANT_ID=3222348440
```

### Production

```bash
# services/api/.env.production
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://user:pass@db.supabase.co:5432/postgres?sslmode=require
REDIS_URL=redis://lazi-redis:6379
SERVICE_TITAN_CLIENT_ID=cid.xxx
SERVICE_TITAN_CLIENT_SECRET=cs1.xxx
SERVICE_TITAN_APP_KEY=ak1.xxx
SERVICE_TITAN_TENANT_ID=3222348440
JWT_SECRET=your-production-secret-32-chars-min
CORS_ORIGIN=https://lazilabs.com,https://www.lazilabs.com
PRICEBOOK_SYNC_ENABLED=true
CACHE_ENABLED=true
BULLMQ_WORKERS_ENABLED=true

# apps/web/.env.production
NEXT_PUBLIC_API_URL=https://api.lazilabs.com
NEXT_INTERNAL_API_URL=http://lazi-api:3001
NEXT_PUBLIC_TENANT_ID=3222348440
PLAID_CLIENT_ID=xxx
PLAID_SECRET=xxx
PLAID_ENV=production
```

---

## Validation

### Check Required Variables

```bash
# In services/api
node -e "
const required = [
  'DATABASE_URL',
  'SERVICE_TITAN_CLIENT_ID',
  'SERVICE_TITAN_CLIENT_SECRET',
  'SERVICE_TITAN_APP_KEY',
  'SERVICE_TITAN_TENANT_ID'
];
const missing = required.filter(v => !process.env[v]);
if (missing.length) {
  console.error('Missing required env vars:', missing);
  process.exit(1);
}
console.log('All required env vars present');
"
```

### Debug Environment

```bash
# Print all LAZI-related env vars (redacted)
env | grep -E "^(DATABASE|SERVICE_TITAN|REDIS|JWT|CORS|PLAID|SLACK|AWS)" | \
  sed 's/=.*/=***/'
```

---

## Security Notes

1. **Never commit** `.env` files to git
2. **Use secrets manager** in production (AWS Secrets Manager, Vault)
3. **Rotate credentials** regularly
4. **JWT_SECRET** must be at least 32 characters
5. **DATABASE_URL** should use SSL in production (`?sslmode=require`)
6. **CORS_ORIGIN** should be specific domains, not `*` in production

---

*Environment variables documentation - January 2025*
