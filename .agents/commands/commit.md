---
description: Create git commit with conventional message format
argument-hint: [file1] [file2] ... (optional)
allowed-tools: Bash(git:*)
---

# Commit: Create Git Commit

## Files: $ARGUMENTS (or all if empty)

## Process

!`git status`
!`git diff --stat HEAD`

### Commit Types
feat, fix, refactor, docs, test, chore, perf

### LAZI Scopes
pricebook, equipment, sync, api, ui, db, auth, admin, docker

### Create Commit

```bash
git add ${ARGUMENTS:-.}
git commit -m "type(scope): description

[body]

Co-authored-by: Claude <noreply@anthropic.com>"
```

!`git log -1 --oneline`

## Output
- Commit hash and message
- Next: `git push` or continue
