# Pitfalls Research

**Domain:** Custom CRM — Gmail integration, Pipedrive bidirectional sync, AI email drafting, lead parsing
**Researched:** 2026-03-10
**Confidence:** HIGH (most pitfalls verified against official docs and multiple independent sources)

---

## Critical Pitfalls

### Pitfall 1: Google OAuth App in "Testing" Status Expires Refresh Tokens After 7 Days

**What goes wrong:**
The app runs fine during development but refresh tokens silently expire after 7 days in production. Every Monday the app stops being able to poll Gmail, requiring William to manually re-authorize. This is particularly insidious because it causes intermittent failures at OAuth boundaries rather than obvious startup errors.

**Why it happens:**
When a Google OAuth app's publishing status is set to "Testing" with user type "External", Google restricts refresh token lifetime to 7 days as a security policy. Many developers never change this status before shipping.

**How to avoid:**
Before deploying to production, change the Google Cloud Console OAuth app publishing status from "Testing" to "Production". This requires completing the OAuth verification process (or requesting an exception for internal-use apps). For a personal single-user app, request an internal app exception. Additionally: store any new refresh token Google returns on each refresh cycle (some API flows rotate them silently), and implement a refresh-before-expiry schedule so the token never sits idle for 6 consecutive months (which also triggers revocation).

**Warning signs:**
- App works perfectly in dev but authentication fails randomly in production
- Errors appear as `invalid_grant: Token has been expired or revoked`
- Failures happen exactly 7 days after last OAuth flow completion

**Phase to address:**
Phase 1 (Infrastructure / Gmail integration) — must be set correctly before any polling is implemented.

---

### Pitfall 2: Bidirectional Pipedrive Sync Creates Infinite Update Loops

**What goes wrong:**
The CRM writes a field to Pipedrive. Pipedrive's webhook fires and notifies the CRM of the change. The CRM processes the webhook and writes the field back to Pipedrive. The loop repeats forever, hammering the Pipedrive API until rate limits kick in and all syncing breaks.

**Why it happens:**
Developers implement "sync on change" in both directions without tracking the origin of each change. The CRM has no way to distinguish between changes it initiated versus changes William made in Pipedrive's own UI.

**How to avoid:**
Implement a "last_updated_by" origin field on every synced record. When the CRM writes to Pipedrive, tag the record with a sentinel value (e.g., `source: "weds-crm"`). When a webhook arrives, check whether the change source matches that sentinel — if yes, discard (it was our own write echoing back). Alternatively: hash the fields being synced and only forward changes where the hash has changed from the last-known value. For Pipedrive specifically, Webhooks v2 (now the default since March 2025) includes better change tracking metadata — use it.

**Warning signs:**
- Pipedrive API rate limit errors appearing immediately after normal syncs
- Database records toggling between two values repeatedly
- Webhook processing queue growing without bound

**Phase to address:**
Phase where Pipedrive bidirectional sync is implemented. This logic must be designed in from day one of sync — retrofitting loop prevention is expensive.

---

### Pitfall 3: Hardcoded Pipedrive Custom Field Keys Break Without Warning

**What goes wrong:**
The existing email-parser system already hardcodes Pipedrive custom field IDs (event date, message body, source, vCard URL, GPT prompt). If any custom field is deleted, renamed, or recreated in the Pipedrive UI, those 40-character hash keys change silently. The CRM writes data to the wrong field or drops it with no error — leads lose data permanently.

**Why it happens:**
Pipedrive custom fields use randomly generated 40-character hash keys (not human-readable names) as API keys. These are account-specific and not transferable. The existing code already suffers from this pattern and the new CRM risks inheriting it.

**How to avoid:**
On application startup, call the Pipedrive Fields API to resolve field names to their current keys, then cache the mapping in the database (not in code). If a field key can no longer be resolved by name, alert loudly (log + admin notification) rather than silently dropping data. Never commit field hash keys in source code. Document which Pipedrive fields the CRM depends on and treat that as a schema contract.

**Warning signs:**
- Leads in Pipedrive show empty event date or source fields after sync
- No API errors logged (the write succeeded — just to the wrong or nonexistent field)
- Discrepancy between CRM database values and Pipedrive deal view

**Phase to address:**
Phase 1 (Pipedrive sync foundation) — build the field resolution layer before implementing any field writes.

---

### Pitfall 4: Gmail historyId Gets Stale — Causes Missed or Duplicated Lead Emails

**What goes wrong:**
The polling loop stores a `historyId` to track which emails have been processed. If the service is down (Cloud Run scale-to-zero, deployment, crash) for an extended period, the stored `historyId` becomes invalid. The Gmail API returns HTTP 404 for stale history IDs. Without proper handling, either all emails since downtime are missed or the system re-processes previously seen emails and creates duplicate leads.

