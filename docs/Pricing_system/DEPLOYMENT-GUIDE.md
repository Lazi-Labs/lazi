# Deployment Guide: Advanced Pricing System
## Claude Code vs Windsurf Analysis & Deployment Strategy

---

# TABLE OF CONTENTS

1. [Tool Comparison: Claude Code vs Windsurf](#1-tool-comparison)
2. [Recommended Approach](#2-recommended-approach)
3. [Project Setup Guide](#3-project-setup-guide)
4. [Database Deployment](#4-database-deployment)
5. [Application Deployment](#5-application-deployment)
6. [Integration with LAZI AI](#6-integration-with-lazi-ai)

---

# 1. TOOL COMPARISON

## 1.1 Claude Code (Anthropic CLI)

### What It Is
- Command-line agentic coding tool by Anthropic
- Runs in terminal with access to filesystem
- Can execute commands, write files, run tests
- Best for: Greenfield projects, refactoring, complex multi-file changes

### Strengths
✅ **Agentic Execution** - Can run commands, see results, iterate
✅ **Full Context** - Sees entire codebase structure
✅ **Terminal Native** - Perfect for CLI workflows
✅ **Multi-file Edits** - Handles complex refactors well
✅ **Git Integration** - Can commit, branch, manage version control
✅ **Testing** - Can run tests and fix failures

### Weaknesses
❌ **No Visual Preview** - Can't see UI rendering
❌ **Learning Curve** - CLI-based workflow
❌ **Rate Limits** - API usage limits apply
❌ **No IDE Features** - No autocomplete, syntax highlighting

### Best Use Cases
```
• Initial project scaffolding
• Database migrations
• Backend API development
• Complex refactoring across multiple files
• CI/CD setup
• Test writing and debugging
```

---

## 1.2 Windsurf (AI IDE)

### What It Is
- AI-powered code editor (fork of VSCode)
- Visual IDE with Cascade AI assistant
- Real-time preview capabilities
- Best for: Frontend development, visual work, iterative UI changes

### Strengths
✅ **Visual Preview** - See React/HTML changes instantly
✅ **IDE Features** - Syntax highlighting, autocomplete, extensions
✅ **Cascade Context** - Understands your codebase deeply
✅ **Multi-file Aware** - Can edit multiple files in context
✅ **Terminal Access** - Built-in terminal for commands
✅ **Git UI** - Visual git management

### Weaknesses
❌ **Less Autonomous** - Requires more interaction
❌ **Context Window** - Limited by what's open/indexed
❌ **Heavy** - Resource-intensive IDE
❌ **Learning Cascade** - Specific prompting techniques

### Best Use Cases
```
• Frontend component development
• UI/UX iteration and refinement
• Visual debugging
• CSS/Tailwind styling
• React component building
• Real-time preview workflows
```

---

## 1.3 Comparison Matrix

| Capability | Claude Code | Windsurf |
|------------|-------------|----------|
| Agentic Execution | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| Visual Preview | ❌ | ⭐⭐⭐⭐⭐ |
| Multi-file Edits | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Database Work | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| Frontend/React | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Backend/API | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Testing | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| CI/CD Setup | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| Learning Curve | Medium | Low |
| IDE Features | ❌ | ⭐⭐⭐⭐⭐ |

---

# 2. RECOMMENDED APPROACH

## 2.1 🎯 Verdict: Use BOTH (Hybrid Workflow)

The optimal approach is a **hybrid workflow** leveraging each tool's strengths:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        HYBRID DEVELOPMENT WORKFLOW                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PHASE 1: PROJECT SETUP                    → Claude Code                    │
│  ─────────────────────────────────────────────────────────                  │
│  • Project scaffolding (Next.js/Vite)                                       │
│  • Directory structure creation                                             │
│  • Package.json and dependencies                                            │
│  • Docker/Traefik configuration                                             │
│  • Database schema deployment                                               │
│                                                                             │
│  PHASE 2: BACKEND DEVELOPMENT              → Claude Code                    │
│  ─────────────────────────────────────────────────────────                  │
│  • API routes                                                               │
│  • Database queries and migrations                                          │
│  • Authentication/authorization                                             │
│  • Server-side calculations                                                 │
│  • Supabase integration                                                     │
│                                                                             │
│  PHASE 3: FRONTEND DEVELOPMENT             → Windsurf                       │
│  ─────────────────────────────────────────────────────────                  │
│  • React components                                                         │
│  • UI/UX implementation                                                     │
│  • Tailwind styling                                                         │
│  • Interactive features                                                     │
│  • Visual debugging                                                         │
│                                                                             │
│  PHASE 4: INTEGRATION & TESTING            → Claude Code                    │
│  ─────────────────────────────────────────────────────────                  │
│  • Integration testing                                                      │
│  • E2E tests                                                                │
│  • Performance optimization                                                 │
│  • CI/CD pipeline                                                           │
│                                                                             │
│  PHASE 5: DEPLOYMENT                       → Claude Code                    │
│  ─────────────────────────────────────────────────────────                  │
│  • Docker builds                                                            │
│  • Traefik configuration                                                    │
│  • Production deployment                                                    │
│  • Health checks                                                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 2.2 Specific Recommendations for This Project

### Use Claude Code For:

1. **Database Schema Deployment**
   ```bash
   # Claude Code can:
   - Execute SQL migrations
   - Test queries
   - Seed data
   - Set up RLS policies
   ```

2. **Docker/Traefik Setup**
   ```bash
   # Claude Code can:
   - Create docker-compose.yml
   - Configure Traefik labels
   - Set up networking
   - Deploy to your server
   ```

3. **API Development**
   ```bash
   # Claude Code can:
   - Create Next.js API routes
   - Implement Supabase queries
   - Set up authentication
   - Write calculation logic
   ```

4. **Testing & CI/CD**
   ```bash
   # Claude Code can:
   - Write Jest/Vitest tests
   - Set up GitHub Actions
   - Run tests and fix failures
   - Configure pre-commit hooks
   ```

### Use Windsurf For:

1. **React Component Development**
   - Build each component with visual preview
   - Iterate on UI/UX quickly
   - Debug layout issues visually

2. **Tailwind Styling**
   - See color/spacing changes instantly
   - Responsive design testing
   - Animation tuning

3. **State Management**
   - Debug React state visually
   - Test user interactions
   - Form handling

4. **Integration with Existing LAZI UI**
   - Match existing design patterns
   - Ensure consistency
   - Visual comparison

---

# 3. PROJECT SETUP GUIDE

## 3.1 Claude Code Initial Setup

### Step 1: Create Project Structure

```bash
# In Claude Code, run this prompt:

"Create a new Next.js 14 project for the Advanced Pricing System with:
- TypeScript
- Tailwind CSS
- Supabase integration
- The folder structure from PRICING-SYSTEM-DOCUMENTATION.md
- Docker configuration for Traefik deployment

Project should be at: /home/yanni/lazi-apps/pricing-system"
```

### Step 2: Deploy Database Schema

```bash
# In Claude Code:

"Deploy the pricing-system-schema.sql to Supabase:
1. Connect to Supabase project
2. Run the schema in a transaction
3. Verify tables were created
4. Seed default data for organization: Perfect Catch & Pools"
```

### Step 3: Create API Routes

```bash
# In Claude Code:

"Create the following API routes based on the documentation:
- /api/pricing/technicians (CRUD)
- /api/pricing/office-staff (CRUD)
- /api/pricing/vehicles (CRUD)
- /api/pricing/expenses (CRUD)
- /api/pricing/job-types (CRUD)
- /api/pricing/markup-tiers (CRUD)
- /api/pricing/scenarios (CRUD)
- /api/pricing/calculate (GET computed values)

Use Supabase client with RLS for organization isolation"
```

## 3.2 Windsurf Frontend Development

### Step 1: Create Components

```
Open Windsurf with the project folder.

Prompt Cascade:

"Using the component specifications from PRICING-SYSTEM-DOCUMENTATION.md,
create the following components in order:

1. Common components (MetricCard, SectionCard, InputField, Toggle, TabButton)
2. WorkforceTab with TechnicianCard and OfficeStaffCard
3. FleetTab with vehicle management
4. ExpensesTab with category management
5. RatesTab with job type configuration
6. AnalysisTab with P&L breakdown
7. ScenariosTab with save/load functionality
8. SettingsTab with company configuration

Follow the existing LAZI AI design patterns and color scheme."
```

### Step 2: Iterate on UI

```
Use Windsurf's preview to:
- Adjust spacing and layout
- Fine-tune colors to match existing system
- Test responsive behavior
- Debug interaction issues
```

---

# 4. DATABASE DEPLOYMENT

## 4.1 Supabase Migration Strategy

### Option A: Direct SQL (Recommended for Initial Setup)

```sql
-- Run in Supabase SQL Editor or via Claude Code

-- 1. Create schema
\i pricing-system-schema.sql

-- 2. Verify
SELECT table_name FROM information_schema.tables WHERE table_schema = 'pricing';

-- 3. Create organization
INSERT INTO pricing.organizations (name, slug, servicetitan_tenant_id)
VALUES ('Perfect Catch & Pools', 'perfect-catch', '3222348440');

-- 4. Seed defaults
SELECT pricing.seed_org_defaults(
    (SELECT id FROM pricing.organizations WHERE slug = 'perfect-catch')
);
```

### Option B: Supabase Migrations (Recommended for Ongoing)

```bash
# Directory structure
/supabase
  /migrations
    /20240108000000_create_pricing_schema.sql
    /20240108000001_create_organizations.sql
    /20240108000002_create_technicians.sql
    ...
```

## 4.2 Migration Commands (Claude Code)

```bash
# Initialize Supabase locally
supabase init

# Link to remote project
supabase link --project-ref YOUR_PROJECT_REF

# Generate migration from SQL
supabase migration new create_pricing_schema

# Deploy migrations
supabase db push

# Generate TypeScript types
supabase gen types typescript --linked > src/types/database.ts
```

---

# 5. APPLICATION DEPLOYMENT

## 5.1 Docker Configuration

### docker-compose.yml

```yaml
version: '3.8'

services:
  pricing-system:
    container_name: lazi-pricing
    build:
      context: .
      dockerfile: Dockerfile
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
    networks:
      - traefik-net
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.pricing.rule=Host(`pricing.lazilabs.com`)"
      - "traefik.http.routers.pricing.entrypoints=websecure"
      - "traefik.http.routers.pricing.tls.certresolver=letsencrypt"
      - "traefik.http.services.pricing.loadbalancer.server.port=3000"
      
networks:
  traefik-net:
    external: true
```

### Dockerfile

```dockerfile
FROM node:20-alpine AS base

# Dependencies
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Builder
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Runner
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
```

## 5.2 Deployment Commands (Claude Code)

```bash
# SSH to server
ssh office

# Navigate to project
cd /home/yanni/lazi-apps/pricing-system

# Pull latest code
git pull origin main

# Build and deploy
docker-compose build
docker-compose up -d

# Check logs
docker-compose logs -f pricing-system

# Health check
curl https://pricing.lazilabs.com/api/health
```

---

# 6. INTEGRATION WITH LAZI AI

## 6.1 Integration Points

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         LAZI AI PLATFORM INTEGRATION                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐                      ┌─────────────────┐              │
│  │  LAZI AI MAIN   │                      │ PRICING SYSTEM  │              │
│  │    (Next.js)    │◄────────────────────►│   (Next.js)     │              │
│  │                 │     API Calls         │                 │              │
│  │  lazilabs.com   │     Shared Auth       │ pricing.lazilabs│              │
│  └────────┬────────┘                      └────────┬────────┘              │
│           │                                        │                        │
│           │                                        │                        │
│           ▼                                        ▼                        │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │                         SUPABASE                                 │       │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │       │
│  │  │  raw schema  │  │ master schema│  │pricing schema│          │       │
│  │  │              │  │              │  │              │          │       │
│  │  │ ServiceTitan │  │ Transformed  │  │ Technicians  │          │       │
│  │  │ Raw Data     │  │ Data         │  │ Vehicles     │          │       │
│  │  │              │  │              │  │ Expenses     │          │       │
│  │  └──────────────┘  └──────────────┘  └──────────────┘          │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 6.2 Shared Authentication

```typescript
// Use same Supabase project for auth
// pricing-system/src/lib/supabase.ts

import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// User is already authenticated via LAZI AI main app
// Pricing system checks session and org membership
```

## 6.3 Navigation Integration

```typescript
// Add to LAZI AI main navigation
// lazi-platform/src/components/Navigation.tsx

const navItems = [
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Pricebook', href: '/pricebook' },
  { name: 'Pricing Calculator', href: 'https://pricing.lazilabs.com', external: true },
  // ...
];
```

## 6.4 ServiceTitan Sync

```typescript
// Sync employees from ServiceTitan to pricing system
// pricing-system/src/lib/servicetitan-sync.ts

export async function syncEmployeesFromServiceTitan(orgId: string) {
  // 1. Fetch employees from master.employees (already synced)
  const { data: stEmployees } = await supabase
    .from('master.employees')
    .select('*')
    .eq('organization_id', orgId);
  
  // 2. Upsert into pricing.technicians
  for (const emp of stEmployees) {
    await supabase
      .from('pricing.technicians')
      .upsert({
        organization_id: orgId,
        servicetitan_employee_id: emp.servicetitan_id,
        first_name: emp.first_name,
        last_name: emp.last_name,
        // ... map fields
      }, {
        onConflict: 'organization_id,servicetitan_employee_id'
      });
  }
}
```

---

# 7. IMPLEMENTATION PROMPTS

## 7.1 Claude Code Prompts

### Initial Setup
```
Create a new Next.js 14 project called 'lazi-pricing-system' with:
- TypeScript strict mode
- Tailwind CSS with the config from our design system
- Supabase client setup
- Environment variables for Supabase
- The full directory structure from PRICING-SYSTEM-DOCUMENTATION.md

Initialize git and create initial commit.
```

### Database Setup
```
Using the pricing-system-schema.sql file, create Supabase migrations:
1. Split into logical migration files
2. Add down migrations for rollback
3. Create seed file for Perfect Catch & Pools organization
4. Generate TypeScript types from schema
```

### API Routes
```
Create Next.js API routes for the pricing system:
- Use the TypeScript interfaces from the documentation
- Implement proper error handling
- Add request validation with Zod
- Use Supabase RLS for org isolation
- Include pagination for list endpoints
```

### Testing
```
Write comprehensive tests for:
1. Calculation functions (unit tests)
2. API routes (integration tests)
3. Critical user flows (e2e tests)

Use Vitest for unit/integration, Playwright for e2e.
Run tests and fix any failures.
```

## 7.2 Windsurf/Cascade Prompts

### Component Development
```
Create the TechnicianCard component based on the specification in 
PRICING-SYSTEM-DOCUMENTATION.md section 4.3.

The component should:
- Support collapsed and expanded states
- Show burden breakdown when expanded
- Include unproductive time editor
- Match the LAZI AI design system colors
- Be fully responsive

Use the calculation hooks for computed values.
```

### Styling Iteration
```
The TechnicianCard gradient header doesn't match the rest of the app.
Update it to use a more subtle gradient from sky-500 to indigo-600
and ensure the text contrast meets accessibility standards.
```

### Integration
```
Connect the TechnicianCard to the API:
1. Fetch technicians from /api/pricing/technicians
2. Implement optimistic updates for edits
3. Add loading and error states
4. Handle real-time updates via Supabase subscription
```

---

# 8. DEPLOYMENT CHECKLIST

## 8.1 Pre-Deployment

- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Seed data created
- [ ] RLS policies verified
- [ ] API endpoints tested
- [ ] UI tested across browsers
- [ ] Mobile responsive verified
- [ ] Performance optimized
- [ ] Error tracking configured (Sentry)

## 8.2 Deployment Steps

```bash
# 1. Final local test
npm run test
npm run build
npm run start  # Test production build locally

# 2. Push to git
git add .
git commit -m "Ready for production deployment"
git push origin main

# 3. Deploy database (if changes)
supabase db push

# 4. Deploy application
ssh office
cd /home/yanni/lazi-apps/pricing-system
git pull
docker-compose build --no-cache
docker-compose up -d

# 5. Verify deployment
curl https://pricing.lazilabs.com/api/health
docker-compose logs -f --tail=100

# 6. Test critical flows
# - Login
# - Load technicians
# - Edit technician
# - Calculate rates
# - Save scenario
```

## 8.3 Post-Deployment

- [ ] Monitor error tracking
- [ ] Check performance metrics
- [ ] Verify database connections
- [ ] Test user flows in production
- [ ] Update documentation if needed

---

# SUMMARY

## Recommended Tool Usage

| Task | Tool | Reason |
|------|------|--------|
| Project Setup | Claude Code | Full filesystem access, scaffolding |
| Database Schema | Claude Code | Can execute SQL, verify results |
| API Routes | Claude Code | Backend logic, testing |
| React Components | Windsurf | Visual preview, rapid iteration |
| Styling/CSS | Windsurf | Real-time visual feedback |
| Testing | Claude Code | Can run tests, fix failures |
| Deployment | Claude Code | Docker, SSH, server commands |
| Bug Fixes | Either | Depends on backend vs frontend |

## Quick Start Commands

```bash
# Claude Code - Start project
claude "Create the pricing system project structure"

# Windsurf - Open and develop
windsurf /path/to/lazi-pricing-system

# Deploy
claude "Deploy the pricing system to production"
```

---

**Document Version:** 1.0
**Last Updated:** January 8, 2026
**Author:** LAZI AI Development Team
