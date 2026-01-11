# LAZI AI Commands

## Feature Development
```
/prime → /planning [desc] → /execute [plan] → /commit
```
Or: `/end-to-end-feature [description]`

## Bug Fixes
```
/rca [issue] → /implement-fix [issue] → /commit
```

## Commands
| Command | Args | Purpose |
|---------|------|---------|
| `/prime` | - | Load context |
| `/planning` | [feature] | Create plan |
| `/execute` | [plan-path] | Implement |
| `/commit` | [files]? | Git commit |
| `/rca` | [issue] | Root cause |
| `/implement-fix` | [issue] | Fix from RCA |
| `/end-to-end-feature` | [feature] | Full workflow |

## Commit: `type(scope): description`
Types: feat, fix, refactor, docs, test, chore, perf
Scopes: pricebook, equipment, sync, api, ui, db, auth, admin, docker
