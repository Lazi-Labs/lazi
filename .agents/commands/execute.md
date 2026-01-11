---
description: Execute an implementation plan
argument-hint: [path-to-plan]
allowed-tools: Read, Write, Edit, Bash(pnpm:*), Bash(npm:*), Bash(git:*)
---

# Execute: Implement from Plan

## Plan to Execute

Read: `$ARGUMENTS`

## Instructions

### 1. Read entire plan, understand tasks and dependencies

### 2. Execute tasks in order
- Follow specifications exactly
- Maintain LAZI patterns
- Verify syntax after each change

### 3. Implement tests from Testing Strategy

### 4. Run validation
```bash
pnpm typecheck
pnpm lint
pnpm test
```

### 5. Final check
- ✅ All tasks completed
- ✅ Tests passing
- ✅ Validation passes

## Output

- Completed tasks list
- Files created/modified
- Validation results
- Ready for `/commit`
