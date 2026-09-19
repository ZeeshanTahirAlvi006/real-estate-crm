# Original User Request

## Initial Request — 2026-09-17T21:08:10+05:00

# Super Admin Cross-Brokerage Communication Restriction & Contact Data Masking

Implement strict multi-tenant boundary restrictions for Super Admins in PropPulse OS: allow Super Admin to contact only leads/contacts within their own assigned brokerage, display brokerage attribution beneath contact names for Super Admin, enforce phone and email masking on contacts from other brokerages, apply identical masking to audit logs and activity feeds, restrict CSV exports to own brokerage only, and make cross-brokerage contacts strictly read-only.

Working directory: c:/Users/lenovo/OneDrive/Desktop/Real estate CRM/real-estate-crm
Integrity mode: development

## Context & Architecture
- Frameworks & Stack: Node.js / Express / TypeScript backend (server/), React / Vite / TypeScript / Tailwind frontend (src/), MongoDB with Mongoose, Redis.
- Architectural Rules: Comply with .agents/rules (Compliance, Security, Architecture, Quality, Developer) and MERN Performance rules (MongoDB uncached <10ms, covered indexes, no COLLSCAN, lean mutation guard, zero memory leaks, Redis cached <1ms).

## Requirements

### R1. Super Admin Brokerage-Bound Communication & Call Restriction
- Super Admin can initiate calls, WhatsApp chats, SMS messages, and emails ONLY to contacts belonging to the Super Admin's own assigned brokerage (req.user.brokerageId).
- If Super Admin has no assigned brokerage (brokerageId is null/undefined), all contacts across all brokerages are non-contactable.
- Any attempt by a Super Admin to send messages, trigger calls, or initiate communication to a contact outside their assigned brokerage must be rejected at the API level with 403 Forbidden.
- In the frontend (Contacts Table, Grid, Kanban, Detail Drawer/Page, Inbox, Dialer), all outbound action buttons (Call, WhatsApp, Send Message, Email, Share Portal) must be hidden or disabled with a tooltip indicating cross-brokerage restriction when viewing contacts from other brokerages.

### R2. Contact Brokerage Attribution (UI & API)
- Ensure the backend includes brokerageId and resolved brokerageName in ContactResponseDto.
- In the frontend, display the brokerage name as a subtle subtitle or pill badge directly beneath the contact's name in both list (table, grid, kanban) and detail/drawer views.
- This brokerage badge must be visible ONLY to Super Admins (omitted for other roles since they are single-brokerage scoped). Do not add a dedicated separate table column.

### R3. Cross-Brokerage Contact Masking & Read-Only Enforcement
- When a Super Admin views contacts belonging to another brokerage:
  - Phone numbers (primary and secondary) must be masked preserving the first 3 characters and the last 2 digits with asterisks in the middle (e.g., +92 3******67 or +92 x********x pattern).
  - Email addresses must be masked (e.g. j***@domain.com).
  - Raw unmasked phone numbers and emails must NEVER be sent over the wire in API responses to cross-brokerage Super Admins.
- Cross-brokerage contacts must be strictly READ-ONLY for Super Admin:
  - Super Admin cannot Edit, Delete, or Add Notes to contacts belonging to other brokerages (API guards return 403 Forbidden; frontend Edit/Delete/Add Note buttons hidden/disabled).

### R4. Audit Logs & Activity Stream Redaction
- Apply identical privacy masking to Audit Logs (/api/audit-logs) and Activity Streams (/api/contacts/:id/activities, dashboard activity feeds, system logs):
  - In event descriptions, details JSON, and metadata belonging to other brokerages, any phone numbers must be regex-masked (e.g., +92 3******67) and emails masked.
  - Preserve operational context (action type, timestamp, role, resource type) while obscuring direct contact identifiers.

### R5. CSV Export Privacy Restriction
- When a Super Admin exports contacts to CSV, contacts belonging to other brokerages must be excluded entirely from the export (only contacts from the Super Admin's assigned brokerage can be exported). If the Super Admin has no assigned brokerage, export is disabled or returns an empty list.

## Acceptance Criteria

### Security & Access Control
- [ ] Attempting to send unified messages (/api/communication/send), WhatsApp messages, or dialer calls to a cross-brokerage contact returns HTTP 403 Forbidden for Super Admin.
- [ ] Super Admin can successfully send messages and calls to contacts belonging to their own brokerage (req.user.brokerageId).
- [ ] Attempting to update (PATCH/PUT /api/contacts/:id), delete (DELETE /api/contacts/:id), or add notes to a cross-brokerage contact returns HTTP 403 Forbidden.

### Data Masking & Attribution
- [ ] Contacts API responses returned to a Super Admin for other brokerages have phone numbers masked (+92 3******67) and emails masked (j***@domain.com) before leaving the server.
- [ ] Contacts UI displays the brokerage name as a subtitle/badge below contact names exclusively for Super Admin users.
- [ ] Outbound communication buttons (Call, WhatsApp, SMS, Portal invite) are disabled/hidden for cross-brokerage contacts.
- [ ] Audit logs and activity feed items for cross-brokerage entities have phone numbers and emails masked in descriptions and details payloads.
- [ ] CSV export initiated by Super Admin contains only contacts from their own brokerage.

### Performance & Quality Standards (.agents/rules & user rules)
- [ ] All database queries remain covered by indexes or efficient indexes; no unindexed collection scans introduced.
- [ ] No Mongoose instance methods called on .lean() objects (Rule DI-002).
- [ ] Redis cache operations wrapped in try/catch fallback (Rule DI-003).
- [ ] High-resolution timers or performance logs verify uncached MongoDB queries execute within performance budgets.
- [ ] TypeScript compilation (tsc --noEmit) passes cleanly with zero errors on both backend and frontend.
