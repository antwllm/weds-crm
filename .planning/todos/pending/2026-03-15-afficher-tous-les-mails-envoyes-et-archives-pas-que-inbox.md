---
created: 2026-03-15T11:23:16.417Z
title: Afficher tous les mails envoyés et archivés, pas que l'inbox
area: ui
files:
  - client/src/pages/InboxPage.tsx
  - client/src/hooks/useInbox.ts
  - src/routes/api/inbox.ts
---

## Problem

La boîte de réception n'affiche que les mails de l'inbox Gmail. Les mails envoyés et les mails archivés ne sont pas visibles dans le CRM. L'utilisateur doit aller sur Gmail pour voir l'historique complet des échanges.

## Solution

- Ajouter des filtres/onglets dans InboxPage : Inbox / Envoyés / Tous
- Étendre l'API inbox pour supporter les labels Gmail (INBOX, SENT, ALL)
- Permettre de voir tous les mails même ceux archivés ou hors inbox
