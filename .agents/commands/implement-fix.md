---
description: Implement fix from RCA document
argument-hint: [issue-name]
allowed-tools: Read, Write, Edit, Bash(pnpm:*), Bash(git:*)
---

# Implement Fix: $ARGUMENTS

## RCA: `.agents/docs/rca/$ARGUMENTS.md`

## Process

1. Read RCA, understand root cause and proposed fix
2. Implement fix exactly as specified
3. Add tests from Testing Requirements
4. Validate: `pnpm typecheck && pnpm lint && pnpm test`
5. Verify: Follow reproduction steps, confirm fixed

## Output

- Issue and root cause summary
- Changes made (file, change)
- Tests added
- Ready for `/commit`

Suggested message:
```
fix([scope]): [description]

Fixes #$ARGUMENTS
```
