# Zillow Lead Ingestion Setup & Testing Plan

## Problem & Context
The user wants to test Zillow lead ingestion in the CRM app, noting that **Zillow does not offer direct webhook URL injection** in their Premier Agent app. 

### Why Zillow Doesn't Offer Custom Webhooks
In Zillow Premier Agent, agents cannot enter a custom webhook URL (unlike Stripe or GitHub). Zillow only offers:
1. **Email Notifications (ADF/XML & Text)**: Zillow sends an email to the agent's email address for every inquiry with buyer details, phone, email, and property info.
2. **Zapier Integration**: Zillow Premier Agent has an official Zapier integration that fires when a new lead is received.
3. **Zillow Tech Connect (Partner API)**: Restricted to certified enterprise CRM partners (e.g. Follow Up Boss, kvCORE, Salesforce).

### Current State of the App
PropPulse CRM already has a complete backend lead ingestion pipeline (`/api/leads/ingest`), deduplication, lead scoring, and routing engine. Furthermore, a frontend `WebhookTesterModal.tsx` already exists with a **Zillow preset payload** and HMAC SHA-256 calculation, but:
1. **The Webhook Tester is unmounted**: There is no button in `LeadSourcesTab.tsx` or `LeadIngestionPage.tsx` to open `WebhookTesterModal`.
2. **Strict HMAC-only auth**: Third-party webhook forwarders (like Zapier's free Webhook action or Make.com) cannot easily compute HMAC SHA-256 without a paid custom Code step. Supporting API key / Bearer authentication via the source's `webhookSecret` will make Zapier integration effortless.
3. **No CLI diagnostic test script**: Developers cannot test the full end-to-end ingestion pipeline directly from the terminal without manual browser clicking or manual HMAC hashing.

---

## User Review Required

> [!IMPORTANT]
> **How Real Zillow Leads Will Connect in Production:**
> Because Zillow does not allow custom webhook URLs, live leads in production will connect via one of two methods:
> 1. **Zapier Bridge (Recommended, Zero Code)**: Zillow Premier Agent $\to$ Zapier ("New Lead in Zillow") $\to$ PropPulse Ingest Webhook (`POST /api/leads/ingest?sourceId=...`).
> 2. **Email Forwarding (ADF/XML or Text)**: Zillow email notification $\to$ Inbound Email Parser (or IMAP inbox listener) $\to$ PropPulse Lead Ingestion.

---

## Proposed Changes

### 1. Ingestion Authentication Flexibility

#### [MODIFY] [lead.controller.ts](file:///c:/Users/lenovo/OneDrive/Desktop/Real%20estate%20CRM/real-estate-crm/server/src/features/leads/lead.controller.ts)
- Update `webhookIngestHandler` to accept either `x-webhook-signature` (HMAC SHA-256) OR an API key via `x-api-key` or `Authorization: Bearer <secret>`.
- This enables Zapier, Make.com, or test tools to dispatch leads without having to run a Node/Python crypto step.

#### [MODIFY] [lead.service.ts](file:///c:/Users/lenovo/OneDrive/Desktop/Real%20estate%20CRM/real-estate-crm/server/src/features/leads/lead.service.ts)
- Update `ingestWebhookLead` to accept `apiKey?: string`.
- Validate authenticity: match against `decryptedSecret` directly if `apiKey` is provided, or verify HMAC signature if `signature` is provided.

---

### 2. Frontend Simulator Integration

#### [MODIFY] [LeadSourcesTab.tsx](file:///c:/Users/lenovo/OneDrive/Desktop/Real%20estate%20CRM/real-estate-crm/src/pages/leads/components/LeadSourcesTab.tsx)
- Import `WebhookTesterModal`.
- Add a **"Test Simulator" / "Simulate Lead"** button:
  - In the top action bar next to "Connect Source".
  - On each lead source card (with Zillow preset automatically loaded).
  - In the action menu of each row/card.
- Display the API Key / Bearer token alternative alongside the HMAC secret in the "Credentials" modal so users know they can paste it directly into Zapier/Make.

#### [MODIFY] [WebhookTesterModal.tsx](file:///c:/Users/lenovo/OneDrive/Desktop/Real%20estate%20CRM/real-estate-crm/src/pages/leads/components/WebhookTesterModal.tsx)
- Accept an optional `initialSourceId` and `initialPreset` prop so clicking "Simulate" on the Zillow card opens the modal with Zillow ready to test.
- Ensure styling and theme match PropPulse CRM design system.

---

### 3. Developer Testing Script

#### [NEW] [testZillowLead.ts](file:///c:/Users/lenovo/OneDrive/Desktop/Real%20estate%20CRM/real-estate-crm/server/src/scripts/testZillowLead.ts)
- Create a runnable diagnostic script `npx tsx src/scripts/testZillowLead.ts` that:
  1. Connects to MongoDB.
  2. Finds or creates an active "Zillow" lead source for the brokerage.
  3. Dispatches a realistic Zillow Premier Agent payload with HMAC signature or API key to `http://localhost:5000/api/leads/ingest`.
  4. Verifies contact creation, lead score calculation, and agent assignment, and prints a formatted terminal report.

#### [MODIFY] [package.json](file:///c:/Users/lenovo/OneDrive/Desktop/Real%20estate%20CRM/real-estate-crm/server/package.json)
- Add `"test:zillow": "tsx src/scripts/testZillowLead.ts"` script.

---

## Verification Plan

### Automated / Diagnostic Test
1. Run `npx tsx src/scripts/testZillowLead.ts` against the running server.
2. Confirm HTTP 201 response with `contactId`, `isNew: true`, lead score, and assigned agent.
3. Test deduplication: run the script a second time with the same email/phone and confirm `isNew: false` (reinquiry recorded).

### Manual UI Verification
1. Navigate to `/leads/sources` (Lead Ingestion $\to$ Lead Sources).
2. Click **"Test Webhook"** on the Zillow card.
3. Verify the **Webhook & Ingestion Simulator** opens with Zillow selected.
4. Click **"Dispatch Test Payload"** and confirm:
   - Success toast.
   - Lead created in the Contacts list with source "Zillow".
   - Activity timeline logs the inbound lead touchpoint.
