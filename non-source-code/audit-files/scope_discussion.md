# PropPulse OS — Scope & Backend Discussion

## Current State Assessment

### What Already Exists (Frontend — Vite + React + TypeScript + TailwindCSS)

| Area | Files | Status |
|------|-------|--------|
| **Auth Pages** | Login, Signup, ForgotPassword | ✅ UI built, mock auth via `fakeBaseQuery` |
| **Dashboard** | StatCards, LeadSourceChart, LeadsOverTimeChart, PipelineSummaryBar, ActivityFeed | ✅ Full UI, reads from mock data |
| **Contacts** | ContactsPage + ContactDetailPage with components | ✅ Full CRUD UI, mock data (4,099 bytes of seed data) |
| **Pipeline** | Kanban board, DealModal, DealDetailDrawer | ✅ Full drag-and-drop pipeline UI |
| **Inbox** | Omnichannel inbox page + components | ✅ Conversation threads UI built |
| **Dialer** | DialerPage + DialerSlice (state for multi-line) | ✅ Multi-line parallel dialer UI |
| **AI ISA** | AiIsaPage + components | ✅ Configuration/monitoring UI built |
| **Lead Ingestion** | LeadIngestionPage + components | ✅ Source management + routing rules UI |
| **Data Health** | DataHealthPage + components | ✅ Score dashboard, duplicate detection UI |
| **Smart Lists** | SmartListsPage | ✅ Dynamic filtering UI |
| **Settings** | SettingsPage + sub-components | ✅ Team, integrations, notification prefs UI |
| **Layouts** | AppLayout (sidebar/topbar) + AuthLayout | ✅ Complete shell |

### What's Currently Broken / Needs Rework for Backend

| Issue | Detail |
|-------|--------|
| **`fakeBaseQuery()`** | ALL API calls use RTK Query's `fakeBaseQuery` with in-memory mock data. Zero real HTTP calls. |
| **`localStorage` for auth** | Auth tokens stored in `localStorage`. You want **httpOnly cookies** instead. |
| **No role-based dashboard differentiation** | Single dashboard for all roles. `ProtectedRoute` has `requiredRoles` prop but it's never used in routing. |
| **Roles mismatch** | Current: `super_admin`, `brokerage_owner`, `team_lead`, `agent`. You want: `super_admin`, `admin`, `agent`, `lead/customer`. |
| **No backend exists at all** | No `server/` or `backend/` directory. Everything is client-side mock. |

---

## Blueprint vs. Realistic 8-Day Scope

The Master Blueprint describes a **12-month, enterprise-grade product** with:
- Voice AI (Retell/Synthflow), Parallel Dialer (Twilio/SignalWire SIP), WhatsApp Cloud API, Elasticsearch, eSignatures, Commission Accounting, Predictive Seller Radar, DNC Registry APIs, Mobile App (iOS/Android), etc.

> [!IMPORTANT]
> **An 8-day sprint cannot build all 7 modules of the blueprint.** We need to define what goes to production in 8 days vs. what gets deferred.

### Proposed "Production-Ready in 8 Days" Scope

#### ✅ IN SCOPE (Core CRM + Backend)

| # | Feature Area | What Gets Built |
|---|-------------|----------------|
| 1 | **Auth & RBAC** | JWT via httpOnly cookies, bcrypt(12), 4 roles (super_admin, admin, agent, lead/customer), role-based dashboards, middleware guards |
| 2 | **Contact Management** | Full CRUD, search, filter, pagination, assigned agent, tags, notes, activity log |
| 3 | **Lead Ingestion & Routing** | Lead sources CRUD, routing rules (round-robin, weighted, zip-code), webhook receiver endpoint |
| 4 | **Pipeline & Deals** | Kanban pipeline, deal CRUD, stage transitions, deal assignment |
| 5 | **Data Health Engine** | Duplicate detection (fuzzy matching), data quality scoring, merge duplicates |
| 6 | **Smart Lists** | Dynamic query builder, save/load filters, contact segmentation |
| 7 | **Inbox / Messaging** | Internal conversation threads, message CRUD (foundation for future omnichannel) |
| 8 | **Settings & Team Management** | Team member CRUD, role assignment, notification preferences, integrations CRUD |
| 9 | **Dashboard Analytics** | KPI aggregation endpoints per role, charts data APIs |
| 10 | **Caching Layer** | Redis for sessions, hot data caching, cache invalidation strategy |
| 11 | **AI Chatbot** | Mistral/OpenRouter integration for lead qualification chatbot |

