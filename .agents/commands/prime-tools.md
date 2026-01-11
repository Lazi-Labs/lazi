---
description: Prime agent for tool/utility development
---

# Prime for Tool Development

## Context

You are about to work on building or modifying tools/utilities. Load the patterns for writing AI-optimized tool docstrings.

## Read Tool Patterns

!`cat .agents/reference/adding_tools_guide.md 2>/dev/null || echo "Guide not found"`

## Key Principles

1. **Guide Tool Selection** - Clear "Use this when" scenarios
2. **Prevent Confusion** - "Do NOT use this for" with alternatives
3. **Token Efficiency** - Document costs for different modes
4. **Real Examples** - Concrete usage, not "foo/bar"

## Template

```typescript
/**
 * [One-line summary].
 * 
 * Use this when you need to:
 * - [Scenario 1]
 * - [Scenario 2]
 * 
 * Do NOT use this for:
 * - [Anti-scenario] - use [Alternative] instead
 * 
 * @param param1 - [Description with guidance]
 * @returns [Description with format details]
 * 
 * @example
 * // [Realistic example]
 * functionName({ param1: 'real/path.ts' });
 */
```

## Report

Confirm understanding of:
- Use this when / Do NOT use patterns
- Token efficiency documentation
- Realistic examples requirement
