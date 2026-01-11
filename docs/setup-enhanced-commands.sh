#!/bin/bash
# LAZI AI Enhanced Agentic Command System - Module 5 Edition
# Incorporates Cole Medland's complete course patterns
# Run from: /opt/docker/apps/lazi

set -e

echo "🚀 Setting up Enhanced LAZI AI Agentic Command System (Module 5)..."

# Create directory structure
mkdir -p .agents/commands
mkdir -p .agents/plans/completed
mkdir -p .agents/docs/rca
mkdir -p .agents/docs/prd
mkdir -p .agents/reference
mkdir -p .claude

echo "📁 Directories created"

# ============================================================================
# CLAUDE.md - Global Rules File (NEW from Module 5)
# ============================================================================
cat > CLAUDE.md << 'EOF'
# LAZI AI Development Instructions

## Project Overview

LAZI AI is a ServiceTitan enhancement platform and middleware system for outdoor living contractors (pool service, landscaping, irrigation, pest control, lawn care). Built with Next.js 14 + TypeScript, PostgreSQL (Supabase) with three-schema architecture, Docker/Traefik deployment.

## Core Principles

1. **TYPE SAFETY IS NON-NEGOTIABLE**
   - All functions, methods, and variables MUST have type annotations
   - Strict TypeScript configuration enforced
   - No `any` types without explicit justification

2. **KISS** (Keep It Simple, Stupid)
   - Prefer simple, readable solutions over clever abstractions

