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
