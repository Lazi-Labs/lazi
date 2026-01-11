---
description: Verify implementation with test data, database proof, and CRUD validation. Run after /execute.
argument-hint: [feature-name]
allowed-tools: Bash(*), Read, Write, Edit
---

# Verify: $ARGUMENTS

**MANDATORY VERIFICATION** - Do NOT report success without evidence.

## Step 1: Identify Scope
For "$ARGUMENTS", identify:
- API endpoints involved
- Database tables affected  
- UI components that display this data

## Step 2: Create Test Data (3+ realistic records)
```bash
curl -X POST http://localhost:3000/pricebook/pricing/api/[endpoint] \
  -H "Content-Type: application/json" \
  -d '{"name": "Realistic Name", "field": "value"}' | jq
```

## Step 3: Database Proof
```bash
curl -s http://localhost:3000/pricebook/pricing/api/[endpoint] | jq
```
**Paste actual output - do not summarize.**

## Step 4: CRUD Cycle
```bash
# CREATE
RESPONSE=$(curl -s -X POST .../[endpoint] -H "Content-Type: application/json" -d '{...}')
echo "$RESPONSE" | jq
ID=$(echo "$RESPONSE" | jq -r '.id // .data.id')

# READ
curl -s .../[endpoint]/$ID | jq

# UPDATE  
curl -s -X PATCH .../[endpoint]/$ID -H "Content-Type: application/json" -d '{"name":"Updated"}' | jq

# DELETE
curl -s -X DELETE .../[endpoint]/$ID | jq

# VERIFY GONE
curl -s .../[endpoint]/$ID | jq  # Should be 404/empty
```

## Step 5: UI Binding Audit
```bash
# Find hardcoded values (FORBIDDEN)
grep -rn '>\$[0-9]' apps/web/app/pricebook/pricing/components/

# Find dynamic bindings (REQUIRED)
grep -rn '{[a-z]\+\.[a-zA-Z]\+}' apps/web/app/pricebook/pricing/components/
```

## Step 6: Edit Modal Check
```bash
grep -A 15 "defaultValues" apps/web/app/pricebook/pricing/components/*.tsx
```
Verify defaultValues use `selectedItem?.field` not empty strings.

## Step 7: Output Report
```markdown
# Verification Report: $ARGUMENTS

## Test Data: [X records created]
## Database: [paste output]  
## CRUD: CREATE ✅/❌ | READ ✅/❌ | UPDATE ✅/❌ | DELETE ✅/❌
## UI Binding: [hardcoded: X | dynamic: ✅]
## Edit Modal: [populates: ✅/❌ | saves: ✅/❌]

## Status: PASS / FAIL
## Issues: [list any found]
```

**If ANY step fails → Fix it before reporting complete.**
