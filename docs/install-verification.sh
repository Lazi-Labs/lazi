#!/bin/bash
# Add Verification System to LAZI Agentic Commands
# Run from: /opt/docker/apps/lazi

set -e
cd /opt/docker/apps/lazi

echo "========================================"
echo "Adding Verification System"
echo "========================================"

# 1. Copy verify.md command (you need to have this file ready)
echo ""
echo "Step 1: Adding /verify command..."

cat > .agents/commands/verify.md << 'EOF'
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
EOF

echo "✅ Created .agents/commands/verify.md"

# 2. Append verification rules to CLAUDE.md
echo ""
echo "Step 2: Adding verification rules to CLAUDE.md..."

cat >> CLAUDE.md << 'EOF'

---

## MANDATORY VERIFICATION PROTOCOL

Every implementation MUST include proof. "I implemented it" is NOT acceptable.

### After /execute, run /verify:
```
/prime → /planning → /execute → /verify → /commit
```

### Required Evidence:

1. **Test Data**: Create 3+ realistic records via API (not "test1", "test2")
2. **Database Proof**: Show actual JSON/query output 
3. **CRUD Cycle**: CREATE → READ → UPDATE → DELETE with responses
4. **UI Binding**: Prove no hardcoded values (grep commands)
5. **Edit Modal**: Confirm it populates existing data

### Verification Checklist (include in /execute completion):

```markdown
## Verification
- [ ] Test data created (3+ records)
- [ ] Database state shown (JSON output)
- [ ] CRUD cycle proven (all 4 operations)
- [ ] No hardcoded UI values
- [ ] Edit modal populates correctly
```

### Definition of Done:

❌ NOT: "I implemented the technicians API"
✅ YES: "Here's curl output creating 3 technicians, database showing them stored, CRUD cycle proof"

EOF

echo "✅ Added verification rules to CLAUDE.md"

# 3. Update execute.md to require verification
echo ""
echo "Step 3: Updating /execute to require verification..."

cat >> .agents/commands/execute.md << 'EOF'

---

## POST-IMPLEMENTATION: Run /verify

After completing all tasks, you MUST:

1. Run verification steps (or full `/verify [feature]`)
2. Create test data
3. Show database proof  
4. Complete CRUD cycle
5. Audit UI bindings

**Include verification evidence in completion report.**
EOF

echo "✅ Updated .agents/commands/execute.md"

# 4. Replace COMMANDS.md with complete version
echo ""
echo "Step 4: Updating COMMANDS.md with all commands..."

cat > .agents/COMMANDS.md << 'EOF'
# LAZI AI Commands - Complete Reference

## Core Workflows

### Standard Feature
```
/prime → /planning [desc] → /execute [plan] → /verify [feature] → /commit
```

### Bug Fix
```
/prime → /rca [issue] → /implement-fix [issue] → /verify [fix] → /commit
```

### Major Feature (PRD-First)
```
/prime → /create-prd [feature] → /planning → /execute → /verify → /commit
```

## All Commands

| Command | Purpose |
|---------|---------|
| `/prime` | Load codebase context |
| `/prime-tools` | Load tool dev patterns |
| `/analyze-codebase` | Deep code analysis |
| `/create-prd` | Create PRD |
| `/planning` | Create implementation plan |
| `/execute` | Implement from plan |
| `/verify` | **Prove it works** |
| `/commit` | Git commit |
| `/rca` | Root cause analysis |
| `/implement-fix` | Fix from RCA |
| `/bug-fix` | Quick bug fix |
| `/add-component` | Scaffold component |
| `/generate-tests` | Generate tests |
| `/refactor` | Safe refactoring |
| `/fix-types` | Fix TS errors |
| `/health-check` | System health |
| `/pre-deploy-check` | Pre-deploy validation |
| `/review-pr` | Review PR |
| `/sync-servicetitan` | Sync ST data |
| `/end-to-end-feature` | Full automation |

## /verify is MANDATORY

After /execute, always run /verify to prove:
- Test data created via API
- Database stores correctly
- CRUD cycle works
- UI uses dynamic data
- Edit modals populate

## Commit Format

`type(scope): description`

**Types**: feat, fix, refactor, docs, test, chore, perf  
**Scopes**: pricebook, equipment, sync, api, ui, db, pricing, workforce, fleet

## File Locations

```
CLAUDE.md              # Global rules
.agents/
├── COMMANDS.md        # This file
├── commands/          # Slash commands
├── plans/             # Implementation plans
├── docs/prd/          # PRDs
├── docs/rca/          # RCAs
└── reference/         # Context docs
```
EOF

echo "✅ Updated .agents/COMMANDS.md"

# 5. Create templates directory if needed
echo ""
echo "Step 5: Creating verification template..."

mkdir -p .agents/templates

cat > .agents/templates/verification-checklist.md << 'EOF'
# Verification Checklist: [Feature Name]

## Test Data
- [ ] Created 3+ realistic records
- [ ] All fields populated
- [ ] Edge cases included

## Database
- [ ] Query output shown
- [ ] Data persisted correctly

## CRUD Cycle
- [ ] CREATE returns ID
- [ ] READ returns record
- [ ] UPDATE persists
- [ ] DELETE removes
- [ ] Verify DELETE (404)

## UI Binding
- [ ] No hardcoded values
- [ ] Dynamic bindings work

## Edit Modal
- [ ] Pre-populates data
- [ ] Saves to database

## Status: PASS / FAIL
EOF

echo "✅ Created verification template"

echo ""
echo "========================================"
echo "✅ Verification System Installed!"
echo "========================================"
echo ""
echo "New workflow:"
echo "  /prime → /planning → /execute → /verify → /commit"
echo ""
echo "New command:"
echo "  /verify [feature-name]"
echo ""
echo "Files created/modified:"
echo "  + .agents/commands/verify.md"
echo "  + .agents/COMMANDS.md (replaced)"
echo "  ~ CLAUDE.md (appended)"
echo "  ~ .agents/commands/execute.md (appended)"
echo "  + .agents/templates/verification-checklist.md"
echo ""