# LAZI AI - Product Requirements Document

> The operating system for outdoor living contractors - enhancing ServiceTitan while building toward platform independence.

---

## Vision

LAZI AI transforms how outdoor living contractors manage their businesses by providing an intelligent layer on top of ServiceTitan that:

1. **Enhances** existing ServiceTitan workflows with better UX and additional features
2. **Organizes** pricebook data for accuracy, consistency, and profitability
3. **Automates** repetitive tasks through AI-powered workflows
4. **Prepares** for platform independence with a provider-agnostic architecture

---

## Target Market

### Primary Verticals

| Industry | Pain Points | LAZI Solution |
|----------|-------------|---------------|
| **Pool Service & Building** | Complex pricebooks, seasonal scheduling | Material kits, smart scheduling |
| **Landscaping & Lawn Care** | Route optimization, recurring services | Automated dispatching |
| **Irrigation Systems** | Parts inventory, warranty tracking | Equipment management |
| **Pest Control** | Compliance, treatment scheduling | Workflow automation |

### Target Customer Profile

- **Company Size**: 5-100 technicians
- **Revenue**: $1M - $50M annually
- **Current Stack**: ServiceTitan users (or evaluating)
- **Tech Savvy**: Willing to adopt new tools for efficiency

---

## Core Modules

### Phase 1: Foundation ✅ COMPLETE

| Feature | Status | Description |
|---------|--------|-------------|
| ServiceTitan Sync Engine | ✅ | Bidirectional data sync with ST API |
| Three-Schema Architecture | ✅ | raw/master/crm data separation |
| Pricebook Management | ✅ | Materials, services, equipment CRUD |
| Category Hierarchy | ✅ | Drag-drop organization with ltree |
| Material Kits | ✅ | Bundle materials for common jobs |
| Image Management | ✅ | S3 migration, on-demand fetching |
| Real-time Updates | ✅ | Socket.io for sync progress |
| CRM Pipelines | ✅ | Basic opportunity tracking |

### Phase 2: Enhancement 🔄 CURRENT

| Feature | Status | Description |
|---------|--------|-------------|
| Organization Dashboard | 🔄 | Health scoring, duplicate detection |
| Bulk Operations | 🔄 | Mass update, categorize, review |
| Advanced Pricing | 📅 | Margin analysis, pricing rules |
| Equipment Detail Page | 📅 | Full equipment management |
| Performance Optimization | 📅 | Virtualization, lazy loading |
| Audit Trail | 📅 | Complete change history |

### Phase 3: Intelligence 📅 PLANNED

| Feature | Status | Description |
|---------|--------|-------------|
| AI Categorization | 📅 | Auto-categorize new items |
| Duplicate Resolution | 📅 | AI-suggested merges |
| Price Optimization | 📅 | Market-based pricing suggestions |
| Demand Forecasting | 📅 | Predict material needs |
| Smart Scheduling | 📅 | AI-optimized dispatch |

### Phase 4: Independence 📅 FUTURE

| Feature | Status | Description |
|---------|--------|-------------|
| Provider Pattern | 📅 | Abstract ST-specific code |
| Mobile Technician App | 📅 | React Native field app |
| Full CRM | 📅 | Complete customer management |
| Multi-tenant | 📅 | Support multiple companies |
| Standalone Mode | 📅 | Operate without ServiceTitan |

---

## Technical Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              LAZI AI Platform                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         Frontend Layer                               │   │
│  │  Next.js 14 • React 18 • TailwindCSS • shadcn/ui • TanStack Query   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         Backend Layer                                │   │
│  │  Express.js • BullMQ • Socket.io • Temporal • Redis                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                          Data Layer                                  │   │
│  │  PostgreSQL (Supabase) • Three-Schema Architecture • S3             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                       Integration Layer                              │   │
│  │  ServiceTitan API • Plaid • Slack • Salesforce • Twilio             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Technical Decisions

| Decision | Rationale |
|----------|-----------|
| **Three-Schema DB** | Separate concerns: raw ST data, processed data, local overrides |
| **Next.js Proxy** | Simplify CORS, add server-side logic, unified API |
| **BullMQ over Temporal** | Simpler for most jobs; Temporal for complex workflows |
| **shadcn/ui** | Customizable, accessible, modern component library |
| **TanStack Query** | Powerful caching, optimistic updates, real-time sync |

### Data Flow

```
ServiceTitan API
       │
       ▼ (Pull)
┌─────────────────┐
│    raw.*        │  Immutable ST data
└────────┬────────┘
         │
         ▼ (Process)
┌─────────────────┐
│   master.*      │  Normalized CRM data
└────────┬────────┘
         │
         ▼ (Override)
┌─────────────────┐
│    crm.*        │  Local changes
└────────┬────────┘
         │
         ▼ (Push)
ServiceTitan API
```

---

