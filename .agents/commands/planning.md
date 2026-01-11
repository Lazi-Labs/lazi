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