#### ❌ DEFERRED (Post-MVP)

| Feature | Why Deferred |
|---------|-------------|
| Voice AI / Parallel Dialer (Twilio WebRTC) | Requires telephony infrastructure, SIP trunking |
| WhatsApp Cloud API | Requires Meta Business verification (takes weeks) |
| eSignature Engine | Complex PDF manipulation, legal compliance |
| Commission Accounting | Complex financial calculations, needs careful auditing |
| Predictive Seller Radar | Requires external property/tax data APIs |
| DNC Registry Integration | Requires paid federal/state API subscriptions |
| Mobile App (iOS/Android) | Separate project entirely |
| Elasticsearch | MongoDB text indexes sufficient for MVP scale |
| CSV Importer | Nice-to-have, not critical path |

---

## Role Definitions — NEEDS YOUR DECISION

### Proposed Permissions Matrix

| Feature | Super Admin | Admin | Agent | Lead/Customer |
|---------|:-----------:|:-----:|:-----:|:-------------:|
| **View all contacts** | ✅ | ✅ | Own only | Own profile only |
| **Create/edit contacts** | ✅ | ✅ | ✅ | ❌ |
| **Delete contacts** | ✅ | ✅ | ❌ | ❌ |
| **View all deals** | ✅ | ✅ | Own only | Own deals only |
| **Create/edit deals** | ✅ | ✅ | ✅ | ❌ |
| **Delete deals** | ✅ | ✅ | ❌ | ❌ |
| **Manage team members** | ✅ | ✅ | ❌ | ❌ |
| **Invite/remove users** | ✅ | ✅ | ❌ | ❌ |
| **Change user roles** | ✅ | ❌ | ❌ | ❌ |
| **System settings** | ✅ | ✅ (partial) | ❌ | ❌ |
| **Lead routing rules** | ✅ | ✅ | ❌ | ❌ |
| **View dashboards** | Full analytics | Team analytics | Personal stats | Property status |
| **Smart lists** | ✅ | ✅ | Own only | ❌ |
| **Data health** | ✅ | ✅ | ❌ | ❌ |
| **AI ISA config** | ✅ | ✅ | ❌ | ❌ |
| **Inbox** | All convos | All convos | Own convos | Own convos |
| **API keys / webhooks** | ✅ | ❌ | ❌ | ❌ |
| **Audit logs** | ✅ | ✅ (read) | ❌ | ❌ |

---

## Open Questions — NEED YOUR ANSWERS

### 🔴 Critical (Blocks Sprint Planning)

**Q1. Roles Confirmation**
> Current frontend has: `super_admin`, `brokerage_owner`, `team_lead`, `agent`
> You said you want: `super_admin`, `admin`, `agent`, `lead/customer`
> 
> Should we **replace** the current 4 roles entirely? Is `admin` the same as `brokerage_owner`? Is `lead/customer` a logged-in user who can see their deal status (like a client portal)?

**Q2. Multi-Tenancy**
> Is this a **single-brokerage** system (one company uses it) or **multi-tenant** (multiple brokerages on the same backend, data isolated)?
> This fundamentally changes the database schema design.

**Q3. Lead/Customer Portal**
> When you say "lead/customer" role — do they:
> - (a) Have a separate public-facing portal to check their deal progress, upcoming showings, documents?
> - (b) Just exist as a contact record that agents manage (no login)?
> - (c) Have a minimal login where they can view their own deal status and message their agent?

**Q4. Database Choice**
> You said MERN stack. Confirming: **MongoDB** (with Mongoose ODM)?
> Your blueprint mentions PostgreSQL. Which do you want? MongoDB fits MERN, but PostgreSQL is better for relational data (deals → contacts → agents).

**Q5. Deployment Target**
> Where does this go to production on Day 8?
> - (a) VPS (DigitalOcean / AWS EC2 / Linode)
> - (b) PaaS (Railway / Render / Fly.io)
> - (c) Serverless (Vercel + separate API)
> - (d) Docker containers
> This affects how we structure the project and configure environment.

### 🟡 Important (Affects Architecture)

