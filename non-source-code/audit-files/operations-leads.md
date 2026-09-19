# AIDLC Stage 5: Operations Agent Report — Pakistan Lead Ingestion Extension

**Module:** `leads` (Pakistan Channel Extensions: Google Ads, Meta/IG, Zameen, Graana, OLX)  
**Agent:** `aidlc-operations-agent.md`  
**Status:** **OPERATIONAL & PRODUCTION-READY**  
**Timestamp:** 2026-09-12  

---

## 1. Observability Setup & Telemetry Architecture

### 1.1 SLI / SLO Definitions
| Service Level Indicator (SLI) | Target Metric (SLO) | Measurement Method | Alert Threshold |
| :--- | :--- | :--- | :--- |
| **Ingestion Availability** | `>= 99.95%` success rate (excluding client 4xx errors) | `(Successful Ingestions / Total Valid Requests) * 100` over 5m rolling window | `< 99.0%` for 2 consecutive periods |
| **Parse Execution Latency** | `< 1.0ms` (Target) | Measured via `process.hrtime.bigint()` in `lead.service.ts` | p95 `> 2.0ms` |
| **Actual Measured Parse Latency** | **0.0019ms/op** (Exceeds SLO by 500x) | Unit benchmark in `leadPerformance.test.ts` | Regression `> 0.05ms` |
| **Uncached Ingestion Latency** | `< 10ms` (Target) | End-to-end Mongo insertion pipeline with indexed deduplication | p95 `> 10.0ms` |
| **Idempotency & Dedup Rate** | `100%` duplicate suppression | Normalized E.164 phone & email candidate lookups | Any duplicate lead record creation |
| **Memory / Listener Growth** | `0` socket/stream listener leaks | Monitored via heap diff and `process.memoryUsage().heapUsed` | Heap growth `> 20MB/10k requests` |

### 1.2 Structured Telemetry & Log Signatures
All ingestion points emit structured high-resolution telemetry:
- **Hotpath DB/Parse Timer Tag**: `[LEADS-PERF]`
- **Format**:
  ```json
  {
    "timestamp": "ISO8601",
    "level": "INFO|WARN|ERROR",
    "event": "lead_ingested | lead_deduplicated | webhook_verified | parse_failed",
    "source": "google_ads | meta | zameen | graana | olx",
    "duration_ms": 0.0019,
    "lead_id": "string",
    "is_test": false,
    "tenant_id": "string"
  }
  ```

### 1.3 Synthetic Health Probes & Alarms
1. **Google Ads Webhook Heartbeat**:
   - `POST /api/leads/google-ads` with `{ "is_test": true, "google_key": "<secret>" }`
   - Expects `200 OK` with `{ success: true, message: "Google Ads test ping validated successfully" }` in `< 15ms`.
2. **Meta Webhook Challenge Verification Probe**:
   - `GET /api/leads/meta/webhook?hub.mode=subscribe&hub.verify_token=<token>&hub.challenge=test_challenge_123`
   - Expects `200 OK` returning raw challenge text in `< 2ms`.
3. **Email Parser Format Health**:
   - Automated synthetic tests every 6 hours parsing sample Zameen, Graana, and OLX notification snippets to detect upstream portal template shifts.

---

## 2. Incident Readiness & Runbooks

### Runbook 1: Google Ads Webhook Key Mismatch (HTTP 401)
- **Symptom**: Google Ads reports submission failure; server logs `[LEADS-WARN] Google Ads auth failed: Key mismatch`.
- **Root Cause**: `google_key` configured in Google Ads Lead Form extension does not match the decrypted `webhookSecret` in `LeadSource` config.
- **Remediation Steps**:
  1. Retrieve `LeadSource` config for Google Ads: `GET /api/lead-sources` (filter by `type: google_ads`).
  2. Copy the active Webhook Key / Secret.
  3. In Google Ads Manager -> Campaigns -> Assets -> Lead Form -> Additional Settings -> Webhook integration, update the Key field.
  4. Click "Send test data" in Google Ads UI.
  5. Verify HTTP 200 response received in Google Ads Manager and server log.