**Why it happens:**
Developers store a `historyId`, implement a polling loop, but don't handle the 404 "historyId out of range" error path. They test with a running service and never simulate an outage long enough to expire the history anchor.

**How to avoid:**
Implement explicit 404 handling: when `history.list` returns 404, trigger a full re-sync using `messages.list` with the appropriate date filter. Store a "last full sync" timestamp alongside the `historyId` so the full re-sync can be bounded. Before inserting any lead from re-sync, check for existing records with matching sender email or lead reference number (duplicate guard). Use Cloud Run's minimum instances setting to reduce scale-to-zero gaps.

**Warning signs:**
- `historyId` in the database is significantly lower than current Gmail history
- Leads appearing from dates weeks before the current date
- Missing leads after a service restart or redeployment

**Phase to address:**
Phase 1 (Gmail polling / lead ingestion) — the 404 fallback path must be implemented alongside the happy path, not added later.

---

### Pitfall 5: AI Draft Sends Client Names or Dates Hallucinated From Context

**What goes wrong:**
The AI generates an email draft that looks convincing but contains an incorrect event date, wrong venue name, or invented detail about the couple. William reviews and sends the draft without catching the error. The prospect receives a personalized email with wrong facts — immediate trust damage in an industry where attention to detail is a core selling point.

**Why it happens:**
LLMs hallucinate at measurable rates (3–17% depending on model and task type). When the prompt includes partial or ambiguous lead data, the model infers missing information rather than flagging uncertainty. The draft looks fluent and well-formatted, which makes human reviewers less vigilant (humans miss ~30–40% of subtle AI errors in fluent text).

**How to avoid:**
Design the prompt to only assert facts that exist as structured fields in the database. Never let the AI infer event dates, venue names, or budget numbers — extract these from the lead record and inject them as literal values in the prompt. Add a pre-send checklist in the UI that surface-highlights variable substitutions: "Date: [2024-09-14] — verify before sending". Use RAG-style injection (provide the full lead record as context) rather than relying on the model to remember facts from earlier in the conversation.

**Warning signs:**
- Draft emails reference event details not present in the lead record
- AI output contains plausible-sounding but unverifiable facts
- Drafts read as confident about information the lead email never provided

**Phase to address:**
Phase implementing AI email drafting — the variable injection contract and UI review workflow must be built alongside the AI integration, not after.

---

### Pitfall 6: Mariages.net Email Format Changes Break Lead Parsing Silently

**What goes wrong:**
Lead parsing works perfectly at launch. Mariages.net updates their notification email template months later — field order changes, a label is renamed, HTML structure changes. The parser continues to run without errors but extracts wrong values or empty strings. William unknowingly contacts leads with wrong names, wrong dates, or missing contact details.

**Why it happens:**
Regex-based and position-based parsers are brittle by design. They assume a fixed email template from a vendor the developer does not control. The failure mode is data corruption, not an exception — the code doesn't crash, it just quietly extracts garbage.

**How to avoid:**
Build the parser with explicit field validation gates: after extraction, assert that each required field (couple name, event date, contact email) is non-empty and plausible (date is a valid date, email contains @, name is not a number). If validation fails, do not insert the lead — instead, store the raw email in a quarantine table and send William an admin alert. This converts silent corruption into a loud recoverable error. Also: keep the original raw email body persisted on every lead record so a parser fix can re-parse historical data without data loss.

**Warning signs:**
- Lead records with empty name or date fields
- Leads with inverted name/venue fields
- Contact emails that look like phone numbers or street addresses

**Phase to address:**
Phase 1 (lead ingestion / email parsing) — validation and quarantine must be part of the initial parser implementation.

---

### Pitfall 7: OAuth Tokens Stored in Environment Variables on Cloud Run Are Leaked in Logs

**What goes wrong:**
The refresh token and access token are stored as Cloud Run environment variables. During debugging, a crash dumps the full environment to logs. GCP Cloud Logging retains these logs, potentially exposing long-lived Gmail access credentials.

**Why it happens:**
Environment variables are the fastest path to "it works." Developers intend to improve security later. For single-user personal tools, the risk feels academic — until a Google account gets accessed.

**How to avoid:**
From day one, store the OAuth refresh token in GCP Secret Manager and reference it via the Cloud Run secret mounting mechanism (not env vars). The token should be written to Secret Manager during the initial OAuth flow and read at runtime via the Secret Manager API or the mounted secret file path. This also makes token rotation straightforward without redeployment.

**Warning signs:**
- OAuth tokens appearing in application logs (search logs for `ya29.` which is the Google access token prefix)
- Refresh tokens in environment variable config visible in Cloud Run console

