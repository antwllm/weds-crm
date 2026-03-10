# Feature Research

**Domain:** Solo / small-business CRM with integrated email client, pipeline management, and AI email drafting — specialised for wedding photography lead management
**Researched:** 2026-03-10
**Confidence:** HIGH (table stakes), MEDIUM (differentiators — based on verified competitor analysis + WebSearch)

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features that every CRM with email integration must have. Missing any of these means the product feels broken or incomplete relative to what William already does manually with Pipedrive + Gmail.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Lead record CRUD (create, read, update, delete) | Core CRM primitive — without it there's no product | LOW | Name, email, phone, event date, source, status, notes |
| Lead list view with filters | Users need to find leads quickly; Pipedrive provides this today | LOW | Filter by status, date range, source |
| Kanban pipeline board | Standard in every modern CRM; drag-and-drop status changes | MEDIUM | Custom stages per workflow; Pipedrive sets this expectation |
| Gmail bidirectional email sync | The raison d'être of the project — replaces Gmail tab switching | HIGH | Requires Gmail OAuth; link emails to lead records automatically |
| Send email from within CRM | Users won't switch back to Gmail to reply if CRM shows inbox | MEDIUM | Compose, reply, reply-all, thread view |
| Email threading / conversation view | All modern email clients show threaded conversations | MEDIUM | Group by thread, not individual message |
| Email-to-lead linking | Every email from a known contact must surface on the lead record | MEDIUM | Auto-link by sender email address; manual override |
| Email templates with variable substitution | Saves time on repetitive inquiry responses; industry standard | LOW | Variables: {{nom}}, {{date_evenement}}, {{lieu}}, etc. |
| Lead status management | Must be able to mark leads as new / contacted / qualified / booked / closed | LOW | Customisable labels; Pipedrive parity |
| Notes on lead records | Basic context capture; every CRM has this | LOW | Free text, timestamped |
| Activity / interaction history | Chronological log of all emails, notes, status changes per lead | MEDIUM | Audit trail; required to replace Pipedrive reliably |
| Duplicate detection on lead creation | Mariages.net sends duplicate inquiries; already in current workflow | MEDIUM | Match on email + phone; fuzzy name matching for edge cases |
| Search across leads and emails | User must find any lead by name, date, or keyword | MEDIUM | Full-text search on lead fields + email body |
| SMS outbound (prospects via Twilio) | Current system sends SMS; removing it is a regression | LOW | Twilio API; templated messages |
| Admin SMS notifications (Free Mobile) | Current system notifies William on new leads; must be preserved | LOW | Free Mobile HTTP API; very simple |
| Email recap notifications | Current system sends recaps to contact@weds.fr; must be preserved | LOW | Triggered on new lead + status changes |
| Pipedrive bidirectional sync | V1 constraint — Pipedrive remains source of truth during migration | HIGH | Sync deals, contacts, custom fields; conflict resolution strategy needed |
| Responsive web UI (mobile-usable) | William needs to act on leads from phone | MEDIUM | Not a native app, but layout must work on mobile |
| Google OAuth login | All Google API access requires OAuth; single user only | LOW | gmail.modify + drive + documents.readonly scopes |

### Differentiators (Competitive Advantage)

Features that go beyond what generic CRMs offer and that are specific to the weds.fr workflow. These turn the tool from "a Pipedrive clone" into something genuinely better for this use case.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| AI email draft generation from lead context | Core value-add: generates a personalised reply using event date, location, couple names, tone — removes blank-page friction | HIGH | Uses OpenAI / Claude API; pulls lead fields as context for the prompt |
| Draft review and edit workflow | AI-generated draft must be reviewable before sending — prevents embarrassing mistakes | MEDIUM | "Draft" status, inline editing, send / discard actions |
| Mariages.net email parser | Automatically extracts structured lead data from inbound Mariages.net emails | HIGH | Regex + LLM fallback; source-specific field mapping |
| vCard generation and storage | Generates contact vCard for each lead and stores URL (currently in Google Drive) | LOW | Parity with current workflow; simple to implement |
| WhatsApp messaging to prospects | Beyond SMS — WhatsApp is the preferred channel for French wedding clients | HIGH | WhatsApp Business API or Twilio WhatsApp; requires approved templates |
| GPT prompt template management | Store and edit the AI system prompt in-app instead of a Google Doc | LOW | Single editable text field; replaces current Google Docs dependency |
| Source-tagged leads (Mariages.net badge) | Makes source provenance visible at a glance — useful as more sources are added later | LOW | Label / badge on lead card |
| Lead capture from email polling (no manual entry) | All current Mariages.net leads arrive via email — zero manual data entry is the differentiator | MEDIUM | Gmail polling on interval; parse and upsert |
| French-language UI throughout | The entire product is in French — no translation friction for William | LOW | All labels, notifications, emails in French; use French locale for dates |
| Inline email label management (Gmail labels) | Apply Gmail labels from within the CRM to keep Gmail organised in sync | MEDIUM | Gmail API label operations |