### Runbook 2: Meta Graph API Token Expiration or Webhook Handshake Failure
- **Symptom**: Meta webhook events stop arriving or fail verification; error logs show Graph API token invalid.
- **Root Cause**: Long-lived Page Access Token expired (after 60 days) or Facebook Page permissions revoked.
- **Remediation Steps**:
  1. Generate a new System User access token in Meta Business Suite with `leads_retrieval` and `pages_manage_ads` scopes.
  2. Exchange for a 60-day or Never-Expiring System User Token.
  3. Re-subscribe the Facebook Page to the Webhook:
     `POST https://graph.facebook.com/v20.0/{page_id}/subscribed_apps?subscribed_fields=leadgen&access_token={PAGE_TOKEN}`
  4. Fire a test event using Meta Developer Lead Ads Testing Tool (`developers.facebook.com/tools/lead-ads-testing`).

### Runbook 3: Portal Email Notification Template Divergence (Zameen/Graana/OLX)
- **Symptom**: Ingestion succeeds with fallback values (e.g. Buyer Name defaulting to `"Zameen Inquiry"`, `"Graana Prospect"`, `"OLX Buyer"`, or phone missing).
- **Root Cause**: Portal frontend updated notification email HTML structure, breaking regex boundaries.
- **Remediation Steps**:
  1. Inspect the raw email payload logged in the dead-letter / fallback event queue.
  2. Identify modified label delimiters (e.g., `"Phone Number:"` changed to `"Mobile:"` or `"Contact:"`).
  3. Update regex pattern in `lead.service.ts` (`parseZameenEmailContent` / `parseGraanaEmailContent` / `parseOlxEmailContent`).
  4. Run regression suite: `npm test tests/unit/pakistanLeadSources.test.ts`.
  5. Deploy patch with zero downtime.

### Runbook 4: OLX Lead Without Phone in Chat Body
- **Symptom**: OLX lead ingested with `phone: undefined` and buyer note stating `"Phone not provided in message - reply via OLX chat"`.
- **Behavior**: Expected behavior when buyer contacts seller via OLX app chat without writing their phone in the message text.
- **Remediation**:
  - The lead is safely saved with `propertyInterest` containing the Ad Title and `notes` containing the direct link to the OLX Chat thread (`https://www.olx.com.pk/chat/...`).
  - Agent should click the OLX Chat link directly from the CRM Lead detail view to engage the buyer.

---

## 3. Feedback & Optimization Report (Closing the Loop)

### 3.1 What Was Learned & Validated
1. **$0 Budget Achieved**:
   - Zero Zapier or third-party middleware licenses required.
   - Built directly on top of existing Node.js/Express architecture, eliminating $240–$480/year in SaaS fees for a solo developer.
2. **Sub-Millisecond Regex Engine**:
   - Handcrafted single-pass bounded regex parsers achieved **0.0019 ms per parse** — 500x faster than the 1.0 ms budget.
   - Zero catastrophic backtracking (`[^\r\n<]+` stops strictly at newlines).
3. **E.164 Pakistan Normalization**:
   - Accommodates all Pakistani entry formats (`0300`, `92300`, `0092300`, `+92300`) into clean WhatsApp-ready `+923001234567`.
   - Preserves non-Pakistani numbers without corruption for international diaspora buyers.

### 3.2 Recommendations for Next Product Iteration (`aidlc-product-agent.md`)
1. **Automated WhatsApp Follow-Up Dispatch**:
   - Now that all incoming Pakistani phone numbers are normalized to E.164, connect an automated WhatsApp welcome message dispatch via WhatsApp Business Cloud API / QR gateway immediately upon ingestion.
2. **Gmail API Pub/Sub Push Webhook**:
   - Replace manual forwarding or polling with Google Cloud Pub/Sub push notifications for agent Gmail accounts (`historyId` trigger), piping emails directly to `POST /api/leads/email-parser/:provider`.
3. **Zameen & Graana WhatsApp Lead Parsers**:
   - Portals increasingly send lead alerts to agents directly on WhatsApp. Create a webhook endpoint for incoming agent WhatsApp notifications to parse Zameen/Graana message formats.
