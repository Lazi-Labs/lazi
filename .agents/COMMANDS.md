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

### Quick Bug Fix
```
/prime → /bug-fix [issue] → /verify [fix] → /commit
```

### Major Feature (PRD-First)
```
/prime → /create-prd [feature] → /planning → /execute → /verify → /commit
```

## All Commands (23 total)

| Command | Description |
|---------|-------------|
| `/prime` | Prime agent with LAZI AI codebase understanding |
| `/prime-tools` | Prime agent for tool/utility development |
| `/planning` | Create comprehensive implementation plan for a feature |
| `/execute` | Execute an implementation plan |
| `/verify` | **Verify implementation with test data and CRUD validation** |
| `/commit` | Create git commit with conventional message format |
| `/create-prd` | Create Product Requirements Document for a major feature |
| `/end-to-end-feature` | Full feature development workflow |
| `/rca` | Root cause analysis for bugs/issues |
| `/implement-fix` | Implement fix from RCA document |
| `/bug-fix` | Quick bug fix without formal RCA |
| `/add-component` | Create a new React component following LAZI patterns |
| `/analyze-codebase` | Analyze codebase structure and patterns |
| `/debug-performance` | Debug performance issues in pages or endpoints |
| `/document-api` | Generate or update API documentation |
| `/fix-types` | Fix TypeScript type errors |
| `/generate-tests` | Generate tests for a file or feature |
| `/health-check` | Check system health and diagnose issues |
| `/migration-create` | Create a new database migration |
| `/pre-deploy-check` | Run pre-deployment verification checklist |
| `/refactor` | Refactor code while maintaining functionality |
| `/review-pr` | Review a pull request or set of changes |
| `/sync-servicetitan` | Trigger or debug ServiceTitan sync operations |

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
├── commands/          # Slash commands (23 files)
├── plans/             # Implementation plans
├── docs/prd/          # PRDs
├── docs/rca/          # RCAs
├── reference/         # Context docs (12 files)
├── rules/             # Coding rules (4 files)
└── templates/         # Reusable templates
```
