---
description: Analyze and document root cause for a bug
argument-hint: [issue-description]
---

# Root Cause Analysis: $ARGUMENTS

## Investigation

1. **Understand**: Error messages, reproduction steps, expected vs actual
2. **Search**: `grep -r "[keyword]" apps/web/src/`
3. **History**: `git log --oneline -20 -- [paths]`
4. **Analyze**: What, why, logic error/edge case/missing validation?
5. **Design fix**: Files to change, tests needed

## Output: Save to `.agents/docs/rca/[issue-name].md`

```markdown
# RCA: [Issue Name]

## Summary
- Description, Severity (Critical/High/Medium/Low)

## Problem
- Expected vs Actual behavior
- Reproduction steps

## Root Cause
- Affected files
- Analysis explanation

## Proposed Fix
- Files to modify with changes
- Testing requirements
- Validation: pnpm typecheck, lint, test
```

**Next**: `/implement-fix [issue-name]`
