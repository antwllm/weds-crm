---
created: 2026-03-15T11:23:16.417Z
title: AI draft - rester sur vue lead et rafraîchir
area: ui
files:
  - client/src/pages/LeadDetailPage.tsx
  - client/src/components/leads/LeadEmails.tsx
---

## Problem

Lors de la génération d'un brouillon AI depuis la vue lead detail, l'UX devrait rester sur la page du lead et rafraîchir les données (mails affichés ici également) plutôt que de naviguer vers une autre vue. L'utilisateur perd le contexte du lead en changeant de page.

## Solution

- Après envoi d'un brouillon AI depuis la vue lead, rester sur LeadDetailPage
- Rafraîchir la section emails du lead pour montrer le mail envoyé
- Utiliser invalidation de cache React Query pour mettre à jour les données