3. **YAGNI** (You Aren't Gonna Need It)
   - Don't build features until they're actually needed

4. **THREE-SCHEMA PATTERN**
   - `raw`: Direct ServiceTitan sync data (never modify)
   - `master`: Cleaned, normalized data (LAZI managed)
   - `crm`: User customizations and extensions

## Architecture

```
apps/
├── web/                    # Next.js 14 application
│   ├── app/               # App router pages
│   │   ├── (dashboard)/   # Dashboard routes
│   │   └── api/           # API routes
│   ├── components/        # React components
│   ├── lib/               # Utilities and helpers
│   └── types/             # TypeScript types
packages/
├── ui/                    # Shared UI components
├── database/              # Database utilities
└── config/                # Shared configuration
services/
├── api/                   # Express API service
└── sync/                  # ServiceTitan sync workers
```

## Documentation Style

Use JSDoc for all functions and components:

```typescript
/**
 * Process a pricebook category update.
 * 
 * @param categoryId - The category's unique identifier
 * @param updates - Partial category data to apply
 * @returns Updated category with computed fields
 * @throws {ValidationError} If updates fail validation
 */
```

## Logging Rules

**Use structured logging with context:**

```typescript
// ✅ Good: Structured with context
logger.info('category_updated', { categoryId, changes: Object.keys(updates) });

// ❌ Bad: String interpolation
logger.info(`Updated category ${categoryId}`);
```

**Include debugging context:** IDs, input values, expected vs actual, performance metrics.

## Development Workflow

**Type checking:** `pnpm typecheck`
**Linting:** `pnpm lint`
**Tests:** `pnpm test`
**Build:** `pnpm build`
**Dev server:** `pnpm dev`

## Testing Requirements

- Unit tests for business logic
- Integration tests for API routes
- Component tests for UI
- Tests mirror source structure: `src/lib/calc.ts` → `__tests__/lib/calc.test.ts`

## Common File Locations

| Need                | Location                              |
|---------------------|---------------------------------------|
| Add API route       | apps/web/app/api/                     |
| Add frontend page   | apps/web/app/(dashboard)/             |
| Add component       | apps/web/components/                  |
| Add database type   | packages/database/                    |
| ServiceTitan sync   | services/sync/                        |

## Key Patterns

**API Route Pattern:**
```typescript
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = schema.parse(body);
    const result = await service.create(validated);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    throw error;
  }
}
```

**Component Pattern:**
```typescript
interface Props {
  data: DataType;
  onUpdate: (id: string, data: Partial<DataType>) => Promise<void>;
}

export function Component({ data, onUpdate }: Props) {
  // Implementation
}
```
EOF

echo "✅ Created CLAUDE.md"

# ============================================================================
# ENHANCED PRIME COMMAND
# ============================================================================
cat > .agents/commands/prime.md << 'EOF'
---
description: Prime agent with LAZI AI codebase understanding
---

# Prime: Load LAZI AI Context

## Objective

Build comprehensive understanding of the LAZI AI codebase.

## Process

### 1. Read Global Rules

!`cat CLAUDE.md`

### 2. Analyze Project Structure

!`ls -la apps/web/app 2>/dev/null | head -20`
!`ls -la packages 2>/dev/null`

### 3. Check Current State

!`git log -10 --oneline`
!`git branch --show-current`
!`git status --short`

### 4. Identify Key Patterns

Read recent files for patterns:
!`find apps/web/app/api -name "route.ts" | head -5 | xargs -I {} sh -c 'echo "=== {} ===" && head -50 {}'`

## Output Report

### Project Overview
- LAZI AI: ServiceTitan enhancement for outdoor living contractors
- Monorepo: apps/web (Next.js 14), packages/*, services/*
- Three-schema PostgreSQL (raw → master → crm)

### Tech Stack
- Next.js 14, TypeScript, Tailwind CSS
- PostgreSQL/Supabase, Docker/Traefik
- ServiceTitan API, BullMQ/Redis

### Architecture Patterns
- App Router with route handlers
- Three-schema database pattern
- Component-based UI

### Current State
- Branch, recent commits, uncommitted work
- Key observations

**Make this scannable - bullets and headers.**
EOF

# ============================================================================
# ENHANCED PLANNING COMMAND (Module 5 Template)
# ============================================================================
cat > .agents/commands/planning.md << 'EOF'
---
description: Create comprehensive implementation plan for a feature
argument-hint: [feature-description]
---

# Planning: Feature Implementation Plan

## Feature Description

$ARGUMENTS

## Research Process

### 1. Understand the Request
- What is being asked?
- What problem does it solve?
- Who benefits?

### 2. Analyze Existing Patterns
- Search for similar implementations
- Note file locations and patterns
- Identify reusable code

### 3. Design the Solution
- Which files to create/modify?
- What's the implementation approach?
- What are the risks?

## Create Feature Name

Create kebab-case name: **[feature-name]**

## Output: Create Plan Document

Save to: `.agents/plans/[feature-name].md`

**Use this template:**

```markdown
# Feature: [Feature Name]

## Feature Description

[Detailed description of the feature, its purpose, and value]

## User Story

As a [type of user]
I want to [action/goal]
So that [benefit/value]

## Feature Metadata

**Feature Type**: [New Capability/Enhancement/Bug Fix]
**Estimated Complexity**: [Low/Medium/High]
**Primary Systems Affected**: [List components]
**Dependencies**: [External libraries or services]

---

## CONTEXT REFERENCES

### Relevant Codebase Files (READ THESE FIRST!)

- `path/to/file.ts` (lines X-Y) - Why: [Pattern to follow]
- `path/to/model.ts` - Why: [Structure reference]

### New Files to Create

- `apps/web/app/api/[feature]/route.ts` - API endpoint
- `apps/web/components/[Feature]/index.tsx` - UI component

### Patterns to Follow

**API Route Pattern:** (from existing code)
```typescript
// Copy pattern from apps/web/app/api/[similar]/route.ts
```

**Component Pattern:** (from existing code)
```typescript
// Copy pattern from apps/web/components/[Similar]/index.tsx
```

---

## STEP-BY-STEP TASKS

### Task 1: CREATE [file-path]

- **IMPLEMENT**: [Specific implementation]
- **PATTERN**: Reference [file:line]
- **IMPORTS**: [Required imports]
- **VALIDATE**: `pnpm typecheck`

### Task 2: UPDATE [file-path]

- **ADD**: [What to add]
- **LOCATION**: [Where in file]
- **VALIDATE**: `pnpm typecheck`

[Continue for all tasks...]

---

## TESTING STRATEGY

### Unit Tests
- Test file: `__tests__/[feature].test.ts`
- Test cases: [List key scenarios]

### Integration Tests
- API endpoint tests
- Component render tests

---

## VALIDATION COMMANDS

Execute ALL in order:

```bash
# Level 1: Type checking
pnpm typecheck

# Level 2: Linting
pnpm lint

# Level 3: Tests
pnpm test

# Level 4: Build
pnpm build

# Level 5: Manual validation
curl -X POST http://localhost:3000/api/[endpoint] -d '{...}'
```

---

## ACCEPTANCE CRITERIA

- [ ] All tasks completed
- [ ] All validation commands pass
- [ ] Feature works as described
- [ ] No regressions

---

## COMPLETION CHECKLIST

- [ ] All tasks executed in order
- [ ] Each task validated immediately
- [ ] Full test suite passes
- [ ] Manual testing confirms feature works
```

**Next step**: `/execute plans/[feature-name].md`
EOF

# ============================================================================
# ENHANCED EXECUTE COMMAND (Simpler, Module 5 style)
# ============================================================================
cat > .agents/commands/execute.md << 'EOF'
---
description: Execute an implementation plan
argument-hint: [path-to-plan]
allowed-tools: Read, Write, Edit, Bash(pnpm:*), Bash(npm:*), Bash(git:*)
---

# Execute: Implement from Plan

Read the plan file and fully understand it.

Plan file: $ARGUMENTS

Read all the reference files and documentation to validate the plan is sound.

Think hard about the plan and then create detailed todos before you start implementing.

Make sure you run all validations including running the server and e2e testing with curl.

You must implement the entire plan in one go, do not stop until its complete and all validations pass.

When you are done, report back:
- [List of files added and modified]
- [Number of lines changed]
- [All validations passed] (don't lie about this)
EOF

# ============================================================================
# COMMIT COMMAND
# ============================================================================
cat > .agents/commands/commit.md << 'EOF'
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
pricebook, equipment, sync, api, ui, db, auth, pricing, workforce, fleet

### Create Commit

```bash
git add ${ARGUMENTS:-.}
git commit -m "type(scope): description

[body]

Co-authored-by: Claude <noreply@anthropic.com>"
```

!`git log -1 --oneline`
EOF

# ============================================================================
# RCA COMMAND
# ============================================================================
cat > .agents/commands/rca.md << 'EOF'
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
EOF

# ============================================================================
# IMPLEMENT-FIX COMMAND
# ============================================================================
cat > .agents/commands/implement-fix.md << 'EOF'
---
description: Implement fix from RCA document
argument-hint: [issue-name]
allowed-tools: Read, Write, Edit, Bash(pnpm:*), Bash(git:*)
---

# Implement Fix: $ARGUMENTS

## RCA: `.agents/docs/rca/$ARGUMENTS.md`

Read the RCA, implement the fix exactly as specified, add tests, run validations.

Report back:
- Changes made
- Tests added
- Validations passed

**Next**: `/commit`
EOF

# ============================================================================
# PRD COMMAND (NEW - Module 5)
# ============================================================================
cat > .agents/commands/create-prd.md << 'EOF'
---
description: Create Product Requirements Document for a major feature
argument-hint: [feature-description]
---

# Create PRD: $ARGUMENTS

## Process

### 1. Research Phase
- What problem are we solving?
- Who are the users?
- What are the technical options?

### 2. Technology Decisions
- Framework/library choices
- Architecture approach
- Integration points

### 3. Scope Definition
- What's in scope (MVP)
- What's out of scope (future)
- Success criteria

## Output: Save to `.agents/docs/prd/[feature-name]-prd.md`

```markdown
# Product Requirements Document: [Feature Name]

## Executive Summary
[One paragraph describing the feature and its value]

## Mission
[Core goal and principles]

## Target Users
[Who will use this and their needs]

## MVP Scope

### In Scope
- ✅ [Feature 1]
- ✅ [Feature 2]

### Out of Scope
- ❌ [Future feature 1]
- ❌ [Future feature 2]

## User Stories
1. As a [user], I want to [action] so that [benefit]

## Technical Approach
- Architecture decisions
- Key patterns
- Integration points

## Success Criteria
- [ ] [Measurable criterion 1]
- [ ] [Measurable criterion 2]

## Implementation Phases
### Phase 1: [Name]
- Deliverables
- Validation

### Phase 2: [Name]
- Deliverables
- Validation

## Risks & Mitigations
- Risk: [description] → Mitigation: [approach]
```

**Next**: Create implementation plan with `/planning`
EOF

# ============================================================================
# PRIME-TOOLS COMMAND (NEW - Module 5)
# ============================================================================
cat > .agents/commands/prime-tools.md << 'EOF'
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
EOF

# ============================================================================
# END-TO-END FEATURE COMMAND
# ============================================================================
cat > .agents/commands/end-to-end-feature.md << 'EOF'
---
description: Full feature development workflow
argument-hint: [feature-description]
---

# End-to-End Feature: $ARGUMENTS

## Workflow

### Step 1: Prime
Load codebase context.

### Step 2: Planning
Create implementation plan for: **$ARGUMENTS**

### Step 3: Execute
Implement the plan completely.

### Step 4: Commit
Create conventional commit.

## Summary

| Step | Output |
|------|--------|
| Prime | Context loaded |
| Planning | `plans/[name].md` |
| Execute | Implementation complete |
| Commit | Commit hash |

**Next**: `git push` and archive plan
EOF

# ============================================================================
# PLAN TEMPLATE
# ============================================================================
cat > .agents/plans/TEMPLATE.md << 'EOF'
# Feature: [Feature Name]

## Feature Description

[Detailed description]

## User Story

As a [user type]
I want to [action]
So that [benefit]

## Feature Metadata

**Type**: [New Capability/Enhancement/Bug Fix]
**Complexity**: [Low/Medium/High]
**Systems**: [List]

---

## CONTEXT REFERENCES

### Files to Read First

- `path/file.ts` (lines X-Y) - Pattern reference
- `path/file.ts` - Structure reference

### Files to Create

- `path/new-file.ts` - [Purpose]

### Patterns to Follow

```typescript
// Pattern from codebase
```

---

## STEP-BY-STEP TASKS

### Task 1: CREATE `path/file.ts`

- **IMPLEMENT**: [Details]
- **PATTERN**: [Reference]
- **VALIDATE**: `pnpm typecheck`

---

## VALIDATION COMMANDS

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

---

## ACCEPTANCE CRITERIA

- [ ] All tasks complete
- [ ] All validations pass
- [ ] Feature works
EOF

# ============================================================================
# QUICK REFERENCE
# ============================================================================
cat > .agents/COMMANDS.md << 'EOF'
# LAZI AI Commands - Quick Reference

## Feature Development (Full)
```
/prime → /planning [desc] → /execute [plan] → /commit
```
Or: `/end-to-end-feature [description]`

## Bug Fixes
```
/rca [issue] → /implement-fix [issue] → /commit
```

## Major Features (PRD-first)
```
/create-prd [feature] → /planning [feature] → /execute → /commit
```

## Tool Development
```
/prime-tools → /planning [tool] → /execute → /commit
```

## Commands

| Command | Args | Purpose |
|---------|------|---------|
| `/prime` | - | Load context |
| `/prime-tools` | - | Load tool dev context |
| `/create-prd` | [feature] | Create PRD |
| `/planning` | [feature] | Create plan |
| `/execute` | [plan-path] | Implement plan |
| `/commit` | [files]? | Git commit |
| `/rca` | [issue] | Root cause analysis |
| `/implement-fix` | [issue] | Fix from RCA |

## Commit Format

`type(scope): description`

**Types**: feat, fix, refactor, docs, test, chore, perf
**Scopes**: pricebook, equipment, sync, api, ui, db, pricing, workforce, fleet

## Plan Template

Plans go in `.agents/plans/[feature-name].md`

Key sections:
- Feature metadata
- Context references (files to read)
- Step-by-step tasks with validations
- Acceptance criteria
EOF

# ============================================================================
# SYMLINK FOR CLAUDE CODE
# ============================================================================
ln -sf ../.agents/commands .claude/commands 2>/dev/null || true

echo "✅ Setup complete!"
echo ""
echo "Files created:"
find .agents -name "*.md" | sort
echo ""
echo "New in Module 5:"
echo "  - CLAUDE.md (global rules)"
echo "  - /create-prd (PRD-first development)"
echo "  - /prime-tools (tool development context)"
echo "  - Enhanced plan template with patterns"
echo ""
echo "Workflows:"
echo "  Features: /prime → /planning → /execute → /commit"
echo "  Major:    /create-prd → /planning → /execute → /commit"
echo "  Bugs:     /rca → /implement-fix → /commit"
echo "  Tools:    /prime-tools → /planning → /execute → /commit"
