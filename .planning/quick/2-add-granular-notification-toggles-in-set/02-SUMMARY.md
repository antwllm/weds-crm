---
phase: quick-2
plan: 02
subsystem: notifications, settings-ui
tags: [notifications, settings, activity-log, toggles]
dependency_graph:
  requires: [schema, notifications-service, alerts-service]
  provides: [notification-settings-table, settings-api, notification-toggles-ui, activity-log-ui]
  affects: [notification-dispatch, alert-dispatch, settings-page]
tech_stack:
  added: [shadcn-switch, shadcn-skeleton]
  patterns: [optimistic-update, fail-open-toggle-check, auto-seed-defaults]
key_files:
  created:
    - src/routes/api/settings.ts
    - client/src/components/settings/NotificationToggles.tsx
    - client/src/components/settings/ActivityLog.tsx
    - client/src/components/ui/switch.tsx
    - client/src/components/ui/skeleton.tsx
  modified:
    - src/db/schema.ts
    - src/app.ts
    - src/services/notifications.ts
    - src/services/alerts.ts
    - client/src/hooks/useSettings.ts
    - client/src/pages/SettingsPage.tsx
decisions:
  - Fail-open toggle check -- if DB query fails, all channels send (never silently block notifications)
  - Auto-seed defaults on first GET -- 5 channels all enabled, no migration script needed for initial data
  - Optimistic UI updates on toggle switch for instant feedback with rollback on error
metrics:
  duration: 4min
  completed: 2026-03-16
---

# Quick Task 2: Add Granular Notification Toggles and Activity Log

Per-channel notification toggles with fail-open DB checks and a cross-lead activity log with type filtering and pagination.

## Task Completion

| # | Task | Commit | Key Files |
|---|------|--------|-----------|
| 1 | DB schema, API routes, dispatch toggle checks | eddf570 | src/db/schema.ts, src/routes/api/settings.ts, src/services/notifications.ts, src/services/alerts.ts |
| 2 | Settings page UI -- toggles and activity log tabs | f778615 | NotificationToggles.tsx, ActivityLog.tsx, SettingsPage.tsx, useSettings.ts |

## What Was Built

### Backend
- **notification_settings table**: 5 channels (free_mobile_new_contact, free_mobile_error, email_recap_new_contact, email_error, whatsapp_prospect) with enabled boolean and French labels
- **Settings API**: GET/PUT /api/settings/notifications for toggle state, GET /api/settings/activities for cross-lead activity log with type filter and pagination
- **Dispatch integration**: dispatchNotifications checks toggle map before each channel send; alertNotificationFailure checks toggle map for error alert channels
- **Fail-open pattern**: if toggle query fails, all channels default to enabled

### Frontend
- **NotificationToggles**: Card with two grouped sections (Nouveau contact, Alertes erreurs), Switch components with optimistic updates
- **ActivityLog**: Chronological feed with Select filter by activity type, Badge color-coding per type, lead name links, relative timestamps, pagination
- **Settings page**: 4 tabs -- Modeles, Parametres IA, Notifications, Journal d'activite

## Migration Required

The `notification_settings` table must be created in PostgreSQL:

```sql
CREATE TABLE notification_settings (
  id SERIAL PRIMARY KEY,
  channel VARCHAR(50) NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  label VARCHAR(255) NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

The API auto-seeds default rows on first GET, so no INSERT migration is needed.

## Deviations from Plan

None -- plan executed exactly as written.
