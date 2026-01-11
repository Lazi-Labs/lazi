---
description: Analyze codebase structure and patterns
argument-hint: [area]?
allowed-tools: Bash(*), Read, Write, Edit
---

# Command: /analyze-codebase

Analyze codebase structure and patterns.

## Usage
```
/analyze-codebase                    # Full analysis
/analyze-codebase <area>             # Specific area
```

## Areas
- `frontend` - React components, pages, hooks
- `backend` - API routes, services, workers
- `database` - Schemas, migrations, queries
- `integrations` - ServiceTitan, Plaid, Slack

## Process

### 1. Structure Analysis
```bash
# File counts by type
find . -name "*.tsx" | wc -l
find . -name "*.ts" | wc -l
find . -name "*.js" | wc -l

# Largest files
find . -name "*.tsx" -exec wc -l {} + | sort -rn | head -10
```

### 2. Dependency Analysis
```bash
# Package dependencies
cat apps/web/package.json | jq '.dependencies'
cat services/api/package.json | jq '.dependencies'
```

### 3. Pattern Analysis
- Identify repeated patterns
- Find inconsistencies
- Note technical debt

### 4. Output Format

```markdown
## Codebase Analysis: <area>

### Structure
- X components
- Y routes
- Z migrations

### Patterns Found
- Pattern 1: <description>
- Pattern 2: <description>

### Inconsistencies
- Issue 1: <description>
- Issue 2: <description>

### Recommendations
1. <recommendation>
2. <recommendation>
```

## LAZI Quick Stats
```bash
# Component count
ls apps/web/components/**/*.tsx | wc -l

# Route count
ls services/api/src/routes/*.js | wc -l

# Migration count
ls database/migrations/*.sql | wc -l
```