**Q6. AI Chatbot Scope**
> You mentioned Mistral / OpenRouter free tiers. What should the chatbot do exactly?
> - (a) Lead qualification bot: asks visitors budget/timeline/location questions
> - (b) Internal agent assistant: helps agents draft responses, summarize calls
> - (c) Both
> - (d) Something else?

**Q7. Real-time Features**
> Do you need WebSocket/SSE for:
> - Live notifications (new lead assigned)?
> - Real-time inbox message updates?
> - Live dashboard metric updates?
> Or is polling (every 30s) acceptable for MVP?

**Q8. File Uploads**
> Do contacts/deals need file attachments (property photos, documents)?
> If yes: local storage or cloud (S3/Cloudinary)?

**Q9. Email Notifications**
> Should the system send actual emails (password reset, new lead notification)?
> If yes: which service? (SendGrid, Resend, Mailgun, or SMTP?)

### 🟢 Nice to Have (Can Default If No Answer)

**Q10. Audit Logging**
> Should we log every data mutation (who changed what, when) for compliance?
> This adds a separate `audit_logs` collection but is important for real estate.

**Q11. Data Export**
> Do agents need to export contacts/deals as CSV/Excel from the UI?

**Q12. Rate Limiting**
> Do you want API rate limiting (e.g., 100 requests/min per user) to prevent abuse?

---

## Proposed Backend Architecture (Feature-Based)

```
server/
├── src/
│   ├── config/          # env, db connection, redis, cors
│   ├── middleware/       # auth, rbac, errorHandler, rateLimiter, cache
│   ├── features/
│   │   ├── auth/        # controller, service, routes, validators, types
│   │   ├── users/       # controller, service, routes, validators, types  
│   │   ├── contacts/    # controller, service, routes, validators, types
│   │   ├── leads/       # controller, service, routes, validators, types
│   │   ├── pipeline/    # controller, service, routes, validators, types
│   │   ├── deals/       # controller, service, routes, validators, types
│   │   ├── inbox/       # controller, service, routes, validators, types
│   │   ├── data-health/ # controller, service, routes, validators, types
│   │   ├── smart-lists/ # controller, service, routes, validators, types
│   │   ├── settings/    # controller, service, routes, validators, types
│   │   ├── dashboard/   # controller, service, routes (aggregation endpoints)
│   │   ├── ai-chatbot/  # controller, service, routes (Mistral/OpenRouter)
│   │   └── notifications/ # controller, service, routes, types
│   ├── models/          # Mongoose schemas (or shared if needed)
│   ├── utils/           # helpers, logger, cache helpers
│   └── app.ts           # Express app setup
├── tests/               # Jest/Vitest test files per feature
├── package.json
├── tsconfig.json
└── .env.example
```

**Each feature folder follows the same pattern:**
```
feature/
├── feature.controller.ts   # Route handlers (thin, delegates to service)
├── feature.service.ts      # Business logic (all DB/cache operations)
├── feature.routes.ts       # Express router with middleware
├── feature.validators.ts   # Zod/Joi schemas for request validation
└── feature.types.ts        # Feature-specific TypeScript interfaces
```

---

## Proposed Cache Strategy

| Data Type | Cache Layer | TTL | Invalidation |
|-----------|------------|-----|-------------|
| **Session/Auth** | Redis (httpOnly cookie → session ID → user data) | 24h (or "remember me" = 30d) | On logout / password change |
| **Dashboard KPIs** | Redis | 5 min | On contact/deal mutation |
| **Contact list (paginated)** | Redis hash per query | 2 min | On any contact CRUD |
| **Pipeline stages** | Redis | 10 min | On stage CRUD |
| **Deal counts per stage** | Redis | 2 min | On deal stage change |
| **Data health score** | Redis | 15 min | On health scan completion |
| **Smart list results** | Redis | 1 min | On filter change or contact mutation |
| **User profile/permissions** | Redis | 30 min | On profile/role update |
| **Lead routing rules** | Redis | 10 min | On rule CRUD |
| **Notification preferences** | Redis | 30 min | On preference update |

**Strategy: Cache-Aside (Lazy Loading)**
1. Check Redis first
2. On miss → query MongoDB → store in Redis with TTL
3. On write → invalidate relevant cache keys
4. Use cache key namespacing: `pp:{tenant}:{feature}:{identifier}`

