---
description: Quick bug fix without formal RCA
argument-hint: [issue-description]
allowed-tools: Bash(*), Read, Write, Edit
---

# Command: /bug-fix

Systematic bug fixing workflow.

## Usage
```
/bug-fix <issue-description>
```

## Process

### 1. REPRODUCE
- Document exact steps to reproduce
- Note expected vs actual behavior
- Identify affected environments

### 2. LOCATE
- Search codebase for relevant code
- Check recent commits (`git log --oneline -20`)
- Identify the layer (DB, API, UI)

### 3. DIAGNOSE
- Add logging/console statements
- Check database state
- Verify API responses
- Check browser console/network

### 4. FIX
- Make minimal change
- Consider edge cases
- Don't break existing functionality

### 5. VALIDATE
- Verify fix works
- Check for regressions
- Test related functionality

### 6. DOCUMENT
- Write clear commit message
- Update `rules/known-issues.md` if pattern
- Add test if appropriate

## Common LAZI Bug Patterns

### ServiceTitan Sync
```sql
-- Check sync state
SELECT * FROM raw.sync_state WHERE table_name LIKE '%<entity>%';
```

### Database Issues
- Missing schema prefix (`master.` vs `raw.`)
- Missing index (check EXPLAIN)
- N+1 queries (check logs)

### Frontend Issues
- React Query cache not invalidating
- Missing `queryClient.invalidateQueries()`
- Stale closure in useEffect

### API Issues
- Missing `asyncHandler` wrapper
- Tenant ID not passed
- BigInt serialization