**Phase to address:**
Phase 1 (infrastructure setup) — Secret Manager integration should be provisioned before the first OAuth flow is completed.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcode Pipedrive field hash keys in source code | Faster initial integration | Silent data loss when field is changed in Pipedrive UI | Never — build field resolution layer from the start |
| Store OAuth tokens in env vars | Simple to prototype | Token leak via logs; no rotation path without redeployment | Never in production for a Gmail account |
| Re-use existing email-parser regex without validation layer | Saves rewrite time | Silent corruption on format change | Acceptable in Phase 1 if quarantine + alerts are added immediately |
| Skip loop prevention on Pipedrive sync initially | Faster to ship sync | Infinite update loops discovered only under real usage | Only if sync is initially one-directional (CRM → Pipedrive only) |
| Store raw email body only in Gmail, not DB | Saves storage | Cannot re-parse historical leads after parser fix | Never — always persist raw email body in the database |
| Let AI draft include inferred facts | Richer-sounding drafts | Wrong facts sent to clients; reputation damage | Never — only inject verified structured fields |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Gmail API | Assuming `historyId` is always valid; not handling 404 | Catch 404 on `history.list`, fall back to bounded `messages.list` re-sync |
| Gmail API | Using batch requests with more than 50 items | Cap batches at 50; implement exponential backoff on 429 responses |
| Gmail API | Publishing OAuth app as "Testing" in production | Set OAuth consent screen to "Production" before first production deployment |
| Pipedrive API | Using v1 webhooks (being deprecated in 2026) | Use Webhooks v2, which became the default in March 2025 |
| Pipedrive API | Writing custom fields by hardcoded hash key | Resolve field keys from name via Fields API at startup; cache the mapping |
| Pipedrive API | Processing your own webhook echoes | Tag outbound writes with a source marker; discard webhooks where source matches |
| OpenAI API | Injecting incomplete lead data and letting model infer the rest | Only inject fields that exist in the DB; block sends if required fields are empty |
| Twilio SMS | No retry or delivery status tracking | Implement webhook for delivery callbacks; log failures for admin review |
| GCP Secret Manager | Accessing secrets on every request | Cache secrets in-process at startup; re-fetch only on expiry or explicit refresh |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Polling Gmail `messages.list` for every new lead check instead of `history.list` | Rapid quota consumption; 429 errors; missed emails | Use incremental `history.list` from stored `historyId`; fall back to bounded `messages.list` only on error | Within days on active Gmail inbox |
| Fetching full message body for every email in a poll cycle | Slow polling loop; high API quota consumption | Fetch message headers first; only retrieve full body for Mariages.net sender | As inbox grows beyond ~50 emails/day |
| Synchronous Pipedrive API calls in webhook handler | Webhook timeout; Pipedrive retries; duplicate processing | Return 200 immediately; push work to background queue | Under normal load with any non-trivial processing |
| Calling OpenAI synchronously in the lead creation path | Slow lead ingestion; timeouts if OpenAI is slow | Generate AI drafts asynchronously; store lead first, then enqueue AI job | On any OpenAI service degradation |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Storing Gmail OAuth refresh token in plaintext in the database | Full Gmail access if DB is compromised | Encrypt at rest in Secret Manager; reference via mounted secret in Cloud Run |
| No per-lead audit log of who read/sent emails | Cannot investigate if a lead's data was mishandled | Add created_at, updated_at, and action logs to lead records from day one |
| Pipedrive API token in source code or `.env` committed to git | Pipedrive account takeover | Use GCP Secret Manager; add `.env` to `.gitignore` before first commit |
| Sending AI-drafted emails without explicit user confirmation step | Client receives incorrect or inappropriate content | Require explicit "Review and Send" action; never auto-send AI drafts |
| WhatsApp / Twilio credentials exposed in Cloud Run env vars | SMS/WhatsApp spam abuse | Store in Secret Manager; rotate credentials if any log exposure is suspected |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| AI draft is shown as final with no editing affordance | William sends wrong content; can't adjust tone | Always show AI draft in editable textarea; highlight variable substitutions visually |
| Lead status change in CRM syncs to Pipedrive with no confirmation | William makes a mistake; Pipedrive is wrong before he notices | Show "Syncing to Pipedrive..." toast with undo window (5 seconds) |
| Duplicate leads shown without merge path | Two lead records for same couple; split history | Show duplicate warning on lead creation with side-by-side merge UI |
| French UI strings hardcoded in component logic | Untestable copy; impossible to update without code changes | Use translation keys from the start even for a single-locale app |
| Email reply in CRM doesn't update Gmail thread context | William replies from CRM; Gmail shows a new thread; prospect sees conversation split | Always send via Gmail API `messages.send` with correct `threadId`; never use SMTP directly |

---

## "Looks Done But Isn't" Checklist

