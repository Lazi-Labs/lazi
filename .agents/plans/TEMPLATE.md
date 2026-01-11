# Plan: [Feature/Task Name]

> Created: YYYY-MM-DD
> Status: Planning | In Progress | Blocked | Completed

---

## Objective

[One paragraph describing what we're building and why]

---

## Context

### Related PRD
- `docs/features/<feature>.md`

### Affected Areas
- **Database**: [schemas/tables affected]
- **API**: [routes affected]
- **Frontend**: [components/pages affected]
- **Integrations**: [ST sync, etc.]

### Dependencies
- Depends on: [other features/systems]
- Blocks: [other features]

---

## Implementation Plan

### Phase 1: Database
- [ ] Create migration `database/migrations/XXX_<name>.sql`
- [ ] Add tables/columns
- [ ] Add indexes
- [ ] Test migration

### Phase 2: API
- [ ] Create route `services/api/src/routes/<name>.js`
- [ ] Add to route index
- [ ] Create Next.js proxy `apps/web/app/api/<name>/route.ts`
- [ ] Add validation
- [ ] Add error handling

### Phase 3: Frontend
- [ ] Create component `apps/web/components/<name>/`
- [ ] Create page `apps/web/app/(dashboard)/<name>/page.tsx`
- [ ] Add to navigation
- [ ] Handle loading/error states

### Phase 4: Integration
- [ ] Wire up React Query
- [ ] Add Socket.io events (if real-time)
- [ ] Test end-to-end

### Phase 5: Polish
- [ ] Add tests
- [ ] Update documentation
- [ ] Code review

---

## Progress Log

### YYYY-MM-DD
- Started Phase 1
- Created migration file
- [notes]

### YYYY-MM-DD
- Completed Phase 1
- Started Phase 2
- [notes]

---

## Blockers

| Blocker | Status | Resolution |
|---------|--------|------------|
| [description] | Open/Resolved | [how resolved] |

---

## Notes

- [Important decisions]
- [Gotchas encountered]
- [Things to remember]

---

## Completion Checklist

- [ ] All phases complete
- [ ] Tests passing
- [ ] Documentation updated
- [ ] PR reviewed
- [ ] Deployed to staging
- [ ] Verified in staging

---

*Move to `plans/completed/` when done*
