# Feature: [Feature Name]

> Brief one-line description of the feature

---

## Overview

[One paragraph description of what this feature does and why it matters]

---

## User Stories

### Primary User Story

> As a **[role]**, I want **[capability]** so that **[benefit]**.

### Additional Stories

- As a **[role]**, I want **[capability]** so that **[benefit]**.
- As a **[role]**, I want **[capability]** so that **[benefit]**.

---

## Requirements

### Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-1 | [Requirement description] | Must Have |
| FR-2 | [Requirement description] | Should Have |
| FR-3 | [Requirement description] | Nice to Have |

### Non-Functional Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-1 | Performance | [e.g., < 500ms response time] |
| NFR-2 | Scalability | [e.g., Support 1000 concurrent users] |
| NFR-3 | Security | [e.g., Role-based access control] |

---

## Technical Approach

### Database Changes

**New Tables:**

```sql
-- Table: schema.table_name
CREATE TABLE schema.table_name (
    id SERIAL PRIMARY KEY,
    -- columns
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Modified Tables:**

| Table | Change | Migration |
|-------|--------|-----------|
| `schema.table` | Add column `new_column` | `XXX_feature_name.sql` |

**Indexes:**

```sql
CREATE INDEX idx_table_column ON schema.table(column);
```

### API Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/feature` | List items | Required |
| GET | `/api/feature/:id` | Get single item | Required |
| POST | `/api/feature` | Create item | Required |
| PUT | `/api/feature/:id` | Update item | Required |
| DELETE | `/api/feature/:id` | Delete item | Admin |

**Request/Response Examples:**

```json
// POST /api/feature
// Request
{
  "name": "Example",
  "value": 123
}

// Response
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Example",
    "value": 123,
    "created_at": "2025-01-11T00:00:00Z"
  }
}
```

### UI Components

**New Components:**

| Component | Location | Purpose |
|-----------|----------|---------|
| `FeaturePanel` | `components/feature/` | Main feature view |
| `FeatureDetail` | `components/feature/` | Detail/edit form |
| `FeatureModal` | `components/feature/` | Create/edit modal |

**Modified Components:**

| Component | Changes |
|-----------|---------|
| `ExistingComponent` | Add feature integration |

**Page Routes:**

| Route | Component | Description |
|-------|-----------|-------------|
| `/feature` | `FeaturePage` | Main feature page |
| `/feature/[id]` | `FeatureDetailPage` | Detail view |

### State Management

**React Query Keys:**

```typescript
['feature']                    // List
['feature', id]                // Single item
['feature', 'stats']           // Statistics
```

**Zustand Store (if needed):**

```typescript
interface FeatureStore {
  selectedId: string | null;
  filters: FeatureFilters;
  setSelectedId: (id: string | null) => void;
  setFilters: (filters: FeatureFilters) => void;
}
```

---

## Implementation Phases

### Phase 1: Foundation

**Duration:** X days

**Tasks:**
- [ ] Create database migration
- [ ] Implement API endpoints
- [ ] Add basic UI components
- [ ] Write unit tests

**Deliverables:**
- Migration file: `database/migrations/XXX_feature.sql`
- Route file: `services/api/src/routes/feature.js`
- Component: `apps/web/components/feature/FeaturePanel.tsx`

### Phase 2: Enhancement

**Duration:** X days

**Tasks:**
- [ ] Add advanced features
- [ ] Implement caching
- [ ] Add real-time updates
- [ ] Performance optimization

**Deliverables:**
- Cache integration
- Socket.io events
- Optimized queries

### Phase 3: Polish

**Duration:** X days

**Tasks:**
- [ ] UI/UX improvements
- [ ] Error handling
- [ ] Documentation
- [ ] End-to-end tests

**Deliverables:**
- Updated documentation
- Test coverage > 80%

---

## Success Criteria

### Acceptance Criteria

- [ ] User can [primary action]
- [ ] System handles [edge case]
- [ ] Performance meets [target]
- [ ] All tests pass

### Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Adoption | 80% of users | Analytics |
| Performance | < 500ms | APM |
| Error Rate | < 0.1% | Logging |
| User Satisfaction | 4/5 | Survey |

---

## Dependencies

### Depends On

| Feature/System | Reason |
|----------------|--------|
| [Feature X] | Requires [capability] |
| [System Y] | Uses [service] |

### Blocks

| Feature/System | Reason |
|----------------|--------|
| [Feature Z] | Provides [capability] |

---

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| [Risk 1] | High | Medium | [Mitigation strategy] |
| [Risk 2] | Medium | Low | [Mitigation strategy] |

---

## Open Questions

- [ ] Question 1?
- [ ] Question 2?

---

## References

- [Related PRD](../PRD.md)
- [Architecture Doc](../../.agents/ARCHITECTURE.md)
- [API Reference](../../.agents/API_ENDPOINTS.md)
- [External Resource](https://example.com)

---

## Changelog

| Date | Version | Author | Changes |
|------|---------|--------|---------|
| YYYY-MM-DD | 1.0 | [Name] | Initial draft |

---

*Feature PRD Template - LAZI AI*
