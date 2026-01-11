---
description: Root cause analysis for bugs/issues
argument-hint: [issue-description]
---

# Root Cause Analysis: $ARGUMENTS

## Investigation

1. **Understand**: Error messages, reproduction steps, expected vs actual
2. **Search**: Find relevant code with grep/search
3. **History**: Check recent changes with `git log`
4. **Analyze**: Determine root cause
5. **Design**: Plan the fix

## Output: Save to `.agents/docs/rca/[issue-name].md`

```markdown
# RCA: [Issue Name]

## Summary
- Description, Severity

## Problem
- Expected vs Actual
- Reproduction steps

## Root Cause
- Affected files
- Analysis

## Proposed Fix
- Files to modify
- Testing requirements
- Validation commands
```

**Next**: `/implement-fix [issue-name]`