### Anti-Features (Commonly Requested, Often Problematic)

Features that might seem useful but would harm the project's focus, add disproportionate complexity, or are explicitly out of scope.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Multi-user / team access | Every CRM has it | William is the only user; RBAC adds schema complexity with zero benefit in V1 | Leave auth as single-user; revisit only if business grows |
| Calendar / booking integration | Photographers need to manage availability | Deep two-way calendar sync (Google Calendar, Calendly) is a product in itself; blocks V1 | Store event date as a field on lead; add calendar view in V2+ |
| Invoicing and payment collection | HoneyBook and Dubsado do this; photographers expect it | Out of explicit scope; separate accounting tool (Stripe, QuickBooks) handles this better | Link to external invoice tool if needed |
| Mobile native app | Better UX on phone | Web-responsive is sufficient for single-user; native app doubles maintenance burden | Responsive PWA |
| Real-time chat / live messaging with prospects | Some CRMs offer chat widgets | Prospects come through Mariages.net, not a chat widget; adds infrastructure (WebSockets, presence) for no gain | WhatsApp async messaging is sufficient |
| Email marketing campaigns / bulk sends | CRMs like Mailchimp-integrated tools offer this | Wedding photography is high-touch, 1:1 — bulk email is off-brand and irrelevant | Individual templated emails per lead |
| AI-generated contract drafting | Emerging AI feature in photography CRMs | Legal document generation is high-risk; requires legal review; out of scope | Use a separate contract tool (Docusign, Dubsado contract templates) |
| Multi-source lead capture (Instagram DMs, Google Ads, etc.) | More sources = more leads | Explicitly deferred to V2; parser complexity multiplies with each source | Single-source (Mariages.net) in V1; design parser as pluggable for V2 |
| Automatic email sending without review | Fully automated replies to leads | AI drafts must be reviewed; sending without approval risks sending wrong content to clients | Draft-first workflow: AI drafts, human approves, human sends |
| Offline / PWA mode | Nice on mobile | Single-user tool; connectivity is expected; offline sync adds complexity with no payoff | Standard web app; fast load is enough |

---

## Feature Dependencies

```
[Gmail OAuth setup]
    └──required by──> [Gmail bidirectional sync]
                          └──required by──> [Email-to-lead linking]
                          └──required by──> [Send email from CRM]
                          └──required by──> [Mariages.net email parser / lead polling]
                          └──required by──> [Inline Gmail label management]

[Lead record CRUD]
    └──required by──> [Kanban pipeline board]
    └──required by──> [Lead list with filters]
    └──required by──> [Activity / interaction history]
    └──required by──> [Duplicate detection]
    └──required by──> [AI email draft generation]

[Email templates]
    └──enhances──> [AI email draft generation]
    └──enhances──> [Send email from CRM]

[AI email draft generation]
    └──required by──> [Draft review and edit workflow]

[Pipedrive sync]
    └──requires──> [Lead record CRUD]
    └──requires──> [Lead status management]

[Twilio SMS]
    └──requires──> [Lead record CRUD] (needs phone number)

[WhatsApp messaging]
    └──requires──> [Lead record CRUD]
    └──conflicts──> [Real-time chat] (WhatsApp is async, not a live chat widget)

[vCard generation]
    └──requires──> [Lead record CRUD]
    └──enhances──> [Pipedrive sync] (vCard URL stored as Pipedrive custom field)

[Duplicate detection]
    └──required by──> [Mariages.net email parser] (parser runs dedup before creating lead)
```

### Dependency Notes

