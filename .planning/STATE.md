---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Templates & Agent IA WhatsApp
status: in-progress
stopped_at: Completed 07-01-PLAN.md
last_updated: "2026-03-17T10:56:30Z"
last_activity: 2026-03-17 -- Completed 07-01 Langfuse AI Observability
progress:
  total_phases: 3
  completed_phases: 2
  total_plans: 9
  completed_plans: 8
  percent: 89
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-16)

**Core value:** Every Mariages.net lead is captured, organized, and actionable from a single interface — no switching between Gmail, Pipedrive, and phone
**Current focus:** v1.1 Phase 7 AI Observability & Decision UI -- Plan 01 complete

## Current Position

Phase: 7 of 7 (AI Observability & Decision UI)
Plan: 1 of 2 in current phase
Status: Phase 7 In Progress
Last activity: 2026-03-17 -- Completed 07-01 Langfuse AI Observability

Progress: [████████░░] 89%

## Performance Metrics

**Velocity:**
- Total plans completed: 23 (v1.0)
- Average duration: 3.5min
- Total execution time: ~1.3 hours

**By Phase (v1.0):**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01 | 5 | 20min | 4min |
| 02 | 5 | 23min | 4.6min |
| 03 | 5 | 16min | 3.2min |
| 04 | 8 | 25min | 3.1min |

**Recent Trend:**
- v1.0 phases showed improving velocity (4min -> 3.1min avg)
- Trend: Improving

*Updated after each plan completion*
| Phase 05 P03 | 3min | 2 tasks | 7 files |
| Phase 05 P04 | 3min | 2 tasks | 5 files |
| Phase 06 P01 | 3min | 2 tasks | 6 files |
| Phase 06 P02 | 2min | 2 tasks | 3 files |
| Phase 06 P03 | 2min | 3 tasks | 6 files |
| Phase 07 P01 | 4min | 2 tasks | 7 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Agent IA WhatsApp = reply or pass_to_human (garder le controle sur sujets sensibles)
- Pass-to-human = per-conversation, not permanent (re-activation automatique)
- Langfuse pour l'observabilite IA (calibrer, tracer, mesurer)
- [Quick-7]: TipTap editor uses imperative ref for template/AI/variable insertion
- [Quick-9]: WYSIWYG improvements already shipped (undo/redo, lists, attachments, HTML toggle)
- [05-01]: No autocompletion in CodeMirror (avoid noisy tag completion)
- [05-01]: js-beautify with indent_size=2, wrap_line_length=120 for HTML formatting
- [05-02]: Public GCS URLs (not signed) for assets bucket -- permanent access for template images
- [05-02]: 25MB upload limit, UUID filenames, multer memoryStorage
- [Phase 05]: useRef pattern for stable upload callback in ProseMirror plugin
- [Phase 05]: Public GCS URLs for inline images (consistent with 05-02)
- [Phase 05]: Separate templateAttachments state from manual attachments for clean GCS vs client-side distinction
- [Phase 05]: GCS fallback pattern: check gcsPath first, fall back to local path for backward compat
- [06-01]: DEFAULT_WA_PROMPT_TEMPLATE uses JSON response format with action reply|pass_to_human
- [06-01]: whatsapp_agent_config follows single-row pattern like ai_prompt_config
- [06-01]: sentBy column defaults to 'human' for backward compatibility
- [06-02]: Force handoff at 5th consecutive AI exchange (>= 4 count check)
- [06-02]: Gmail email alert alongside Free Mobile SMS for handoff
- [06-02]: setImmediate async dispatch in webhook for non-blocking AI processing
- [06-03]: Banner above chat with rounded-t-lg, messages border-t-0 for visual continuity
- [06-03]: Handoff detection server-side: compare whatsappAiHandoffAt vs last human outbound
- [Phase 06]: Banner above chat with rounded-t-lg, messages border-t-0 for visual continuity
- [07-01]: Lazy SDK loading for Langfuse in CJS (no top-level await)
- [07-01]: AiCallResult type with content + optional usage for token propagation
- [07-01]: Best-effort tracing: Langfuse failure never blocks AI response

### Pending Todos

5 pending — /gsd:check-todos to review

### Blockers/Concerns

- Phase 4: WhatsApp Business API approval — verify status before Phase 6 (agent needs production API)
- GCS upload endpoint needed for Phase 5 (image inline + attachments)

## Session Continuity

Last session: 2026-03-17T10:56:30Z
Stopped at: Completed 07-01-PLAN.md
Resume file: .planning/phases/07-ai-observability-decision-ui/07-02-PLAN.md
