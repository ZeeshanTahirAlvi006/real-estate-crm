# PropPulse OS — Full Implementation Plan

## Decisions Locked In

| # | Decision | Answer |
|---|----------|--------|
| 1 | **Roles** | Keep existing 4: `super_admin`, `brokerage_owner`, `team_lead`, `agent` + Add 5th: `lead` (customer portal) |
| 2 | **Multi-tenancy** | Yes — data isolation per brokerage (`brokerageId` on every document) |
| 3 | **Lead/Customer portal** | Leads log in → see assigned agent, pipeline status, updates |
| 4 | **Database** | MongoDB (MERN stack) with Mongoose ODM |
| 5 | **Deployment** | Frontend → Vercel, Backend → Render |
| 6 | **AI Chatbot** | Both: lead qualifier bot + internal agent assistant |
| 7 | **Real-time** | WebSockets via Socket.io |
| 8 | **File uploads** | Cloud (S3/Cloudinary) + local disk fallback for demo |
| 9 | **Email sending** | Interface built, service configurable later |
| 10 | **Audit logging** | Yes — every data mutation logged |
| 11 | **Data export** | CSV + PDF |
| 12 | **Rate limiting** | Strict — very low rates to protect server |
| 13 | **Feature Kill-Switch** | Super admin only toggles per feature, audit logged, real-time broadcast, neutral "down for maintenance" message |
| 14 | **API Leak & Cost Protection** | Hard daily spend quotas, automated circuit breakers, zero client secrets, AES-256 encrypted at rest, instant 1-click key rotation |
| 15 | **Strict Query Sanitization** | Dual-layer (Frontend DOMPurify/regex escaping + Backend mongo-sanitize, XSS cleansing, ReDoS escaping, strict Zod whitelisting) |

---

## Role-Based Access Matrix (5 Roles)

| Feature | Super Admin | Brokerage Owner | Team Lead | Agent | Lead (Customer) |
|---------|:-----------:|:---------------:|:---------:|:-----:|:---------------:|
| **Cross-brokerage access** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **View all contacts** | ✅ all brokerages | ✅ own brokerage | ✅ own team | Own assigned only | Own profile |
| **Create/edit contacts** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Delete contacts** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **View all deals** | ✅ all brokerages | ✅ own brokerage | ✅ own team | Own deals | Own deal status |
| **Create/edit deals** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Delete deals** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Manage brokerage** | ✅ create/edit/delete | ✅ own only | ❌ | ❌ | ❌ |
| **Manage team members** | ✅ | ✅ | ✅ (own team) | ❌ | ❌ |
| **Invite/remove users** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Change user roles** | ✅ any role | ✅ (not super_admin) | ❌ | ❌ | ❌ |
| **System settings** | ✅ global | ✅ brokerage-level | ❌ | ❌ | ❌ |
| **Lead routing rules** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Dashboard** | Global analytics | Brokerage analytics | Team stats | Personal stats | Deal status view |
| **Smart lists** | ✅ | ✅ | ✅ | Own saved only | ❌ |
| **Data health** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **AI ISA config** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Inbox** | All convos | Brokerage convos | Team convos | Own convos | Messages from agent |
| **API keys / webhooks** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Audit logs** | ✅ all | ✅ own brokerage | ✅ read own team | ❌ | ❌ |
| **Dialer** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Transaction mgmt** | ✅ | ✅ | ✅ | Own transactions | View own transaction |
| **Export (CSV/PDF)** | ✅ | ✅ | ✅ | Own data | ❌ |
| **Rate limit tier** | 200 req/min | 120 req/min | 80 req/min | 60 req/min | 20 req/min |

---

## Multi-Tenant Data Architecture

```
Every MongoDB document includes:
┌─────────────────────────────────────┐
│  brokerageId: ObjectId (required)    │  ← Tenant isolation key
│  createdBy:   ObjectId (required)    │  ← Audit: who created
│  updatedBy:   ObjectId              │  ← Audit: who last modified
│  createdAt:   Date                  │  ← Auto-timestamp
│  updatedAt:   Date                  │  ← Auto-timestamp
└─────────────────────────────────────┘

Query Scoping Middleware:
- super_admin    → no brokerageId filter (sees all)
- brokerage_owner → auto-inject brokerageId from user's brokerage
- team_lead      → brokerageId + teamId filter
- agent          → brokerageId + assignedAgentId = userId
- lead           → brokerageId + contactId = userId's linked contact
```

---

## Security Architecture

### Multi-Layer Authentication Pipeline

Every request passes through **multiple verification layers** before any database query executes. This is a defense-in-depth strategy — compromising one layer does not grant access.

```
┌─────────────────────────────────────────────────────────────────────────┐
│  LAYER 1: FRONTEND GUARD & SANITIZATION (React)                         │
│  - ProtectedRoute component verifies auth state and user role.          │
│  - Frontend Sanitization: Strips control chars, escapes regex special   │
│    characters before URL/filter dispatch, DOMPurifies rich text.        │
│  - Feature Flag check: Inactive features show neutral maintenance UI.   │
└──────────────────────────────────┬──────────────────────────────────────┘
                                   │ Request leaves browser
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  LAYER 2: RATE LIMITER & SPEND GUARD (middleware/rateLimiter.ts)         │
│  - Redis sliding window: rejects before any auth / DB processing.       │
│  - Unauthenticated: 10 req/min. Per-role limits (20–200 req/min).       │
│  - Global/Tenant Daily Quota: blocks abuse before vendor bills run up.  │
└──────────────────────────────────┬──────────────────────────────────────┘
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  LAYER 3: REQUEST SANITIZATION (middleware/sanitize.ts)                 │
│  - express-mongo-sanitize: Strips `$` and `.` to block NoSQL injection. │
│  - XSS Cleanse: Escapes malicious HTML/script payloads in body/query.   │
│  - ReDoS Escaper: Safely escapes all search terms for MongoDB regex.    │
└──────────────────────────────────┬──────────────────────────────────────┘
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  LAYER 4: FEATURE KILL-SWITCH CHECK (middleware/featureFlag.ts)         │
│  - Redis check (0ms): Is this feature active or disabled by Super Admin?│
│  - If disabled: returns 503 "This feature is undergoing maintenance."   │
└──────────────────────────────────┬──────────────────────────────────────┘
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  LAYER 5: COOKIE & SESSION AUTH (middleware/authenticate.ts)            │
│  - Extracts httpOnly secure cookie; verifies JWT signature + expiry.    │
│  - Checks Redis for revoked sessions; validates active user in DB.      │
│  - Attaches verified User to req.user.                                  │
└──────────────────────────────────┬──────────────────────────────────────┘
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  LAYER 6: ROLE-BASED AUTHORIZATION (middleware/authorize.ts)            │
│  - Verifies req.user.role meets endpoint permissions.                   │
│  - 403 Forbidden on mismatch.                                           │
└──────────────────────────────────┬──────────────────────────────────────┘
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  LAYER 7: TENANT DATA ISOLATION (middleware/tenantScope.ts)             │
│  - Injects `brokerageId` scoping into query / filter criteria.          │
│  - Enforces agent ownership checks for individual record access.        │
└──────────────────────────────────┬──────────────────────────────────────┘
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  LAYER 8: STRICT SCHEMA VALIDATION (middleware/validate.ts)             │
│  - Zod validation with `.strip()` to reject unwhitelisted fields.       │
│  - Strict type coercion and string length boundaries.                   │
└──────────────────────────────────┬──────────────────────────────────────┘
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  LAYER 9: SERVICE & CIRCUIT BREAKER (feature.service.ts)                │
│  - Business logic checks specific record permissions & audit logs.      │
│  - Circuit breaker wraps external API calls (Twilio, Mistral, etc.).    │
│  - ONLY NOW does MongoDB or External Vendor API execute.                │
└─────────────────────────────────────────────────────────────────────────┘
```

**Route middleware chain example:**
```typescript
// Every protected feature route stacks these middleware in order:
router.get('/contacts',
  rateLimiter,                 // Layer 2: rate limit + quota check
  sanitizeRequest,             // Layer 3: NoSQL injection + XSS + ReDoS sanitize
  requireFeature('contacts'),  // Layer 4: Super Admin kill-switch check
  authenticate,                // Layer 5: cookie → JWT → Redis session → user
  authorize('super_admin', 'brokerage_owner', 'team_lead', 'agent'), // Layer 6: RBAC
  tenantScope,                 // Layer 7: auto-inject brokerageId & ownership
  validate(getContactsSchema), // Layer 8: strict Zod schema validation
  contactController.getAll     // Layer 9: service logic → MongoDB
)
```

### Opaque Error Messages on Sensitive Routes

To prevent **user enumeration attacks**, all auth-related and sensitive routes return **identical generic messages** for both success and failure scenarios:

| Route | Scenario | Response Message |
|-------|----------|------------------|
| `POST /api/auth/login` | Valid credentials | `{ success: true, message: "Authentication successful" }` |
| `POST /api/auth/login` | Wrong password | `{ success: false, message: "Invalid credentials" }` |
| `POST /api/auth/login` | Email doesn't exist | `{ success: false, message: "Invalid credentials" }` ← **same message** |
| `POST /api/auth/login` | Account deactivated | `{ success: false, message: "Invalid credentials" }` ← **same message** |
| `POST /api/auth/forgot-password` | Email exists | `{ success: true, message: "If an account exists, a reset link has been sent" }` |
| `POST /api/auth/forgot-password` | Email doesn't exist | `{ success: true, message: "If an account exists, a reset link has been sent" }` ← **same message, same 200 status** |
| `POST /api/auth/reset-password` | Valid token | `{ success: true, message: "Password has been reset" }` |
| `POST /api/auth/reset-password` | Invalid/expired token | `{ success: false, message: "Unable to reset password" }` |
| `POST /api/auth/register` | Email already taken | `{ success: false, message: "Unable to create account" }` ← **no "email already exists"** |
| `GET /api/auth/me` | Invalid session | 401 with no user-identifying info |