- **Gmail OAuth required by everything email-related:** The entire inbox integration, lead parser, and email send/receive flow depends on a working OAuth token. This must be Phase 1 infrastructure.
- **Lead CRUD required by almost everything:** No feature can exist without the core data model. Lead schema must be finalised early.
- **AI draft requires lead context:** The AI prompt is only useful when it can pull event date, couple names, location, and message body from an existing lead record. Draft generation cannot be built before lead data exists.
- **Duplicate detection required by parser:** The Mariages.net parser must run dedup before inserting — if dedup is not in place, re-processing old emails creates phantom duplicates.
- **Pipedrive sync conflicts with single source of truth:** During V1, Pipedrive is source of truth. Bidirectional sync means any local write must be reflected in Pipedrive and vice versa. This creates a conflict-resolution problem that must be designed explicitly.
- **WhatsApp does not conflict with SMS:** Both channels coexist. SMS (Twilio) for automated alerts, WhatsApp for richer prospect communication.

---

## MVP Definition

### Launch With (v1)

The minimum needed to fully replace the existing email-parser system and provide a usable inbox + pipeline in one place.

- [ ] Google OAuth login + Gmail API connection — without this nothing works
- [ ] Mariages.net email polling and lead parsing — replaces the current automation
- [ ] Duplicate detection on lead creation — preserves current data quality guarantee
- [ ] Lead record CRUD with all current Pipedrive fields — no data loss vs. current workflow
- [ ] Lead list view + Kanban pipeline board — replaces Pipedrive UI
- [ ] Lead status management with custom stages — parity with Pipedrive pipeline
- [ ] Pipedrive bidirectional sync — safety net during transition; Pipedrive remains usable
- [ ] Integrated Gmail inbox: read threads, link to leads — core inbox integration
- [ ] Send email from CRM (reply to lead thread) — closes the "switching to Gmail" problem
- [ ] Email templates with variable substitution — replaces manual copy-paste
- [ ] AI email draft generation from lead context — primary differentiator
- [ ] Draft review + edit + send workflow — required for AI drafts to be trustworthy
- [ ] SMS to prospects via Twilio — current system feature; must not regress
- [ ] Admin SMS notification via Free Mobile — current system feature; must not regress
- [ ] Email recap notifications — current system feature; must not regress
- [ ] Activity / interaction history per lead — required for audit trail
- [ ] vCard generation and storage — parity with current workflow
- [ ] French-language UI throughout — non-negotiable given user context

### Add After Validation (v1.x)

Once the V1 workflow is stable and William is using it daily:

- [ ] WhatsApp messaging to prospects — depends on WhatsApp Business API approval timeline; high value but gated by external approval
- [ ] Inline Gmail label management — quality-of-life; Gmail organisation synced to CRM
- [ ] GPT prompt template management in-app — currently a Google Doc; useful to bring in-app but not blocking
- [ ] Search across leads and emails — important but workaroundable with list filters in V1
- [ ] Notes improvements (rich text, pinned notes) — LOW priority until base notes are validated

### Future Consideration (v2+)

Defer until V1 is validated and stable:

- [ ] Multi-source lead capture — adds parser complexity; Mariages.net is the only source worth building for now
- [ ] Calendar / availability view — significant scope; booking and availability management is a product on its own
- [ ] Analytics / reporting dashboard — booking rate, response time, conversion funnel — valuable but not needed to operate the business
- [ ] AI-powered follow-up reminders — "Lead has not been replied to in 48h" alerts — possible once activity history is solid

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Gmail OAuth + API connection | HIGH | LOW | P1 |
| Mariages.net email parser | HIGH | MEDIUM | P1 |
| Lead CRUD + data model | HIGH | LOW | P1 |
| Duplicate detection | HIGH | MEDIUM | P1 |
| Kanban pipeline board | HIGH | MEDIUM | P1 |
| Pipedrive bidirectional sync | HIGH | HIGH | P1 |
| Gmail inbox (read + thread view) | HIGH | HIGH | P1 |
| Send email from CRM | HIGH | MEDIUM | P1 |
| Email templates | HIGH | LOW | P1 |
| AI email draft generation | HIGH | MEDIUM | P1 |
| Draft review / edit / send | HIGH | LOW | P1 |
| SMS (Twilio + Free Mobile) | MEDIUM | LOW | P1 |
| Email recap notifications | MEDIUM | LOW | P1 |
| Activity / interaction history | HIGH | MEDIUM | P1 |
| vCard generation | LOW | LOW | P1 |
| French-language UI | HIGH | LOW | P1 |
| WhatsApp messaging | MEDIUM | HIGH | P2 |
| Gmail label management | MEDIUM | MEDIUM | P2 |
| GPT prompt template management | LOW | LOW | P2 |
| Search across leads/emails | HIGH | MEDIUM | P2 |
| Analytics / reporting | MEDIUM | HIGH | P3 |
| Multi-source lead capture | HIGH | HIGH | P3 |
| Calendar / availability view | MEDIUM | HIGH | P3 |