- [ ] **Gmail polling:** Verify the 404 historyId fallback is tested by manually deleting the stored historyId and running a poll cycle
- [ ] **Pipedrive sync:** Verify that a change made in Pipedrive UI triggers a webhook AND does not create an echo loop back to Pipedrive
- [ ] **OAuth flow:** Verify app is in Production status (not Testing) and that the refresh token persists correctly across Cloud Run restarts
- [ ] **Lead parser:** Verify that a malformed Mariages.net email (missing date, empty name) is quarantined — not inserted as an empty lead
- [ ] **AI drafts:** Verify that a lead with no event date produces a draft that does NOT contain an invented date
- [ ] **Email send:** Verify replies from CRM appear within the correct Gmail thread (same `threadId`), not as new conversations
- [ ] **Secret Manager:** Verify tokens are not visible in Cloud Run environment variable config or application logs (search logs for `ya29.`)
- [ ] **Duplicate detection:** Verify that submitting the same Mariages.net lead twice (same sender email) produces one lead, not two

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| OAuth token revoked in production | LOW (if raw emails persisted) | Re-run OAuth flow; poll missed period using messages.list with date filter; re-parse from raw email backlog |
| Infinite Pipedrive sync loop discovered | MEDIUM | Disable webhook listener; audit Pipedrive deals for corrupted data; implement loop prevention; re-enable |
| Hardcoded field key broke after Pipedrive field change | MEDIUM | Identify correct new field key via Fields API; update mapping; replay any failed syncs from DB audit log |
| historyId stale after extended downtime | LOW (if quarantine exists) | Reset historyId; trigger bounded full re-sync; quarantine duplicates for review |
| AI draft sent wrong facts to client | HIGH (reputation) | Immediate follow-up email from William acknowledging error; add pre-send confirmation UI immediately |
| Mariages.net format changed — bad leads inserted | MEDIUM | Add validation + quarantine retroactively; write migration to mark affected leads for manual review |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| OAuth app in Testing status | Phase 1: Infrastructure | Check Google Cloud Console OAuth consent screen shows "In production" |
| Gmail historyId staleness | Phase 1: Gmail polling | Integration test: simulate 404; verify fallback re-sync runs |
| Mariages.net format change breaks parser | Phase 1: Lead ingestion | Test with deliberately malformed email; verify quarantine fires |
| OAuth tokens in env vars | Phase 1: Infrastructure | grep Cloud Run config for token values; verify none present |
| Hardcoded Pipedrive field keys | Phase 2: Pipedrive sync | Temporarily rename a Pipedrive field; verify CRM logs alert, not silent drop |
| Bidirectional sync loop | Phase 2: Pipedrive sync | Make change in Pipedrive UI; verify webhook processed once, not recursively |
| AI draft with hallucinated facts | Phase 3: AI drafting | Test with lead missing event date; verify draft flags the gap rather than inventing |
| Email reply wrong threadId | Phase 2: Gmail inbox | Send reply from CRM; check Gmail thread — must show in same conversation |

---

## Sources

- [Google OAuth 2.0 official documentation](https://developers.google.com/identity/protocols/oauth2) — token expiry and revocation conditions
- [Nango Blog: Why Google OAuth invalid_grant happens](https://nango.dev/blog/google-oauth-invalid-grant-token-has-been-expired-or-revoked) — refresh token revocation scenarios (MEDIUM confidence)
- [Gmail API Usage Limits](https://developers.google.com/workspace/gmail/api/reference/quota) — quota and rate limit official reference
- [Gmail API Push Notifications guide](https://developers.google.com/workspace/gmail/api/guides/push?hl=en) — historyId behavior and fallback handling
- [Pipedrive Webhooks v2 announcement](https://developers.pipedrive.com/changelog/post/breaking-change-webhooks-v2-will-become-the-new-default-version) — v2 default March 2025, v1 deprecated 2026
- [Pipedrive Custom Fields API concepts](https://pipedrive.readme.io/docs/core-api-concepts-custom-fields) — 40-character hash key structure
- [Motii: 5 Common Pipedrive Integration Mistakes](https://www.motii.co/post/5-common-pipedrive-integration-mistakes-and-how-to-avoid-them) — data mapping and sync pitfalls (MEDIUM confidence)
- [Workato: Preventing Infinite Loops in Bidirectional Sync](https://www.workato.com/product-hub/how-to-prevent-infinite-loops-in-bi-directional-data-syncs/) — loop prevention techniques (MEDIUM confidence)
- [GCP Cloud Run Secrets documentation](https://docs.cloud.google.com/run/docs/configuring/services/secrets) — Secret Manager integration for Cloud Run
- [Nango Blog: Why OAuth is still hard in 2026](https://nango.dev/blog/why-is-oauth-still-hard) — token rotation and offline_access scope pitfalls (MEDIUM confidence)

---
*Pitfalls research for: weds-crm (custom wedding photography CRM — Gmail + Pipedrive + AI)*
*Researched: 2026-03-10*
