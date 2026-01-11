---
description: Review a pull request or set of changes
argument-hint: [pr-number]?
allowed-tools: Bash(*), Read, Write, Edit
---

# Command: /review-pr

Review a pull request or set of changes.

## Usage
```
/review-pr                 # Review current branch changes
/review-pr <branch>        # Review specific branch
```

## Process

### 1. Get Context
```bash
# View changed files
git diff main --stat

# View full diff
git diff main

# View commit history
git log main..HEAD --oneline
```

### 2. Review Checklist

#### Code Quality
- [ ] Follows LAZI patterns (see `rules/coding-standards.md`)
- [ ] No console.log left in production code
- [ ] Error handling present
- [ ] No hardcoded values

#### Database
- [ ] Migration is reversible
- [ ] Indexes added for new queries
- [ ] Schema prefix correct (raw/master/crm)
- [ ] No breaking changes to existing tables

#### API
- [ ] Endpoints follow REST conventions
- [ ] Input validation present
- [ ] Error responses consistent
- [ ] Auth/permissions checked

#### Frontend
- [ ] Components follow patterns
- [ ] React Query keys consistent
- [ ] Loading/error states handled
- [ ] Responsive design

#### Security
- [ ] No secrets in code
- [ ] SQL injection prevented (parameterized queries)
- [ ] XSS prevented
- [ ] Auth required where needed

### 3. Test Coverage
- [ ] Unit tests for new functions
- [ ] Integration tests for API
- [ ] Manual testing completed

### 4. Documentation
- [ ] API changes documented
- [ ] Complex logic commented
- [ ] README updated if needed

## Review Output Format

```markdown
## PR Review: <title>

### Summary
<brief description of changes>

### Approved / Changes Requested

### Comments
1. **file.ts:42** - <comment>
2. **file.ts:87** - <comment>

### Suggestions
- <optional improvement>
```