**Priority key:**
- P1: Must have for launch — replaces existing system without regression
- P2: Add in v1.x after core is validated
- P3: Future consideration — v2+

---

## Competitor Feature Analysis

Competitors studied: HoneyBook, Dubsado, Studio Ninja, Pipedrive (current tool), Sprout Studio, NetHunt CRM.

| Feature | HoneyBook | Dubsado | Pipedrive | Our Approach |
|---------|-----------|---------|-----------|--------------|
| Pipeline / Kanban | Fixed stages, not fully customisable | Fully customisable stages + filters | Fully customisable Kanban | Custom stages per William's workflow |
| Email integration | Basic email threading in project view | No native inbox; client portal only | Gmail/Outlook bidirectional sync | Full Gmail inbox embedded in CRM |
| AI email drafting | AI writing assistant (brand voice) | None | AI suggested replies (higher plans) | Lead-context-aware drafts via OpenAI/Claude; tuned for wedding photography tone |
| Email templates | Yes, with variables | Yes, with variables | Yes, basic | Yes, in French, photography-specific variables |
| Lead capture automation | Zapier / forms only | Custom forms + Cflow triggers | Email parsing (manual setup) | Automatic Gmail polling, no manual step |
| SMS notifications | No | No | No (via Zapier) | Native Twilio + Free Mobile |
| WhatsApp | No | No | No (via integration) | Native WhatsApp Business API (v1.x) |
| Duplicate detection | Basic | Basic | Manual merge | Pre-insert fuzzy match on email + phone |
| Invoicing / contracts | Yes (core feature) | Yes (core feature) | No | Deliberately excluded |
| Multi-user | Yes | Yes | Yes | Single-user only — no overhead |
| French UI | No | No | Yes (localised) | Yes, native French throughout |
| Photography-specific fields | Yes (galleries, shoots) | Some | No | Event date, venue, message, source, vCard |

---

## Sources

- [Best CRM for Photographers in 2026 — Aftershoot](https://aftershoot.com/blog/crm-for-photographers/)
- [HoneyBook vs Dubsado — Bloom](https://blog.bloom.io/honeybook-vs-dubsado/)
- [Dubsado vs HoneyBook — HoneyBook official](https://www.honeybook.com/blog/dubsado-vs-honeybook)
- [Best CRMs for Photographers 2025 — Sprout Studio](https://getsproutstudio.com/edu/uncategorized/best-crms-for-photographers-in-august-2025-updated/)
- [33 CRM Features Your Small Business Needs in 2026 — OnePage CRM](https://www.onepagecrm.com/blog/crm-features/)
- [Best CRM for Gmail (13 tools) — EmailAnalytics](https://emailanalytics.com/crms-for-gmail/)
- [NetHunt CRM — Best Gmail-native CRM](https://nethunt.com/blog/best-crm-for-gmail/)
- [Pipedrive Gmail Integration Guide — Skyvia](https://blog.skyvia.com/pipedrive-integration-with-gmail/)
- [Pipedrive email sync official docs](https://support.pipedrive.com/en/article/email-sync)
- [AI Email Assistant 2026 Guide — Jenova AI](https://www.jenova.ai/en/resources/ai-email-assistant)
- [CRM Deduplication Guide 2025 — RT Dynamic](https://www.rtdynamic.com/blog/crm-deduplication-guide-2025/)
- [CRM Trends Shaping 2026 — CRM Software Blog / Dynamics 365](https://www.crmsoftwareblog.com/2025/12/crm-trends/)
- [Best AI-Powered CRM Software 2026 — Monday.com](https://monday.com/blog/crm-and-sales/crm-with-ai/)

---

*Feature research for: Solo wedding photography CRM with integrated Gmail inbox, pipeline management, and AI email drafting*
*Researched: 2026-03-10*
