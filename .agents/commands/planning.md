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