> [!CAUTION]
> **NEVER return messages like:**
> - "No user found with this email" (confirms email doesn't exist)
> - "Email already registered" (confirms email exists)
> - "Account is disabled" (confirms account exists)
> - "Password is incorrect" (confirms email exists, only password wrong)
>
> These allow attackers to enumerate valid email addresses.

**Implementation approach:**
- Auth service catches all specific errors internally and logs them
- Controller always returns the same generic message to the client
- Response timing is constant (add artificial delay to prevent timing attacks)
- Failed login attempts are tracked per IP + email combo (lockout after 5 failures)

---

### Super Admin Feature Kill-Switch System

Every core feature has an autonomous **kill switch** accessible exclusively to `super_admin`:

| Feature Flag Key | Controlled Modules / Endpoints | Fallback User Experience |
|------------------|--------------------------------|--------------------------|
| `feature:ai_chatbot` | Lead qualifier bot, agent assistant | Chat widget shows "AI Assistant undergoing maintenance" |
| `feature:dialer` | WebRTC dialer, parallel dialer, call logs | Dialer page shows "Telephony services temporarily offline" |
| `feature:ai_isa` | Autonomous outreach, reactivation campaigns | Campaigns paused; manual outreach mode only |
| `feature:lead_ingestion`| Webhook parsers, lead capture widget | Webhooks return 202 Queued; manual entry active |
| `feature:data_health` | Duplicate scan, carrier lookup, MX check | Data health tab displays "Maintenance in progress" |
| `feature:esign` | PDF signing workflows, signature links | "eSignature service temporarily unavailable" |
| `feature:seller_radar` | CMA builder, equity scanner | CMA tab shows "Valuation services offline" |
| `feature:export` | CSV / PDF export downloads | Export button shows tooltip "Exports temporarily paused" |

**Kill-Switch Workflow:**
1. **Toggle Action**: Super Admin toggles switch in the Super Admin Control Panel.
2. **Instant Cache Update**: Redis key `feature_flags:{featureName}` updated in <1ms.
3. **Database Sync**: Stored in `FeatureFlag` MongoDB collection for persistence.
4. **Audit Logging**: Immutable audit entry recorded: `action: 'FEATURE_TOGGLE'`, `feature: 'dialer'`, `status: false`, `adminId: user._id`, `ipAddress: ...`.
5. **Real-time Broadcast**: Socket.io broadcasts `system:feature_toggle` event with `{ feature: 'dialer', isEnabled: false }`.
6. **Frontend State Transition**: App immediately locks the feature tab/page, replaces interactive controls with neutral banner: *"This feature is currently undergoing scheduled maintenance. Please check back shortly."*
7. **Backend Hard Rejection**: `requireFeature(featureName)` middleware immediately returns `503 Service Unavailable` with `{ success: false, message: "This feature is currently undergoing scheduled maintenance." }` so zero downstream database or API load occurs.

---

### API Leak, Abuse & Cost Surge Protection Shield

To guarantee **zero billing explosions** from leaked, compromised, or abused API credentials (Twilio, Mistral, OpenRouter, Meta WhatsApp, SendGrid, ATTOM):

1. **Zero Client Secrets**:
   - Zero vendor API keys, secret tokens, or telephony credentials ever exist on the frontend.
   - All third-party calls proxy strictly through isolated backend services.

2. **Hard Spend & Token Quota Limits (Redis Counter)**:
   - Every external service invocation checks a daily usage & spend budget in Redis:
     - Global daily AI token cap (e.g., 500,000 tokens/day max).
     - Per-brokerage daily AI call cap (e.g., 200 calls/day max).
     - Global daily SMS/Telephony cap (e.g., 1,000 requests/day max).
   - If quota is reached, requests are rejected with `429 Quota Exceeded` before hitting the third-party API.

3. **Automated Circuit Breaker Pattern**:
   - Each external vendor integration is wrapped with a circuit breaker (`Closed` → `Open` → `Half-Open`):
     - If error rate > 50% or request spike > 300 req/min within 60 seconds:
     - Circuit trips to `OPEN` state for 5 minutes.
     - Outbound traffic to the vendor halts immediately, preventing rapid retry loops and billing runaway.
     - Urgent alert dispatched to Super Admin.

4. **AES-256-GCM Encryption at Rest**:
   - All third-party API credentials stored in MongoDB (e.g. `Integration` and `SystemConfig` models) are encrypted at rest using AES-256-GCM with authenticated tags and IV rotation.

5. **Instant One-Click Key Rotation & Revocation**:
   - Super Admin dashboard provides a 1-click **Emergency Revoke** button for any integration key, immediately purging Redis cached tokens and forcing fallback to mock/safe mode.

---

### Strict Dual-Layer Sanitization Pipeline

**Principle**: *Nothing enters the system unsanitized at any cost.*

#### 1. Frontend Sanitization (First Line of Defense)
- **Input Trimming & Control Stripping**: Auto-trims leading/trailing whitespace and strips invisible control characters from all form fields.
- **Search & Query Escaping**: Search inputs escape all RegExp special characters (`[`, `]`, `\`, `^`, `$`, `.`, `|`, `?`, `*`, `+`, `(`, `)`) before generating query parameters to prevent query injection and malformed requests.
- **DOMPurify HTML Sanitizer**: All dynamic or user-generated text rendered in chat, notes, or activity logs is sanitized with DOMPurify to neutralize script injection.

#### 2. Backend Sanitization (Zero-Trust Enforcement)
- **NoSQL Injection Shield (`express-mongo-sanitize`)**:
  - Global middleware intercepts every incoming `req.body`, `req.query`, and `req.params`.
  - Recursively removes any keys containing `$` or `.` to completely neutralize MongoDB operator injection (e.g., `{ $gt: "" }`).
- **XSS Payload Cleansing (`middleware/sanitize.ts`)**:
  - Encodes or strips HTML tags and JavaScript URI schemes (`javascript:`, `data:`) from all string payloads.
- **ReDoS Prevention (Regex Escaping)**:
  - All MongoDB `$regex` search filters pass through `escapeStringRegexp()` utility before query execution.
  - Limits search query string length to max 100 characters.
- **Strict Zod Whitelisting**:
  - Every route schema uses `.strict()` or `.strip()` to discard unexpected or unvalidated properties.
  - Numbers, booleans, and dates must match strict schema definitions.
- **Parameterized Mongoose Queries Only**:
  - Direct object passing from `req.body` into `.find()` / `.update()` is strictly prohibited. Queries are built explicitly field-by-field.

---

## Backend Folder Structure

```
server/
├── src/
│   ├── config/
│   │   ├── db.ts                    # MongoDB connection with retry logic
│   │   ├── redis.ts                 # Redis client setup
│   │   ├── env.ts                   # Environment variable validation (Zod)
│   │   ├── cors.ts                  # CORS config (Vercel origin)
│   │   ├── socket.ts                # Socket.io server setup
│   │   └── storage.ts               # File storage config (S3 / local switch)
│   │
│   ├── middleware/
│   │   ├── authenticate.ts          # JWT cookie verification
│   │   ├── authorize.ts             # Role-based permission checker
│   │   ├── tenantScope.ts           # Auto-inject brokerageId into queries
│   │   ├── rateLimiter.ts           # Per-role rate limiting (Redis-backed)
│   │   ├── sanitize.ts              # NoSQL injection, XSS, & ReDoS sanitizer
│   │   ├── featureFlag.ts           # Super Admin kill-switch checker (Redis cached)
│   │   ├── circuitBreaker.ts        # External vendor cost/failure circuit breaker
│   │   ├── validate.ts              # Zod schema validation wrapper
│   │   ├── errorHandler.ts          # Global error handler
│   │   ├── auditLogger.ts           # Mutation audit logging middleware
│   │   ├── cache.ts                 # Cache-aside middleware (check Redis first)
│   │   └── upload.ts                # Multer config for file uploads
│   │
│   ├── features/
│   │   ├── auth/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.routes.ts
│   │   │   ├── auth.validators.ts
│   │   │   └── auth.types.ts
│   │   │
│   │   ├── feature-flags/
│   │   │   ├── featureFlag.controller.ts
│   │   │   ├── featureFlag.service.ts
│   │   │   ├── featureFlag.routes.ts
│   │   │   ├── featureFlag.validators.ts
│   │   │   └── featureFlag.types.ts
│   │   │
│   │   ├── users/
│   │   │   ├── user.controller.ts
│   │   │   ├── user.service.ts
│   │   │   ├── user.routes.ts
│   │   │   ├── user.validators.ts
│   │   │   └── user.types.ts
│   │   │
│   │   ├── brokerages/
│   │   │   ├── brokerage.controller.ts
│   │   │   ├── brokerage.service.ts
│   │   │   ├── brokerage.routes.ts
│   │   │   ├── brokerage.validators.ts
│   │   │   └── brokerage.types.ts
│   │   │
│   │   ├── contacts/
│   │   │   ├── contact.controller.ts
│   │   │   ├── contact.service.ts
│   │   │   ├── contact.routes.ts
│   │   │   ├── contact.validators.ts
│   │   │   └── contact.types.ts
│   │   │
│   │   ├── leads/
│   │   │   ├── lead.controller.ts
│   │   │   ├── lead.service.ts
│   │   │   ├── lead.routes.ts
│   │   │   ├── lead.validators.ts
│   │   │   └── lead.types.ts
│   │   │
│   │   ├── pipeline/
│   │   │   ├── pipeline.controller.ts
│   │   │   ├── pipeline.service.ts
│   │   │   ├── pipeline.routes.ts
│   │   │   ├── pipeline.validators.ts
│   │   │   └── pipeline.types.ts
│   │   │
│   │   ├── deals/
│   │   │   ├── deal.controller.ts
│   │   │   ├── deal.service.ts
│   │   │   ├── deal.routes.ts
│   │   │   ├── deal.validators.ts
│   │   │   └── deal.types.ts
│   │   │
│   │   ├── inbox/
│   │   │   ├── inbox.controller.ts
│   │   │   ├── inbox.service.ts
│   │   │   ├── inbox.routes.ts
│   │   │   ├── inbox.validators.ts
│   │   │   ├── inbox.socket.ts       # WebSocket event handlers for real-time
│   │   │   └── inbox.types.ts
│   │   │
│   │   ├── data-health/
│   │   │   ├── dataHealth.controller.ts
│   │   │   ├── dataHealth.service.ts
│   │   │   ├── dataHealth.routes.ts
│   │   │   ├── dataHealth.validators.ts
│   │   │   ├── dataHealth.cron.ts     # Background cron jobs
│   │   │   └── dataHealth.types.ts
│   │   │
│   │   ├── smart-lists/
│   │   │   ├── smartList.controller.ts
│   │   │   ├── smartList.service.ts
│   │   │   ├── smartList.routes.ts
│   │   │   ├── smartList.validators.ts
│   │   │   └── smartList.types.ts
│   │   │
│   │   ├── dashboard/
│   │   │   ├── dashboard.controller.ts
│   │   │   ├── dashboard.service.ts
│   │   │   ├── dashboard.routes.ts
│   │   │   └── dashboard.types.ts
│   │   │
│   │   ├── ai-chatbot/
│   │   │   ├── chatbot.controller.ts
│   │   │   ├── chatbot.service.ts
│   │   │   ├── chatbot.routes.ts
│   │   │   ├── chatbot.validators.ts
│   │   │   ├── chatbot.prompts.ts     # System prompts for Mistral/OpenRouter
│   │   │   └── chatbot.types.ts
│   │   │
│   │   ├── ai-isa/
│   │   │   ├── isa.controller.ts
│   │   │   ├── isa.service.ts
│   │   │   ├── isa.routes.ts
│   │   │   ├── isa.validators.ts
│   │   │   ├── isa.scheduler.ts       # Reactivation campaign scheduler
│   │   │   └── isa.types.ts
│   │   │
│   │   ├── communication/
│   │   │   ├── comm.controller.ts
│   │   │   ├── comm.service.ts
│   │   │   ├── comm.routes.ts
│   │   │   ├── comm.validators.ts
│   │   │   ├── providers/
│   │   │   │   ├── email.provider.ts   # SendGrid/SMTP abstraction
│   │   │   │   ├── sms.provider.ts     # Twilio SMS abstraction
│   │   │   │   ├── whatsapp.provider.ts # WhatsApp Cloud API abstraction
│   │   │   │   └── voice.provider.ts   # Twilio Voice abstraction
│   │   │   └── comm.types.ts
│   │   │
│   │   ├── dialer/
│   │   │   ├── dialer.controller.ts
│   │   │   ├── dialer.service.ts
│   │   │   ├── dialer.routes.ts
│   │   │   ├── dialer.validators.ts
│   │   │   ├── dialer.socket.ts       # WebSocket for real-time call state
│   │   │   └── dialer.types.ts
│   │   │
│   │   ├── transactions/
│   │   │   ├── transaction.controller.ts
│   │   │   ├── transaction.service.ts
│   │   │   ├── transaction.routes.ts
│   │   │   ├── transaction.validators.ts
│   │   │   └── transaction.types.ts
│   │   │
│   │   ├── commissions/
│   │   │   ├── commission.controller.ts
│   │   │   ├── commission.service.ts
│   │   │   ├── commission.routes.ts
│   │   │   ├── commission.validators.ts
│   │   │   └── commission.types.ts
│   │   │
│   │   ├── esign/
│   │   │   ├── esign.controller.ts
│   │   │   ├── esign.service.ts
│   │   │   ├── esign.routes.ts
│   │   │   ├── esign.validators.ts
│   │   │   └── esign.types.ts
│   │   │
│   │   ├── seller-radar/
│   │   │   ├── radar.controller.ts
│   │   │   ├── radar.service.ts
│   │   │   ├── radar.routes.ts
│   │   │   ├── radar.validators.ts
│   │   │   └── radar.types.ts
│   │   │
│   │   ├── compliance/
│   │   │   ├── compliance.controller.ts
│   │   │   ├── compliance.service.ts
│   │   │   ├── compliance.routes.ts
│   │   │   ├── compliance.validators.ts
│   │   │   ├── nlp/
│   │   │   │   └── fairHousing.ts      # Fair Housing NLP scanner
│   │   │   └── compliance.types.ts
│   │   │
│   │   ├── notifications/
│   │   │   ├── notification.controller.ts
│   │   │   ├── notification.service.ts
│   │   │   ├── notification.routes.ts
│   │   │   ├── notification.socket.ts  # Real-time push via Socket.io
│   │   │   └── notification.types.ts
│   │   │
│   │   ├── settings/
│   │   │   ├── settings.controller.ts
│   │   │   ├── settings.service.ts
│   │   │   ├── settings.routes.ts
│   │   │   ├── settings.validators.ts
│   │   │   └── settings.types.ts
│   │   │
│   │   ├── export/
│   │   │   ├── export.controller.ts
│   │   │   ├── export.service.ts       # CSV + PDF generation
│   │   │   ├── export.routes.ts
│   │   │   └── export.types.ts
│   │   │
│   │   ├── integrations/
│   │   │   ├── integration.controller.ts
│   │   │   ├── integration.service.ts
│   │   │   ├── integration.routes.ts
│   │   │   └── integration.types.ts
│   │   │
│   │   └── audit/
│   │       ├── audit.controller.ts
│   │       ├── audit.service.ts
│   │       ├── audit.routes.ts
│   │       └── audit.types.ts
│   │
│   ├── models/
│   │   ├── User.ts
│   │   ├── Brokerage.ts
│   │   ├── FeatureFlag.ts            # Super Admin feature toggle state
│   │   ├── SystemConfig.ts           # Encrypted API keys & global spend limits
│   │   ├── Contact.ts
│   │   ├── LeadSource.ts
│   │   ├── RoutingRule.ts
│   │   ├── Pipeline.ts
│   │   ├── Deal.ts
│   │   ├── Conversation.ts
│   │   ├── Message.ts
│   │   ├── SmartList.ts
│   │   ├── DataHealthScan.ts
│   │   ├── DuplicatePair.ts
│   │   ├── Transaction.ts
│   │   ├── Commission.ts
│   │   ├── Document.ts               # For eSign documents
│   │   ├── Property.ts               # For Seller Radar
│   │   ├── Campaign.ts               # Reactivation campaigns
│   │   ├── CallLog.ts
│   │   ├── Notification.ts
│   │   ├── AuditLog.ts
│   │   ├── ApiKey.ts
│   │   ├── Webhook.ts
│   │   ├── Integration.ts
│   │   └── Settings.ts
│   │
│   ├── utils/
│   │   ├── logger.ts                  # Winston/Pino structured logger
│   │   ├── cacheHelper.ts            # Redis get/set/invalidate helpers
│   │   ├── sanitizer.ts              # String & RegExp sanitization helpers
│   │   ├── cryptoHelper.ts           # AES-256-GCM encryption for stored secrets
│   │   ├── circuitBreaker.ts         # Circuit breaker for external APIs
│   │   ├── pagination.ts             # Standard pagination helper
│   │   ├── fuzzyMatch.ts             # Fuzzy string matching for dedup
│   │   ├── tokenHelper.ts            # JWT sign/verify helpers
│   │   ├── cookieHelper.ts           # Cookie set/clear helpers
│   │   ├── exportHelper.ts           # CSV/PDF generation utilities
│   │   ├── fileUpload.ts             # S3 / local storage abstraction
│   │   ├── apiResponse.ts            # Standardized API response format
│   │   └── constants.ts              # App-wide constants
│   │
│   ├── jobs/
│   │   ├── scheduler.ts              # Bull/Agenda job scheduler setup
│   │   ├── dataHealthScan.job.ts     # Periodic data quality scan
│   │   ├── reactivation.job.ts       # Dormant lead reactivation
│   │   ├── cacheWarmup.job.ts        # Dashboard cache pre-warming
│   │   └── cleanup.job.ts            # Expired session/token cleanup
│   │
│   └── app.ts                         # Express app + Socket.io bootstrap
│
├── tests/
│   ├── unit/                          # Per-feature unit tests
│   ├── integration/                   # API endpoint integration tests
│   └── helpers/                       # Test utilities, factories
│
├── scripts/
│   ├── seed.ts                        # Database seeding for dev/demo
│   └── migrate.ts                     # Data migration scripts
│
├── .env.example
├── Dockerfile
├── docker-compose.yml                 # MongoDB + Redis + App for local dev
├── package.json
├── tsconfig.json
└── render.yaml                        # Render deployment config
```

---

## Sprint Breakdown — 22 Daily Sprints

---

### Sprint 1 — Project Scaffolding + Auth Foundation

**Goal:** Backend project initialized, MongoDB + Redis connected, auth system with httpOnly cookies working.

#### Files Created:
```
server/package.json
server/tsconfig.json
server/.env.example
server/docker-compose.yml
server/src/app.ts
server/src/config/db.ts
server/src/config/redis.ts
server/src/config/env.ts
server/src/config/cors.ts
server/src/models/User.ts
server/src/models/Brokerage.ts
server/src/middleware/errorHandler.ts
server/src/middleware/sanitize.ts
server/src/middleware/authenticate.ts
server/src/middleware/validate.ts
server/src/utils/logger.ts
server/src/utils/sanitizer.ts
server/src/utils/cryptoHelper.ts
server/src/utils/tokenHelper.ts
server/src/utils/cookieHelper.ts
server/src/utils/apiResponse.ts
server/src/utils/constants.ts
server/src/features/auth/auth.controller.ts
server/src/features/auth/auth.service.ts
server/src/features/auth/auth.routes.ts
server/src/features/auth/auth.validators.ts
server/src/features/auth/auth.types.ts
```

#### Key Deliverables:
- Express + TypeScript project with strict tsconfig
- MongoDB connection with Mongoose (retry logic, connection pooling)
- Redis client with graceful fallback
- `User` model: email, password (bcrypt 12), role, brokerageId, profile fields
- `Brokerage` model: name, plan, settings, createdBy
- Global **Sanitization Middleware** (`middleware/sanitize.ts` + `express-mongo-sanitize`):
  - Strips `$` and `.` from all inputs (NoSQL injection block)
  - Cleanses XSS payloads in body & query parameters
  - RegExp escape utility for search fields
- **Crypto Helper** (`utils/cryptoHelper.ts`): AES-256-GCM encryption/decryption utility for secrets
- Auth endpoints:
  - `POST /api/auth/register` — creates brokerage + first user (brokerage_owner)
  - `POST /api/auth/login` — validates credentials, sets httpOnly cookie
  - `POST /api/auth/logout` — clears cookie, invalidates session in Redis
  - `POST /api/auth/refresh` — refresh token rotation
  - `POST /api/auth/forgot-password` — generates reset token (email send stubbed)
  - `POST /api/auth/reset-password` — validates token, updates password
  - `GET /api/auth/me` — returns current user from cookie
- JWT access token (15 min) + refresh token (30 days) stored in httpOnly secure cookies
- Zod validation on all request bodies (`.strict()` whitelisting)
- Standardized API response format: `{ success, data, message, errors }`
- Winston logger with request ID tracking
- **Opaque error messages** on all auth routes (see Security Architecture)
- **Constant response timing** — artificial delay on login/register to prevent timing attacks
- **Login attempt tracking** — Redis counter per IP+email, lockout after 5 failed attempts (15 min cooldown)

#### Acceptance Criteria:
- [ ] `POST /api/auth/register` creates brokerage + user, sets cookies
- [ ] `POST /api/auth/login` returns user data, sets httpOnly cookies
- [ ] `GET /api/auth/me` returns user from valid cookie, 401 if invalid
- [ ] Passwords hashed with bcrypt cost factor 12
- [ ] Invalid/expired tokens return 401
- [ ] Payload with MongoDB operators (`{ "$gt": "" }`) is sanitized and stripped
- [ ] XSS script tags in string fields are escaped/stripped
- [ ] All endpoints validate input with Zod, return structured errors
- [ ] Login with wrong password returns `"Invalid credentials"` — NOT `"Wrong password"`
- [ ] Login with non-existent email returns `"Invalid credentials"` — NOT `"User not found"`
- [ ] Forgot-password with non-existent email returns 200 with `"If an account exists, a reset link has been sent"`
- [ ] Register with existing email returns `"Unable to create account"` — NOT `"Email already exists"`
- [ ] 6th failed login attempt from same IP+email returns 429 with `"Too many attempts"` (no user-identifying info)
- [ ] Response time for valid vs invalid login is indistinguishable (<50ms variance)

---

### Sprint 2 — RBAC + Tenant Scoping + Feature Kill-Switch System

**Goal:** Role-based authorization middleware implementing the full 9-layer pipeline, multi-tenant query scoping, Super Admin feature kill-switch engine with Redis cache & audit logging.

#### Files Created:
```
server/src/middleware/authorize.ts
server/src/middleware/tenantScope.ts
server/src/middleware/featureFlag.ts
server/src/models/FeatureFlag.ts
server/src/features/feature-flags/featureFlag.controller.ts
server/src/features/feature-flags/featureFlag.service.ts
server/src/features/feature-flags/featureFlag.routes.ts
server/src/features/feature-flags/featureFlag.validators.ts
server/src/features/feature-flags/featureFlag.types.ts
server/src/features/users/user.controller.ts
server/src/features/users/user.service.ts
server/src/features/users/user.routes.ts
server/src/features/users/user.validators.ts
server/src/features/users/user.types.ts
server/src/features/brokerages/brokerage.controller.ts
server/src/features/brokerages/brokerage.service.ts
server/src/features/brokerages/brokerage.routes.ts
server/src/features/brokerages/brokerage.validators.ts
server/src/features/brokerages/brokerage.types.ts
```

#### Key Deliverables:
- `authorize(...roles)` middleware — checks user role against allowed roles
- `tenantScope` middleware — auto-injects `brokerageId` filter into `req` for all queries; super_admin bypasses
- **Feature Kill-Switch Engine (`middleware/featureFlag.ts`)**:
  - `requireFeature(featureKey)` middleware: checks Redis cache `feature_flags:{key}` in 0ms
  - If disabled: returns 503 with `{ success: false, message: "This feature is currently undergoing scheduled maintenance." }`
  - `FeatureFlag` model: key, name, isEnabled, disabledReason, updatedBy, updatedAt
  - Endpoints (Super Admin only):
    - `GET /api/feature-flags` — list all feature statuses
    - `PATCH /api/feature-flags/:key` — toggle feature flag (updates Redis + DB + logs audit entry)
- User management endpoints (brokerage_owner+):
  - `GET /api/users` — list users in brokerage (paginated, searchable)
  - `GET /api/users/:id` — user detail
  - `POST /api/users/invite` — invite user via email (role assignment)
  - `PATCH /api/users/:id` — update user profile/role
  - `DELETE /api/users/:id` — soft-delete (deactivate) user
  - `PATCH /api/users/:id/role` — change role (super_admin only for elevated roles)
- Brokerage management endpoints (super_admin):
  - `GET /api/brokerages` — list all brokerages
  - `GET /api/brokerages/:id` — brokerage detail
  - `PATCH /api/brokerages/:id` — update brokerage settings
  - `DELETE /api/brokerages/:id` — deactivate brokerage

#### Acceptance Criteria:
- [ ] Agent cannot access `/api/users` (403)
- [ ] Brokerage_owner can list/invite/edit users in their brokerage only
- [ ] Super_admin can see users across all brokerages
- [ ] All queries automatically scoped by `brokerageId`
- [ ] Super Admin can toggle any feature off; non-super-admin gets 403 on toggle attempt
- [ ] Disabled feature immediately returns 503 on its backend endpoints
- [ ] Feature toggle action writes an audit log record
- [ ] Role change: brokerage_owner cannot promote to super_admin

---

### Sprint 3 — Contacts CRUD + Activity Log

**Goal:** Full contact management with search, filters, pagination, tags, notes, and activity timeline.

#### Files Created:
```
server/src/models/Contact.ts
server/src/models/Activity.ts
server/src/features/contacts/contact.controller.ts
server/src/features/contacts/contact.service.ts
server/src/features/contacts/contact.routes.ts
server/src/features/contacts/contact.validators.ts
server/src/features/contacts/contact.types.ts
server/src/utils/pagination.ts
```

#### Key Deliverables:
- `Contact` model: name, email, phone, address, leadSource, leadScore, tags, status, assignedAgentId, brokerageId, socialLinks, propertyInterests
- `Activity` model: contactId, type, description, metadata, createdBy, brokerageId
- Contact endpoints:
  - `GET /api/contacts` — paginated list with search (name/email/phone), filter (status, tags, assignedAgent, leadSource, score range), sort
  - `GET /api/contacts/:id` — full detail with recent activities
  - `POST /api/contacts` — create contact
  - `PATCH /api/contacts/:id` — update contact
  - `DELETE /api/contacts/:id` — soft delete
  - `POST /api/contacts/:id/notes` — add note (creates activity)
  - `GET /api/contacts/:id/activities` — activity timeline (paginated)
  - `PATCH /api/contacts/bulk` — bulk tag, assign, status change
- Tenant scoping: agents see only their assigned contacts
- MongoDB text index on name + email + phone for fast search

#### Acceptance Criteria:
- [ ] Search contacts by partial name/email/phone
- [ ] Filter by status, tags, assigned agent, lead score range
- [ ] Activity auto-logged on every contact mutation
- [ ] Agent sees only their assigned contacts
- [ ] Brokerage_owner sees all contacts in their brokerage
- [ ] Pagination returns `{ data, total, page, limit, totalPages }`

---

### Sprint 4 — Lead Ingestion + Routing Engine

**Goal:** Lead source management, webhook receiver, all 4 routing algorithms, escalation timer.

#### Files Created:
```
server/src/models/LeadSource.ts
server/src/models/RoutingRule.ts
server/src/features/leads/lead.controller.ts
server/src/features/leads/lead.service.ts
server/src/features/leads/lead.routes.ts
server/src/features/leads/lead.validators.ts
server/src/features/leads/lead.types.ts
```

#### Key Deliverables:
- `LeadSource` model: name, type (zillow, realtor, meta_ads, google_ads, website, webhook, manual), config, isActive, leadCount
- `RoutingRule` model: name, type (round_robin, weighted, zip_code, time_of_day), assignedAgentIds, priority, config
- Lead ingestion endpoints:
  - `POST /api/leads/ingest` — universal webhook receiver (auto-detects source format)
  - `POST /api/leads/ingest/zillow` — Zillow-specific parser
  - `POST /api/leads/ingest/meta` — Meta Lead Ads webhook
  - `POST /api/leads/ingest/manual` — manual lead entry
- Lead source CRUD:
  - `GET/POST/PATCH/DELETE /api/lead-sources`
- Routing rule CRUD:
  - `GET/POST/PATCH/DELETE /api/routing-rules`
- Routing algorithms (executed on lead ingestion):
  - Round-robin: tracks last-assigned index per rule
  - Weighted: probability-based selection using agent weights
  - Zip-code: match lead zip to agent territories
  - Time-of-day: route based on agent schedules, escalate if unacknowledged in 60s
- Embeddable lead capture widget endpoint:
  - `POST /api/leads/capture` — public endpoint (rate-limited, no auth)
- Intent-based lead scoring (rule-based v1):
  - Score based on: property price tier, message length/keywords, source quality, financing mention

#### Acceptance Criteria:
- [ ] `POST /api/leads/ingest` creates contact + routes to agent via active routing rule
- [ ] Round-robin distributes evenly across agents
- [ ] Weighted routing respects configured weights
- [ ] Zip-code routing matches lead address to agent territory
- [ ] Time-of-day escalation re-routes after 60s timeout
- [ ] Lead score calculated on ingestion

---

### Sprint 5 — Pipeline + Deals

**Goal:** Pipeline stages, deal CRUD, stage transitions with validation, Kanban data endpoints.

#### Files Created:
```
server/src/models/Pipeline.ts
server/src/models/Deal.ts
server/src/features/pipeline/pipeline.controller.ts
server/src/features/pipeline/pipeline.service.ts
server/src/features/pipeline/pipeline.routes.ts
server/src/features/pipeline/pipeline.validators.ts
server/src/features/pipeline/pipeline.types.ts
server/src/features/deals/deal.controller.ts
server/src/features/deals/deal.service.ts
server/src/features/deals/deal.routes.ts
server/src/features/deals/deal.validators.ts
server/src/features/deals/deal.types.ts
```

#### Key Deliverables:
- `Pipeline` model: name, stages (ordered array), brokerageId, isDefault
- `Deal` model: contactId, stageId, dealValue, propertyAddress, assignedAgentId, priority, daysInStage, notes, brokerageId
- Pipeline endpoints:
  - `GET /api/pipelines` — list pipelines for brokerage
  - `POST /api/pipelines` — create pipeline with stages
  - `PATCH /api/pipelines/:id` — update pipeline/stages
  - `DELETE /api/pipelines/:id` — delete pipeline (no deals attached)
- Deal endpoints:
  - `GET /api/deals` — all deals with stage/pipeline/filter/sort/pagination
  - `GET /api/deals/kanban` — grouped by stage with counts + totals (optimized for Kanban UI)
  - `GET /api/deals/:id` — deal detail with contact + activities
  - `POST /api/deals` — create deal (linked to contact)
  - `PATCH /api/deals/:id` — update deal
  - `PATCH /api/deals/:id/stage` — move deal to stage (logs activity, updates daysInStage)
  - `DELETE /api/deals/:id` — soft delete

#### Acceptance Criteria:
- [ ] Kanban endpoint returns deals grouped by stage with aggregated values
- [ ] Stage transition creates activity log entry
- [ ] `daysInStage` calculated correctly
- [ ] Agent sees only their assigned deals
- [ ] Deal value aggregation per stage for pipeline summary

---

### Sprint 6 — Data Health Engine + Cron Jobs

**Goal:** Duplicate detection, data quality scoring, MX validation, background cron scheduler.

#### Files Created:
```
server/src/models/DataHealthScan.ts
server/src/models/DuplicatePair.ts
server/src/features/data-health/dataHealth.controller.ts
server/src/features/data-health/dataHealth.service.ts
server/src/features/data-health/dataHealth.routes.ts
server/src/features/data-health/dataHealth.validators.ts
server/src/features/data-health/dataHealth.cron.ts
server/src/features/data-health/dataHealth.types.ts
server/src/utils/fuzzyMatch.ts
server/src/jobs/scheduler.ts
server/src/jobs/dataHealthScan.job.ts
```

#### Key Deliverables:
- Fuzzy duplicate detection: Levenshtein distance on name, exact match on phone/email
- `DataHealthScan` model: overallScore, grade, metrics (duplicates, unverified phones, invalid emails, missing fields), trend history
- `DuplicatePair` model: contact1Id, contact2Id, matchScore, matchFields, status (pending/merged/dismissed)
- Data health endpoints:
  - `GET /api/data-health/score` — current score + trend
  - `GET /api/data-health/duplicates` — paginated duplicate pairs
  - `POST /api/data-health/duplicates/:id/merge` — merge two contacts (preserves all activities/notes)
  - `POST /api/data-health/duplicates/:id/dismiss` — mark as not duplicate
  - `POST /api/data-health/scan` — trigger manual scan
- Background cron jobs (node-cron or Agenda):
  - Daily data health scan (dedup, score recalculation)
  - Email MX record validation (DNS lookup — free, no API needed)
  - Phone line-type check (stubbed for Twilio Lookup — mock response for now)
- Data quality score formula:
  - 100 - (duplicates_penalty + invalid_email_penalty + missing_phone_penalty + missing_address_penalty)

#### Acceptance Criteria:
- [ ] Scan detects duplicate contacts by fuzzy name + exact phone/email
- [ ] Merge preserves all activities from both contacts
- [ ] Score updates after scan, trend stored for charting
- [ ] Cron job runs daily without blocking the main thread
- [ ] MX check validates email domain DNS records

---

### Sprint 7 — Smart Lists + Dashboard APIs

**Goal:** Dynamic query builder, saved filters, role-based dashboard KPI aggregation.

#### Files Created:
```
server/src/models/SmartList.ts
server/src/features/smart-lists/smartList.controller.ts
server/src/features/smart-lists/smartList.service.ts
server/src/features/smart-lists/smartList.routes.ts
server/src/features/smart-lists/smartList.validators.ts
server/src/features/smart-lists/smartList.types.ts
server/src/features/dashboard/dashboard.controller.ts
server/src/features/dashboard/dashboard.service.ts
server/src/features/dashboard/dashboard.routes.ts
server/src/features/dashboard/dashboard.types.ts
```

#### Key Deliverables:
- `SmartList` model: name, filters (field, operator, value), brokerageId, createdBy
- Smart list endpoints:
  - `GET /api/smart-lists` — saved lists for user
  - `POST /api/smart-lists` — save new filter set
  - `PATCH /api/smart-lists/:id` — update filters
  - `DELETE /api/smart-lists/:id` — delete list
  - `POST /api/smart-lists/preview` — execute filters, return matching contacts (paginated)
- Dynamic query builder: translates filter operators (equals, contains, greater_than, between, in, is_empty, etc.) into MongoDB query
- Dashboard endpoints (role-scoped):
  - `GET /api/dashboard/kpis` — total contacts, new leads this week, active deals, data health score
  - `GET /api/dashboard/lead-sources` — lead count by source (chart data)
  - `GET /api/dashboard/leads-over-time` — daily/weekly lead trend
  - `GET /api/dashboard/pipeline-summary` — deal count + value per stage
  - `GET /api/dashboard/activity-feed` — recent activities across brokerage
- Lead portal dashboard (for `lead` role):
  - `GET /api/dashboard/lead-portal` — my deal status, assigned agent info, recent updates

#### Acceptance Criteria:
- [ ] Smart list filters translate to correct MongoDB queries
- [ ] Operators: equals, not_equals, contains, greater_than, less_than, between, in, is_empty all work
- [ ] Dashboard KPIs scoped by role (agent sees own, team_lead sees team, etc.)
- [ ] Lead portal returns only the logged-in lead's own deal info
- [ ] Results cached in Redis (2-5 min TTL)

---

### Sprint 8 — Rate Limiter + Quota Guard + Circuit Breakers + Cache + Audit

**Goal:** Redis-backed rate limiting, daily spend/token quota guards, automated circuit breakers for external APIs, cache-aside middleware, immutable audit log.

#### Files Created:
```
server/src/middleware/rateLimiter.ts
server/src/middleware/circuitBreaker.ts
server/src/middleware/cache.ts
server/src/middleware/auditLogger.ts
server/src/models/AuditLog.ts
server/src/models/SystemConfig.ts
server/src/features/audit/audit.controller.ts
server/src/features/audit/audit.service.ts
server/src/features/audit/audit.routes.ts
server/src/features/audit/audit.types.ts
server/src/utils/circuitBreaker.ts
server/src/utils/cacheHelper.ts
```

#### Key Deliverables:
- **Rate limiter & Quota Guard** (Redis-backed sliding window):
  - super_admin: 200 req/min
  - brokerage_owner: 120 req/min
  - team_lead: 80 req/min
  - agent: 60 req/min
  - lead: 20 req/min
  - Unauthenticated: 10 req/min
  - **Daily Spend & Token Quota Counter**: tracks tokens/calls per tenant and globally in Redis; blocks requests with 429 when budget threshold hit.
- **Circuit Breaker Engine (`utils/circuitBreaker.ts`)**:
  - Monitors failure rates & call volume on external vendor services.
  - Automatically trips to `OPEN` on consecutive errors or cost spikes, protecting system from vendor downtime and billing drain.
- **Cache middleware** (cache-aside pattern):
  - `cacheGet(key)` → check Redis → return if hit
  - `cacheSet(key, data, ttl)` → store in Redis
  - `cacheInvalidate(pattern)` → delete matching keys
  - Key format: `pp:{brokerageId}:{feature}:{params_hash}`
  - Applied to: GET dashboard, GET contacts list, GET pipeline, GET data-health score
- **Audit logger** middleware:
  - Logs every POST/PATCH/DELETE request + Feature Toggle actions
  - `AuditLog` model: userId, brokerageId, action, resource, resourceId, previousData, newData, ipAddress, userAgent, timestamp
  - Immutable — no update/delete endpoints
  - Audit endpoints:
    - `GET /api/audit-logs` — paginated, filterable by user/resource/date range
    - (super_admin sees all, brokerage_owner sees own brokerage)

#### Acceptance Criteria:
- [ ] 61st request from agent within 1 minute returns 429
- [ ] Daily spend limit in Redis blocks excess third-party API triggers
- [ ] Circuit breaker opens after 5 consecutive external API failures, stopping further vendor calls for 5 minutes
- [ ] Dashboard KPIs served from Redis cache on second request
- [ ] Cache invalidated when contact is created/updated
- [ ] Every mutation and feature toggle creates an audit log entry with before/after data
- [ ] Audit logs are immutable (no PATCH/DELETE endpoints)

---

### Sprint 9 — Frontend Integration (Part 1: Auth + Contacts + Pipeline)

**Goal:** Replace `fakeBaseQuery` with real `fetchBaseQuery`, wire auth cookies, contacts, and pipeline to backend.

#### Files Modified:
```
src/store/api/baseApi.ts              → fetchBaseQuery with credentials: 'include'
src/store/api/authApi.ts              → real endpoints
src/store/api/contactsApi.ts          → real endpoints
src/store/api/pipelineApi.ts          → real endpoints
src/store/slices/authSlice.ts         → remove localStorage, use cookie-based auth
src/components/auth/ProtectedRoute.tsx → use GET /api/auth/me on mount
src/types/auth.ts                      → add 'lead' role
src/pages/auth/LoginPage.tsx           → wire to real login
src/pages/auth/SignupPage.tsx          → wire to real signup
```

#### Key Deliverables:
- `baseApi` switches from `fakeBaseQuery()` to `fetchBaseQuery({ baseUrl, credentials: 'include' })`
- Auth flow: login sets httpOnly cookie, `GET /api/auth/me` validates session on page load
- Remove all `localStorage` token storage
- Contacts page wired to real paginated API with server-side search/filter
- Pipeline page wired to real kanban endpoint
- Deal CRUD (create, edit, move stage) calls real backend
- Error handling: 401 → redirect to login, 403 → show "Access Denied"

#### Acceptance Criteria:
- [ ] Login works with real backend, cookie set
- [ ] Page refresh maintains session (cookie-based)
- [ ] Contacts page loads from MongoDB with pagination
- [ ] Pipeline kanban loads real data
- [ ] Logout clears cookie and redirects

---

### Sprint 10 — Frontend Integration (Part 2: All Remaining Pages)

**Goal:** Wire leads, data-health, smart-lists, settings, dashboard, role-based UI.

#### Files Modified:
```
src/store/api/leadsApi.ts             → real endpoints
src/store/api/dataHealthApi.ts        → real endpoints
src/store/api/settingsApi.ts          → real endpoints
src/store/api/communicationApi.ts     → real endpoints (basic)
src/pages/dashboard/DashboardPage.tsx  → role-based KPIs
src/pages/leads/LeadIngestionPage.tsx  → real CRUD
src/pages/data-health/DataHealthPage.tsx → real scan/merge
src/pages/smart-lists/SmartListsPage.tsx → real filters
src/pages/settings/SettingsPage.tsx    → real team management
src/App.tsx                            → add lead portal route
```

#### Key Deliverables:
- All remaining API slices wired to real backend
- Role-based dashboard: different KPI cards per role
- Lead portal page (new): minimal view for `lead` role showing deal status + agent info
- Settings page: team member CRUD hitting real backend
- Data health page: trigger scan, view/merge duplicates from real data
- Smart lists: execute filters server-side
- Remove all mock data imports (clean up `src/mocks/`)

#### Acceptance Criteria:
- [ ] All 11 pages work with real backend data
- [ ] No mock data imports remain in production code
- [ ] Lead user sees only their portal (different route/layout)
- [ ] Role-based sidebar: leads don't see admin pages
- [ ] Error states handled gracefully for all API calls

---

### Sprint 11 — Inbox + WebSockets (Real-Time)

**Goal:** Conversation threads, message CRUD, Socket.io for live updates + notifications.

#### Files Created:
```
server/src/models/Conversation.ts
server/src/models/Message.ts
server/src/models/Notification.ts
server/src/config/socket.ts
server/src/features/inbox/inbox.controller.ts
server/src/features/inbox/inbox.service.ts
server/src/features/inbox/inbox.routes.ts
server/src/features/inbox/inbox.validators.ts
server/src/features/inbox/inbox.socket.ts
server/src/features/inbox/inbox.types.ts
server/src/features/notifications/notification.controller.ts
server/src/features/notifications/notification.service.ts
server/src/features/notifications/notification.routes.ts
server/src/features/notifications/notification.socket.ts
server/src/features/notifications/notification.types.ts
```

#### Key Deliverables:
- Socket.io server integrated with Express
- Socket authentication (validates httpOnly cookie on handshake)
- Room-based architecture: each user joins `user:{userId}` and `brokerage:{brokerageId}` rooms
- Conversation model + Message model
- Inbox REST endpoints:
  - `GET /api/inbox/conversations` — list with last message, unread count
  - `GET /api/inbox/conversations/:id/messages` — paginated messages
  - `POST /api/inbox/conversations/:id/messages` — send message
  - `PATCH /api/inbox/conversations/:id/read` — mark as read
- WebSocket events:
  - `message:new` — real-time incoming message
  - `notification:new` — real-time notification push
  - `deal:stageChanged` — real-time pipeline update
  - `lead:new` — real-time new lead alert
- Notification REST endpoints:
  - `GET /api/notifications` — list notifications
  - `PATCH /api/notifications/:id/read` — mark as read
  - `PATCH /api/notifications/read-all` — mark all as read

#### Frontend Changes:
- Socket.io client integrated in app shell
- Inbox page receives real-time messages
- Toast notifications on new lead / deal stage change
- Notification bell with unread count

#### Acceptance Criteria:
- [ ] Send message → recipient receives in real-time via WebSocket
- [ ] New lead ingested → assigned agent gets WebSocket notification
- [ ] Deal stage change → relevant users notified
- [ ] Socket auth: unauthenticated connections rejected
- [ ] Unread count updates in real-time

---

### Sprint 12 — AI Chatbot + Agent Copilot

**Goal:** Mistral/OpenRouter integration for lead qualification bot + agent draft assistant + Fair Housing scanner.

#### Files Created:
```
server/src/features/ai-chatbot/chatbot.controller.ts
server/src/features/ai-chatbot/chatbot.service.ts
server/src/features/ai-chatbot/chatbot.routes.ts
server/src/features/ai-chatbot/chatbot.validators.ts
server/src/features/ai-chatbot/chatbot.prompts.ts
server/src/features/ai-chatbot/chatbot.types.ts
server/src/features/compliance/nlp/fairHousing.ts
```

#### Key Deliverables:
- **Lead Qualification Bot:**
  - Streaming chat endpoint: `POST /api/chatbot/qualify` (SSE stream)
  - System prompt includes: property context, budget/timeline/pre-approval qualification criteria
  - Extracts structured data from conversation (budget range, timeline, pre-approval status, location preference)
  - Auto-updates contact record with qualification data
- **Agent Assistant:**
  - `POST /api/chatbot/draft-response` — generates contextual reply draft given conversation history
  - `POST /api/chatbot/summarize` — summarizes conversation or call transcript
  - `POST /api/chatbot/suggest-next-action` — recommends next best action for a lead
- **Fair Housing NLP Scanner:**
  - `POST /api/compliance/fair-housing-check` — scans text for prohibited phrases
  - Uses Mistral to detect steering language, demographic bias, discriminatory preferences
  - Returns: `{ hasWarning, flaggedPhrases[], recommendedAlternative, explanation }`
- Provider abstraction: swap Mistral ↔ OpenRouter with env var change

#### Acceptance Criteria:
- [ ] Qualification bot extracts budget/timeline/location from natural conversation
- [ ] Agent assistant generates contextual reply drafts
- [ ] Fair Housing scanner flags "no families with children" as violation
- [ ] Streaming responses work (SSE)
- [ ] API key configurable via environment variable

---

### Sprint 13 — AI ISA Engine + Reactivation Campaigns

**Goal:** Autonomous lead outreach logic, reactivation campaigns for dormant leads, persona controls.

#### Files Created:
```
server/src/features/ai-isa/isa.controller.ts
server/src/features/ai-isa/isa.service.ts
server/src/features/ai-isa/isa.routes.ts
server/src/features/ai-isa/isa.validators.ts
server/src/features/ai-isa/isa.scheduler.ts
server/src/features/ai-isa/isa.types.ts
server/src/models/Campaign.ts
server/src/jobs/reactivation.job.ts
```

#### Key Deliverables:
- AI ISA configuration endpoints:
  - `GET/PATCH /api/ai-isa/config` — enable/disable AI ISA, set persona, qualifying criteria
  - `GET/POST/PATCH/DELETE /api/ai-isa/qualification-criteria` — CRUD for qualifying questions
- Reactivation campaign endpoints:
  - `GET/POST/PATCH/DELETE /api/ai-isa/campaigns` — campaign CRUD
  - `POST /api/ai-isa/campaigns/:id/start` — activate campaign
  - `POST /api/ai-isa/campaigns/:id/pause` — pause campaign
  - `GET /api/ai-isa/campaigns/:id/metrics` — response rate, meetings booked
- Speed-to-lead metrics:
  - `GET /api/ai-isa/speed-to-lead` — avg response time per channel, sub-30s rate
- Background scheduler for reactivation:
  - Queries dormant leads (no activity in 90+ days)
  - Generates personalized AI message per lead
  - Queues for send (via communication provider — stubbed initially)

#### Acceptance Criteria:
- [ ] Campaign targets dormant leads based on configurable threshold
- [ ] AI generates personalized message per lead using contact context
- [ ] Metrics track: total targeted, contacted, responded, meetings booked
- [ ] Speed-to-lead metrics calculated from activity timestamps

---

### Sprint 14 — Communication Hub (Email/SMS Abstraction + Opt-Out)

**Goal:** Communication provider abstraction layer, opt-out engine, DNC check stubs.

#### Files Created:
```
server/src/features/communication/comm.controller.ts
server/src/features/communication/comm.service.ts
server/src/features/communication/comm.routes.ts
server/src/features/communication/comm.validators.ts
server/src/features/communication/comm.types.ts
server/src/features/communication/providers/email.provider.ts
server/src/features/communication/providers/sms.provider.ts
server/src/features/communication/providers/whatsapp.provider.ts
server/src/features/communication/providers/voice.provider.ts
```

#### Key Deliverables:
- **Provider abstraction pattern:**
  - `ICommunicationProvider` interface: `send(to, message, options)`, `getStatus(messageId)`, `handleWebhook(payload)`
  - Email provider: SendGrid adapter (configured later) + mock provider for demo
  - SMS provider: Twilio adapter + mock provider
  - WhatsApp provider: Meta Cloud API adapter + mock provider
  - Voice provider: Twilio Voice adapter + mock provider
- **Opt-out engine:**
  - Auto-detect STOP/UNSUBSCRIBE/QUIT/CANCEL/OPT-OUT in inbound messages
  - Immediately set contact's dncStatus = 'opted_out'
  - Block all future outbound to opted-out contacts
  - `POST /api/communication/opt-out` — manual opt-out
  - `POST /api/communication/opt-back-in` — re-consent (with double-opt-in)
- **DNC check stubs:**
  - `POST /api/compliance/dnc-check` — check phone against DNC registry (mock for now, real FTC API later)
  - Pre-send middleware: checks DNC status before any outbound
- Communication endpoints:
  - `POST /api/communication/send` — unified send (email/sms/whatsapp)
  - `GET /api/communication/templates` — quick reply templates CRUD

#### Acceptance Criteria:
- [ ] Send via any channel routes through correct provider
- [ ] Mock provider logs to console + creates message record
- [ ] "STOP" inbound auto-sets dncStatus and blocks future sends
- [ ] DNC check prevents sending to flagged numbers
- [ ] Providers swappable via config (no code changes)

---

### Sprint 15 — Dialer Backend + Call Logging

**Goal:** WebRTC dialer backend, call session management, recording stubs, call disposition logging.

#### Files Created:
```
server/src/models/CallLog.ts
server/src/features/dialer/dialer.controller.ts
server/src/features/dialer/dialer.service.ts
server/src/features/dialer/dialer.routes.ts
server/src/features/dialer/dialer.validators.ts
server/src/features/dialer/dialer.socket.ts
server/src/features/dialer/dialer.types.ts
```

#### Key Deliverables:
- Dialer queue management:
  - `GET /api/dialer/queue` — get dialer queue (contacts to call, ordered by lead score)
  - `POST /api/dialer/queue` — add contacts to queue
  - `DELETE /api/dialer/queue/:contactId` — remove from queue
  - `POST /api/dialer/queue/smart-populate` — auto-populate from smart list
- Call session endpoints:
  - `POST /api/dialer/call` — initiate call (generates Twilio token or mock)
  - `POST /api/dialer/call/:id/end` — end call with disposition
  - `POST /api/dialer/call/:id/voicemail-drop` — drop pre-recorded voicemail
  - `GET /api/dialer/token` — get Twilio client token for WebRTC
- Call logging:
  - `CallLog` model: contactId, duration, direction, disposition, recordingUrl, transcript, sentiment, agentName
  - `GET /api/dialer/call-logs` — paginated call history
  - `GET /api/dialer/call-logs/:id` — call detail with transcript
- Voicemail drops:
  - `GET/POST/DELETE /api/dialer/voicemail-drops` — manage pre-recorded voicemails
- WebSocket events for real-time call state updates

#### Acceptance Criteria:
- [ ] Queue ordered by lead score (highest first)
- [ ] Call disposition logged with correct duration
- [ ] Voicemail drops stored and selectable
- [ ] WebSocket broadcasts call state changes to dialer UI
- [ ] Mock mode works without Twilio credentials

---

### Sprint 16 — WhatsApp Integration + Advanced Dialer Features

**Goal:** WhatsApp Cloud API integration, 3/5-line parallel dialer logic, local presence, transcription stubs.

#### Key Deliverables:
- WhatsApp Cloud API:
  - Webhook receiver for inbound WhatsApp messages
  - Template message management (text, media, interactive)
  - Broadcast list management
  - Media handling (images, documents, voice notes)
  - Route inbound WhatsApp → conversation thread → notification
- Advanced dialer:
  - Multi-line session management (3 and 5 line modes)
  - Local presence: select outbound caller ID from pool matching lead's area code
  - Call transcription integration stub (Deepgram/AssemblyAI adapter)
  - AI call summary generation post-call (uses Mistral)
- Frontend updates:
  - WhatsApp conversation thread in inbox
  - Multi-line dialer UI wired to real backend

#### Acceptance Criteria:
- [ ] WhatsApp inbound webhook creates conversation + notifies agent
- [ ] Template messages send via WhatsApp Cloud API (or mock)
- [ ] 3-line dialer queues 3 contacts simultaneously
- [ ] Post-call AI summary generated from transcript
- [ ] Local presence selects matching area code from phone pool

---

### Sprint 17 — Transaction Engine

**Goal:** Deal → transaction conversion, milestone checklists, document management.

#### Files Created:
```
server/src/models/Transaction.ts
server/src/models/Document.ts
server/src/features/transactions/transaction.controller.ts
server/src/features/transactions/transaction.service.ts
server/src/features/transactions/transaction.routes.ts
server/src/features/transactions/transaction.validators.ts
server/src/features/transactions/transaction.types.ts
```

#### Key Deliverables:
- `Transaction` model: dealId, contactId, type (buyer/seller), milestones[], documents[], status, closingDate, brokerageId
- Default milestone templates:
  - Buyer: Offer → Under Contract → Inspection → Appraisal → Title Clear → Closing
  - Seller: Listing → Showings → Offer Received → Under Contract → Closing
- Transaction endpoints:
  - `POST /api/transactions/from-deal/:dealId` — convert closed-won deal to transaction
  - `GET /api/transactions` — list transactions
  - `GET /api/transactions/:id` — detail with milestones + documents
  - `PATCH /api/transactions/:id/milestones/:milestoneId` — update milestone (complete/skip)
  - `POST /api/transactions/:id/documents` — upload document
- Document management:
  - Upload to S3 / local storage
  - Document types: contract, disclosure, inspection report, appraisal, title commitment
  - `GET /api/transactions/:id/documents` — list documents
  - `DELETE /api/transactions/:id/documents/:docId` — remove document
- Lead portal: leads can view their transaction milestones + download documents

#### Acceptance Criteria:
- [ ] Closed-won deal auto-generates transaction with default milestones
- [ ] Milestone completion updates transaction progress percentage
- [ ] Documents uploaded and retrievable
- [ ] Lead can view their own transaction progress

---

### Sprint 18 — Commission Calculator + eSignature Foundation

**Goal:** Commission split engine, eSignature document preparation and signing workflow.

#### Files Created:
```
server/src/models/Commission.ts
server/src/features/commissions/commission.controller.ts
server/src/features/commissions/commission.service.ts
server/src/features/commissions/commission.routes.ts
server/src/features/commissions/commission.validators.ts
server/src/features/commissions/commission.types.ts
server/src/features/esign/esign.controller.ts
server/src/features/esign/esign.service.ts
server/src/features/esign/esign.routes.ts
server/src/features/esign/esign.validators.ts
server/src/features/esign/esign.types.ts
```

#### Key Deliverables:
- **Commission engine:**
  - Split models: fixed %, tiered (sliding scale), capped
  - Deductions: franchise fee, E&O insurance, desk fee, TC fee, referral fee
  - `POST /api/commissions/calculate` — calculate split for a transaction
  - `GET /api/commissions/report` — commission summary per agent/date range
  - Brokerage-level commission plan templates
- **eSignature foundation:**
  - PDF upload + field tag placement (signature, initials, date, text fields)
  - Signing workflow: prepare → send → sign → completed
  - `POST /api/esign/prepare` — upload PDF, define sign fields
  - `POST /api/esign/send` — send to signer(s) via email link
  - `GET /api/esign/sign/:token` — public signing page (returns PDF with fields)
  - `POST /api/esign/sign/:token/complete` — submit signatures
  - Audit trail: timestamped log of every action (view, sign, decline)

#### Acceptance Criteria:
- [ ] Commission calculated correctly for tiered + capped models
- [ ] Multiple deduction types subtracted correctly
- [ ] PDF uploaded, fields mapped, signing link generated
- [ ] Signing workflow tracks status (pending, viewed, signed, declined)
- [ ] Signed PDF stored with audit trail

---

### Sprint 19 — Seller Radar + Micro-CMA

**Goal:** Property equity analysis (ATTOM API stub), micro-CMA landing page generator, anniversary triggers.

#### Files Created:
```
server/src/models/Property.ts
server/src/features/seller-radar/radar.controller.ts
server/src/features/seller-radar/radar.service.ts
server/src/features/seller-radar/radar.routes.ts
server/src/features/seller-radar/radar.validators.ts
server/src/features/seller-radar/radar.types.ts
```

#### Key Deliverables:
- `Property` model: address, estimatedValue, mortgageBalance, equity, equityPercent, purchaseDate, purchasePrice, ownerContactId, probabilityOfSelling
- Seller Radar endpoints:
  - `GET /api/seller-radar/prospects` — high-equity homeowners ranked by sell probability
  - `POST /api/seller-radar/analyze` — analyze a property (calls ATTOM API or returns mock data)
  - `GET /api/seller-radar/dashboard` — aggregate metrics (total prospects, avg equity, hot leads)
- Micro-CMA generator:
  - `POST /api/seller-radar/cma/generate` — generates HTML landing page with:
    - Property value estimate (from comparable sales)
    - Recent comps (3-5 similar properties)
    - Active buyer demand count
    - Dynamic valuation range
  - `GET /api/seller-radar/cma/:id` — public CMA landing page
- Home anniversary trigger:
  - Cron job checks purchase dates daily
  - Auto-queues equity update communication on purchase anniversary
- **ATTOM API abstracted** — works with mock data when no API key configured

#### Acceptance Criteria:
- [ ] Mock property data returns realistic equity analysis
- [ ] CMA generates shareable public URL
- [ ] Anniversary trigger identifies contacts with upcoming anniversaries
- [ ] Sell probability calculated from equity %, years owned, market conditions (mock formula)

---

### Sprint 20 — Settings + Team + Integrations + Export + File Upload

**Goal:** Full settings backend, notification preferences, integration management, CSV/PDF export, S3 + local file upload.

#### Files Created:
```
server/src/models/Integration.ts
server/src/models/ApiKey.ts
server/src/models/Settings.ts
server/src/features/settings/settings.controller.ts
server/src/features/settings/settings.service.ts
server/src/features/settings/settings.routes.ts
server/src/features/settings/settings.validators.ts
server/src/features/settings/settings.types.ts
server/src/features/integrations/integration.controller.ts
server/src/features/integrations/integration.service.ts
server/src/features/integrations/integration.routes.ts
server/src/features/integrations/integration.types.ts
server/src/features/export/export.controller.ts
server/src/features/export/export.service.ts
server/src/features/export/export.routes.ts
server/src/features/export/export.types.ts
server/src/utils/exportHelper.ts
server/src/utils/fileUpload.ts
server/src/config/storage.ts
server/src/middleware/upload.ts
```

#### Key Deliverables:
- **Settings:** notification preferences per user, brokerage-level config, timezone
- **Integrations:** CRUD for third-party connections (Zapier, QuickBooks, etc.) — store API keys encrypted
- **API key management:** generate/revoke API keys for webhook access
- **CSV importer:** `POST /api/import/csv` — upload CSV, map columns, preview, confirm import
- **Export:**
  - `GET /api/export/contacts?format=csv` — export contacts as CSV
  - `GET /api/export/contacts?format=pdf` — export contacts as PDF
  - `GET /api/export/deals?format=csv|pdf` — export deals
  - `GET /api/export/commissions?format=csv|pdf` — export commission report
  - PDF generation using `pdfkit` or `puppeteer`
- **File upload:**
  - S3 adapter: uploads to configured S3 bucket
  - Local adapter: saves to `uploads/` directory (for demo)
  - Switch via `STORAGE_PROVIDER=s3|local` env var
  - `POST /api/files/upload` — upload file, returns URL
  - `DELETE /api/files/:id` — delete file

#### Acceptance Criteria:
- [ ] CSV export downloads valid file with correct columns
- [ ] PDF export generates formatted document
- [ ] File upload works with both S3 and local storage
- [ ] CSV import previews mapping before committing
- [ ] Integration API keys stored encrypted

---

### Sprint 21 — Compliance + Security + Testing

**Goal:** TCPA compliance shield, security hardening, comprehensive testing.

#### Files Created:
```
server/src/features/compliance/compliance.controller.ts
server/src/features/compliance/compliance.service.ts
server/src/features/compliance/compliance.routes.ts
server/src/features/compliance/compliance.validators.ts
server/src/features/compliance/compliance.types.ts
server/tests/unit/auth.test.ts
server/tests/unit/contacts.test.ts
server/tests/unit/rbac.test.ts
server/tests/integration/auth.integration.test.ts
server/tests/integration/contacts.integration.test.ts
server/tests/integration/deals.integration.test.ts
server/tests/helpers/testFactory.ts
server/tests/helpers/testDb.ts
```

#### Key Deliverables:
- **TCPA Shield:**
  - DNC registry check (stub with mock data, real FTC API when key available)
  - Double opt-in verification flow
  - Communication consent tracking per contact per channel
  - Compliance dashboard: `GET /api/compliance/dashboard` — opt-out rate, DNC hits, Fair Housing flags
- **Security hardening:**
  - Helmet.js for HTTP security headers
  - CORS locked to Vercel frontend domain
  - Request body size limits
  - MongoDB injection prevention (sanitize-mongo)
  - XSS prevention
  - CSRF protection for cookie-based auth
  - Password strength validation
- **Testing:**
  - Unit tests for: auth service, RBAC middleware, tenant scoping, contact service, deal service
  - Integration tests for: auth flow, contact CRUD, deal stage transitions, role permissions
  - Test factory: create mock users, contacts, deals for testing
  - Test database: separate MongoDB instance for testing

#### Acceptance Criteria:
- [ ] All security headers present in responses
- [ ] CORS blocks requests from unauthorized origins
- [ ] DNC check prevents outbound to flagged numbers
- [ ] 80%+ code coverage on auth + RBAC + contacts + deals
- [ ] All integration tests pass

---

### Sprint 22 — Deployment + Production

**Goal:** Docker setup, CI/CD, environment configuration, Vercel + Render deployment, monitoring.

#### Files Created:
```
server/Dockerfile
server/docker-compose.yml
server/render.yaml
server/.env.production
frontend: vercel.json (if needed)
server/scripts/seed.ts
server/scripts/healthcheck.ts
```

#### Key Deliverables:
- **Docker:**
  - Multi-stage Dockerfile (build + production)
  - docker-compose with MongoDB + Redis + app for local dev
- **Render deployment:**
  - `render.yaml` — web service config
  - Environment variables configured in Render dashboard
  - MongoDB Atlas (free tier) for production database
  - Redis Cloud (free tier) for production cache
  - Auto-deploy from Git push
- **Vercel deployment:**
  - Frontend build + deploy config
  - Environment variable: `VITE_API_URL` pointing to Render backend
  - Rewrites/proxying if needed
- **Database seeding:**
  - `npm run seed` — creates demo brokerage + users + contacts + deals
  - Separate seed for each role (to demo role-based access)
- **Health checks:**
  - `GET /api/health` — checks MongoDB + Redis connectivity
  - `GET /api/health/detailed` — memory usage, uptime, connection counts (super_admin only)
- **Monitoring:**
  - Structured logging with request IDs
  - Error tracking (Sentry free tier or console-based)
  - Performance: response time logging in middleware

#### Acceptance Criteria:
- [ ] `docker-compose up` starts full stack locally
- [ ] Frontend deployed to Vercel, accessible via URL
- [ ] Backend deployed to Render, API accessible
- [ ] MongoDB Atlas connected with production credentials
- [ ] Redis Cloud connected
- [ ] Health check endpoint returns 200
- [ ] Seed script creates demo data for all roles
- [ ] Full end-to-end flow works: register → login → create contact → create deal → move deal → view dashboard

---

### Sprint 23 — AI Objection Handling Engine (Scripts & Rebuttals Copilot)

**Goal:** Intelligent real estate objection handling copilot for agents in conversations with auto-detection and custom playbook management.

#### Files Created:
```
server/src/features/ai-chatbot/objections/objection.types.ts
server/src/features/ai-chatbot/objections/objection.service.ts
server/src/features/ai-chatbot/objections/objection.controller.ts
server/src/features/ai-chatbot/objections/objection.routes.ts
server/src/features/ai-chatbot/objections/objection.prompts.ts
```

#### Key Deliverables:
- **Auto-Detection in Inbox:** Automatically analyzes inbound lead messages in real time to flag objections (interest rate fears, market crash hesitations, commission fee negotiations, lowball offers, contingency delays).
- **Multi-Angle Rebuttal Generation (3+ Distinct Angles):**
  1. *Analytical & Data-Driven Angle* (e.g. historical equity growth stats, refinancing math).
  2. *Empathetic & Trust-Building Angle* (e.g. acknowledging concerns, building long-term relationship).
  3. *Urgency & Opportunity Angle* (e.g. inventory scarcity, cost of waiting).
- **Brokerage Custom Playbook in Settings:** Brokerage owners can configure and customize company-specific scripts & rebuttals in a dedicated "Scripts & Objection Playbook" tab.
- `POST /api/chatbot/objections/rebuttal` — returns 3+ ranked rebuttals with confidence score
- `GET /api/chatbot/objections/playbook` — returns curated library of proven objection handling scripts
- `POST /api/chatbot/objections/playbook` — saves custom brokerage scripts

#### Acceptance Criteria:
- [ ] Objections automatically flagged in Inbox thread view
- [ ] 3+ distinct rebuttal angles generated dynamically without Fair Housing violations
- [ ] One-click copy/insert into agent draft area
- [ ] Scripts and Objection Playbook tab accessible in Settings for Brokerage Owners

---

### Sprint 24 — AI Micro-CMA Storytelling & Equity Narrative Generator

**Goal:** Synthesize MLS sold comparables into personalized valuation stories supporting both buyers and sellers objectively.

#### Files Created:
```
server/src/features/seller-radar/cma-ai/cmaStory.types.ts
server/src/features/seller-radar/cma-ai/cmaStory.service.ts
server/src/features/seller-radar/cma-ai/cmaStory.controller.ts
server/src/features/seller-radar/cma-ai/cmaStory.routes.ts
server/src/features/seller-radar/cma-ai/cmaStory.prompts.ts
```

#### Key Deliverables:
- **Unbiased Dual-Perspective Valuation Engine:**
  - *Seller Mode:* Highlights recent sold prices, neighborhood equity appreciation, and listing pricing strategy.
  - *Buyer Mode:* Highlights fair market valuation, comparable sales benchmarks, and competitive offer justification.
- **Recent Sold Price Analysis:** Analyzes 3–5 recent local sold comps to calculate exact $/sqft price trends and historical appreciation.
- `POST /api/seller-radar/cma/narrative` — generates personalized homeowner/buyer valuation story (`mode: 'seller' | 'buyer'`)
- Public Micro-CMA landing page embed with dynamic narrative block

#### Acceptance Criteria:
- [ ] Generates human-like, compliant valuation stories for both buyer and seller modes
- [ ] Data anchored on recent sold prices with transparent comp citations
- [ ] Outputs formatted HTML/Markdown snippets for direct inclusion in CMA landing pages

---

### Sprint 25 — Whisper Voice Note & Mobile Audio Transcriber

**Goal:** Auto-transcribe agent voice recordings into structured CRM activity notes and contact updates.

#### Files Created:
```
server/src/features/transcription/whisper.types.ts
server/src/features/transcription/whisper.service.ts
server/src/features/transcription/whisper.controller.ts
server/src/features/transcription/whisper.routes.ts
```

#### Key Deliverables:
- **Dual Audio Ingestion:**
  - In-browser / mobile direct microphone voice recording (`MediaRecorder` API).
  - Pre-recorded audio file uploads (`.m4a`, `.mp3`, `.wav`, `.webm`).
- **Whisper Speech-to-Text Pipeline:** Integration with Whisper API (OpenAI / Groq Whisper / local stub fallback).
- **Intelligent Entity & Task Extraction:** Automatically extracts:
  1. *Contact Name & Identity*
  2. *Key Discussion Points & Summary*
  3. *Next Follow-Up Date & Task Creation*
  4. *Deal Stage Progression & Notes*
- `POST /api/transcription/voice-note` — uploads audio, transcribes, extracts action items, and auto-updates MongoDB Contact and Activity records

#### Acceptance Criteria:
- [ ] Supports both direct recording and file upload
- [ ] Audio transcribed in seconds with high accuracy
- [ ] Automatically updates Contact fields and schedules next follow-up date in CRM
- [ ] Creates structured voice note activity record with audio link and transcription text

---

## Summary

| Metric | Value |
|--------|-------|
| **Total sprints** | 25 sprints |
| **Backend features** | 25 feature modules |
| **Mongoose models** | 24 |
| **API endpoint groups** | ~38 route files |
| **Estimated files created** | ~195+ server files |
| **External APIs** | Mistral/OpenRouter/Whisper, all others mock-ready |
| **Frontend changes** | Sprints 9-10 (full frontend integration) |
| **Testing** | Sprint 21 (unit + integration) |
| **Deployment** | Sprint 22 (Vercel + Render + MongoDB Atlas + Redis Cloud) |

