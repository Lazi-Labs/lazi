---
description: Run pre-deployment verification checklist
allowed-tools: Bash(*), Read, Write, Edit
---

# Command: /pre-deploy-check

Run pre-deployment verification checklist.

## Usage
```
/pre-deploy-check
```

## Checklist

### 1. Code Quality
```bash
# Lint check
cd apps/web && npm run lint
cd services/api && npm run lint

# Type check
cd apps/web && npm run type-check

# Build test
cd apps/web && npm run build
```

### 2. Tests
```bash
# Run API tests
cd services/api && npm test

# Run frontend tests (if available)
cd apps/web && npm test
```

### 3. Database
```sql
-- Check for pending migrations
ls database/migrations/ | tail -5

-- Verify no breaking changes
-- Check indexes exist for new queries
```

### 4. Environment
```bash
# Verify production env vars
cat .env.production | grep -E "^(DATABASE|SERVICE_TITAN|JWT)" | sed 's/=.*/=***/'

# Check Docker builds
docker-compose -f infrastructure/docker/docker-compose.production.yml build
```

### 5. Dependencies
```bash
# Check for vulnerabilities
npm audit

# Check for outdated packages
npm outdated
```

### 6. Documentation
- [ ] API changes documented
- [ ] Migration notes ready
- [ ] Changelog updated

## Pre-Deploy Summary

```markdown
## Deploy Checklist
- [ ] All tests passing
- [ ] Build successful
- [ ] Migrations ready
- [ ] Env vars configured
- [ ] No security vulnerabilities
- [ ] Documentation updated
```

## Rollback Plan
```bash
# If issues occur:
# 1. Revert to previous image
docker-compose -f docker-compose.production.yml pull lazi-api:previous
docker-compose -f docker-compose.production.yml up -d lazi-api

# 2. Rollback migration if needed
psql "$DATABASE_URL" -f database/migrations/XXX_rollback.sql
```
