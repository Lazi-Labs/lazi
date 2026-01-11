# Command: /health-check

Check system health and diagnose issues.

## Usage
```
/health-check              # Full system check
/health-check <service>    # Specific service
```

## Quick Health Check

```bash
# API health
curl http://localhost:3001/health
curl http://localhost:3001/ready

# Frontend health
curl http://localhost:3000/api/health

# Database
psql "$DATABASE_URL" -c "SELECT 1;"

# Redis
redis-cli ping

# Docker containers
docker-compose ps
```

## Service-Specific Checks

### API Service
```bash
# Health endpoint
curl http://localhost:3001/health | jq

# Detailed status
curl http://localhost:3001/api/system/status | jq

# Check logs
pm2 logs lazi-api --lines 50
```

### Database
```sql
-- Connection count
SELECT count(*) FROM pg_stat_activity;

-- Table sizes
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables 
WHERE schemaname IN ('raw', 'master', 'crm')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;

-- Sync status
SELECT * FROM raw.sync_state;
```

### Redis
```bash
# Memory usage
redis-cli INFO memory | grep used_memory_human

# Queue status
redis-cli KEYS "bull:*" | head -20

# Clear stuck jobs (dev only)
redis-cli DEL "bull:inbound-sync:stalled"
```

### ServiceTitan Connection
```bash
# Test ST API
curl http://localhost:3001/api/servicetitan/test
```

## Monitoring UIs

| Service | URL |
|---------|-----|
| Bull Board | http://localhost:3001/admin/queues |
| Temporal UI | http://localhost:8088 |
| Grafana | http://localhost:3031 |
| Prometheus | http://localhost:9090 |

## Common Issues

| Symptom | Check | Fix |
|---------|-------|-----|
| API 500 | `pm2 logs` | Check error, restart |
| DB timeout | Connection pool | Increase max connections |
| Redis full | `INFO memory` | Clear old keys |
| Sync stuck | BullMQ queue | Clear stalled jobs |
