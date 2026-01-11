#!/bin/bash
# LAZI AI Agentic Command System Setup
# Run this from your LAZI project root: /opt/docker/apps/lazi

set -e

echo "🚀 Setting up LAZI AI Agentic Command System..."

# Create directories
mkdir -p .agents/commands
mkdir -p .agents/plans/completed
mkdir -p .agents/docs/rca
mkdir -p .claude

echo "📁 Directories created"

# Create prime.md
cat > .agents/commands/prime.md << 'EOF'
---
description: Prime agent with LAZI AI codebase understanding
---

# Prime: Load LAZI AI Context

## Objective

Build comprehensive understanding of the LAZI AI codebase.

## Process

### 1. Analyze Project Structure

!`ls -la packages 2>/dev/null || echo "No packages dir"`
!`find apps/web/src -maxdepth 2 -type d 2>/dev/null | head -20`

### 2. Read Core Documentation

!`cat .agents/AGENTS.md 2>/dev/null || echo "No AGENTS.md"`

### 3. Check Current State

!`git log -10 --oneline`
!`git branch --show-current`
!`git status --short`

## Output Report

### Project Overview
- LAZI AI: ServiceTitan enhancement for outdoor living contractors
- Monorepo: apps/web (Next.js 14), packages/*, Docker
- Three-schema PostgreSQL (raw → master → crm)

### Tech Stack
- Next.js 14, TypeScript, PostgreSQL/Supabase
- Docker/Traefik, ServiceTitan API, BullMQ/Redis

### Current State
- Branch, recent commits, uncommitted work
EOF

# Create planning.md
cat > .agents/commands/planning.md << 'EOF'
---
description: Research and create implementation plan for a feature
argument-hint: [feature-description]
---

# Planning: Feature Implementation Plan

## Feature Description

$ARGUMENTS

## Create Feature Name

Create kebab-case name (e.g., "equipment-detail-page").
**Feature Name**: [create-feature-name]
Save to: `.agents/plans/[feature-name].md`

## Research Process

1. Analyze existing LAZI patterns in /apps/web/src
2. Check /packages for reusable utilities
3. Review API routes in /apps/web/src/app/api
4. Consider three-schema pattern, ServiceTitan sync, TypeScript strict mode

## Output: Create Plan Document

**CRITICAL**: Format for ANOTHER AGENT to execute without context.

Required sections:
- Overview (feature, priority, effort)
- Requirements & Success Criteria
- Files to Create/Modify (with full paths)
- Step by Step Tasks (numbered, detailed)
- Testing Strategy
- Validation Commands (pnpm typecheck, lint, test)

**Next**: `/execute plans/[feature-name].md`
EOF

# Create execute.md
cat > .agents/commands/execute.md << 'EOF'
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
EOF

# Create commit.md
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
EOF

# Create rca.md
cat > .agents/commands/rca.md << 'EOF'
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
EOF

# Create implement-fix.md
cat > .agents/commands/implement-fix.md << 'EOF'
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
EOF

# Create end-to-end-feature.md
cat > .agents/commands/end-to-end-feature.md << 'EOF'
---
description: Autonomously develop complete feature from planning to commit
argument-hint: [feature-description]
---

# End-to-End Feature: $ARGUMENTS

Chains: prime → planning → execute → commit

---

## Step 1: Prime
@commands/prime.md

## Step 2: Planning (feature: $ARGUMENTS)
@commands/planning.md
Note the feature name for Step 3.

## Step 3: Execute (plan: plans/[feature-name].md)
@commands/execute.md

## Step 4: Commit
@commands/commit.md

---

## Summary

| Step | Status |
|------|--------|
| Prime | ✅ |
| Planning | ✅ plans/[name].md |
| Execute | ✅ |
| Commit | ✅ [hash] |

**Next**: `git push` or `mv plans/[name].md plans/completed/`
EOF

# Create TEMPLATE.md
cat > .agents/plans/TEMPLATE.md << 'EOF'
# Implementation Plan: [Feature Name]

## Overview
- **Feature**: [description]
- **Priority**: High/Medium/Low
- **Effort**: Small/Medium/Large

## Requirements
- [ ] [Requirement 1]

## Success Criteria
- [ ] [Criterion 1]

## Files to Create
| File Path | Purpose |
|-----------|---------|
| `apps/web/src/...` | [Description] |

## Files to Modify
| File Path | Changes |
|-----------|---------|
| `apps/web/src/...` | [Description] |

## Step by Step Tasks

### Task 1: [Name]
**File**: `[path]` (create/modify)
**Action**: [What to do]
**Details**: [specifics]

## Testing Strategy
| Test File | Tests |
|-----------|-------|
| `__tests__/...` | [Description] |

## Validation Commands
```bash
pnpm typecheck
pnpm lint  
pnpm test
```

Ready for: `/execute plans/[feature-name].md`
EOF

# Create COMMANDS.md quick reference
cat > .agents/COMMANDS.md << 'EOF'
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
EOF

# Create symlink for Claude Code
ln -sf ../.agents/commands .claude/commands 2>/dev/null || true

echo "✅ Setup complete!"
echo ""
echo "Structure created:"
find .agents -type f -name "*.md" | sort
echo ""
echo "To use:"
echo "  /prime                              - Load codebase context"
echo "  /planning add user dashboard        - Create implementation plan"
echo "  /execute plans/user-dashboard.md    - Implement the plan"
echo "  /commit                             - Create conventional commit"
