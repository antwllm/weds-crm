---
status: complete
phase: 01-foundation-and-automation-core
source: [01-01-SUMMARY.md, 01-02-SUMMARY.md, 01-03-SUMMARY.md, 01-04-SUMMARY.md, 01-05-SUMMARY.md]
started: 2026-03-10T09:30:00Z
updated: 2026-03-10T14:50:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: `docker compose up --build` builds both images and starts PostgreSQL + app. App logs show startup without errors. GET http://localhost:8082/health returns `{"status":"ok","timestamp":"..."}`.
result: pass

### 2. Google OAuth Login Flow
expected: Visit http://localhost:8082/ in browser. Should redirect to Google OAuth consent screen. After login with contact@weds.fr, should redirect back to the app. Terminal logs show "Scheduler demarre" and "Connexion reussie".
result: pass

### 3. OAuth Token Persistence After Restart
expected: Stop the app (docker compose restart). Start it again. Terminal logs should show "Tokens restaures depuis la base de donnees" — NOT "En attente d'authentification". No re-login required.
result: pass

### 4. Pipeline End-to-End
expected: Send a Mariages.net-format test email to your Gmail. Label it `weds-crm/pending` (or wait for Pub/Sub). Within 30 seconds or next cron sweep: lead appears in database, vCard uploaded to GCS bucket, terminal logs show pipeline processing steps.
result: skipped
reason: Requires GCP Pub/Sub topic and GCS bucket configuration

### 5. SMS Delivery (Twilio + Free Mobile)
expected: After pipeline processes a lead: Twilio SMS arrives on prospect phone with personalized French message. Free Mobile SMS arrives on your phone (William) with lead summary and vCard download link.
result: skipped
reason: Requires Twilio account and pipeline end-to-end (test 4)

### 6. Email Recap
expected: After pipeline processes a lead: email recap arrives at contact@weds.fr with vCard file as attachment and lead details in body.
result: skipped
reason: Requires pipeline end-to-end (test 4)

### 7. Duplicate Detection
expected: Process the same Mariages.net email again (re-label as weds-crm/pending). No new lead created — logs show "Doublon detecte" or similar. Activity logged on existing lead. No duplicate notifications sent.
result: skipped
reason: Requires pipeline end-to-end (test 4)

### 8. Free Mobile SMS API Test
expected: curl SMS API — receive SMS on phone with "Test Weds CRM".
result: pass

## Summary

total: 8
passed: 4
issues: 0
pending: 0
skipped: 4

## Gaps

[none — skipped tests are infrastructure dependencies, not code gaps]