## Current Focus (Q1 2025)

### Organization Dashboard

**Goal**: Help users maintain a healthy, organized pricebook

**Features**:
- Health score (0-100) based on completeness
- Issue detection (no image, no price, duplicates)
- Bulk review workflow
- Category completeness metrics
- Duplicate detection and merge

**Success Metrics**:
- 80%+ of items reviewed within 30 days
- <5% items with critical issues
- 50% reduction in duplicate items

### Advanced Pricing System

**Goal**: Enable sophisticated pricing strategies

**Features**:
- Margin analysis by category
- Pricing rules (markup %, floor/ceiling)
- Member pricing automation
- Cost tracking and alerts
- Profitability reports

**Success Metrics**:
- 10% improvement in average margin
- 90% of items with accurate costs
- Real-time margin visibility

---

## User Stories

### Pricebook Manager

> As a **pricebook manager**, I want to **quickly identify and fix incomplete items** so that **technicians have accurate information in the field**.

Acceptance Criteria:
- [ ] Dashboard shows items needing attention
- [ ] One-click navigation to problem items
- [ ] Bulk update capabilities
- [ ] Progress tracking

### Office Administrator

> As an **office administrator**, I want to **sync changes to ServiceTitan** so that **all systems stay in sync**.

Acceptance Criteria:
- [ ] Clear indication of pending changes
- [ ] One-click push to ServiceTitan
- [ ] Confirmation of successful sync
- [ ] Error handling with clear messages

### Business Owner

> As a **business owner**, I want to **understand my pricebook health** so that **I can ensure profitability**.

Acceptance Criteria:
- [ ] Overall health score visible
- [ ] Margin analysis by category
- [ ] Trend tracking over time
- [ ] Actionable recommendations

---

## Non-Functional Requirements

### Performance

| Metric | Target |
|--------|--------|
| Page Load | < 2 seconds |
| API Response | < 500ms (p95) |
| Sync Speed | 1000 items/minute |
| Concurrent Users | 50+ |

### Reliability

| Metric | Target |
|--------|--------|
| Uptime | 99.9% |
| Data Loss | Zero tolerance |
| Sync Accuracy | 100% |
| Error Rate | < 0.1% |

### Security

| Requirement | Implementation |
|-------------|----------------|
| Authentication | JWT with refresh tokens |
| Authorization | Role-based access control |
| Data Encryption | TLS in transit, encrypted at rest |
| API Security | Rate limiting, input validation |
| Audit Trail | All changes logged |

---

## Integrations

### Current

| Integration | Status | Purpose |
|-------------|--------|---------|
| ServiceTitan | ✅ Active | Primary FSM platform |
| Plaid | ✅ Active | Bank account linking |
| Slack | ✅ Active | Notifications |
| Redis | ✅ Active | Caching, queues |

### Planned

| Integration | Priority | Purpose |
|-------------|----------|---------|
| QuickBooks | High | Accounting sync |
| Stripe | High | Payment processing |
| Twilio | Medium | SMS notifications |
| SendGrid | Medium | Email campaigns |
| Salesforce | Low | Enterprise CRM |

---

## Success Metrics

### Business Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Active Users | - | 100+ |
| Items Managed | 8,000+ | 50,000+ |
| Sync Operations/Day | - | 1,000+ |
| Customer Retention | - | 95%+ |

### Product Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Pricebook Health Score | - | 85%+ avg |
| Items Reviewed | - | 90%+ |
| Sync Success Rate | - | 99%+ |
| User Satisfaction | - | 4.5/5 |

---

## Roadmap

### Q1 2025
- [ ] Organization Dashboard MVP
- [ ] Bulk operations
- [ ] Health scoring
- [ ] Duplicate detection

### Q2 2025
- [ ] Advanced pricing system
- [ ] Margin analysis
- [ ] Equipment detail page
- [ ] Performance optimization

### Q3 2025
- [ ] AI categorization
- [ ] Smart recommendations
- [ ] Mobile app beta
- [ ] Multi-tenant foundation

### Q4 2025
- [ ] Provider pattern abstraction
- [ ] Additional integrations
- [ ] Enterprise features
- [ ] Standalone mode beta

---

## Appendix

### Glossary

| Term | Definition |
|------|------------|
| **Pricebook** | Catalog of materials, services, and equipment |
| **Material** | Physical item sold or used in service |
| **Service** | Labor or work performed |
| **Kit** | Bundle of materials for common jobs |
| **ST** | ServiceTitan |
| **Tenant** | ServiceTitan company account |

### Related Documents

- `.agents/ARCHITECTURE.md` - Technical architecture
- `.agents/DATABASE.md` - Database schema
- `.agents/API_ENDPOINTS.md` - API reference
- `.agents/reference/pricebook-system.md` - Pricebook domain

---

*Product Requirements Document - January 2025*
*Version 1.0*
