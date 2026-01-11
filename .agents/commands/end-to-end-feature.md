# Command: /end-to-end-feature

Execute full PIV loop (Plan → Implement → Validate).

## Usage
```
/end-to-end-feature <feature-name>
```

## Phase 1: PLAN
1. Read/create PRD from `docs/features/`
2. Analyze affected areas (DB, API, UI)
3. Create implementation plan in `.agents/plans/`
4. Identify risks and dependencies

## Phase 2: IMPLEMENT

### 2.1 Database Layer
- Create migration in `database/migrations/`
- Update schema documentation
- Test migration up/down

### 2.2 API Layer
- Add routes in `services/api/src/routes/`
- Add to route index
- Create Next.js proxy in `apps/web/app/api/`
- Add validation and error handling

### 2.3 Frontend Layer
- Create components in `apps/web/components/`
- Add pages in `apps/web/app/(dashboard)/`
- Wire up React Query hooks
- Add to navigation if needed

### 2.4 Integration
- Connect all layers
- Add Socket.io events if real-time
- Update caching strategy

## Phase 3: VALIDATE
1. Test each layer independently
2. Integration testing
3. Update documentation
4. Move plan to `plans/completed/`

## Context Reset Points
Save progress after:
- PLAN phase complete
- Each IMPLEMENT sub-phase
- Before VALIDATE

## LAZI Checklist
- [ ] Migration tested
- [ ] API endpoints documented
- [ ] Frontend responsive
- [ ] Error handling complete
- [ ] Cache invalidation correct
- [ ] ST sync considered
