## 2026-09-17T16:09:51Z

Task: Survey Backend Communication & Mutation Gateways for Super Admin Multi-Tenant Restriction.

Read ORIGINAL_REQUEST.md carefully.
Investigate the backend (server/ directory) to map:
1. Communication Routes & Handlers:
   - Unified communication endpoints (e.g., /api/communication/send or similar)
   - WhatsApp endpoints, controllers, and services
   - Dialer/Twilio/Call endpoints, controllers, and services
   - SMS and Email dispatch routes/services
2. Contact Mutation Endpoints:
   - PATCH / PUT /api/contacts/:id
   - DELETE /api/contacts/:id
   - Notes endpoints (e.g. /api/contacts/:id/notes or notes controllers)
3. Auth & Authorization Context:
   - Existing auth middleware (authenticate, requireRole, req.user)
   - How req.user.brokerageId is populated and handled for Super Admin
   - How Contact schema references brokerageId (and how null/unassigned brokerage is represented)
4. Multi-Tenant Boundary Enforcement Design:
   - How to intercept cross-brokerage communication and return 403 Forbidden
   - Handling null/undefined brokerageId (if Super Admin has no assigned brokerage, all contacts are non-contactable)
   - Read-only enforcement for cross-brokerage contacts (403 on edit/delete/add note)
5. MERN Performance & Rule Compliance:
   - Rules DI-001..004, ML-001..004, PERF-M-001..004, PERF-R-001..004
   - Ensure lean() queries do not call Mongoose document methods, cache fallbacks are present, queries use covered indexes.

Write your comprehensive findings and implementation strategy to:
c:\Users\lenovo\OneDrive\Desktop\Real estate CRM\real-estate-crm\.agents\explorer_survey_1\handoff.md
Send a completion message back when done.
