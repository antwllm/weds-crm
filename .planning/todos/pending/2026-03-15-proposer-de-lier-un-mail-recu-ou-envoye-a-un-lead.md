---
created: 2026-03-15T11:23:16.417Z
title: Proposer de lier un mail reçu/envoyé à un lead
area: ui
files:
  - client/src/components/inbox/ThreadDetail.tsx
  - src/routes/api/inbox.ts
---

## Problem

Actuellement les mails sont liés automatiquement aux leads par correspondance d'email. Mais l'utilisateur devrait pouvoir manuellement proposer de lier un mail reçu ou envoyé à un lead spécifique, notamment quand l'adresse email ne correspond pas directement (transferts, CC, etc.).

## Solution

- Ajouter un bouton "Lier à un lead" dans la vue thread/mail
- Afficher un sélecteur de leads (recherche par nom/email)
- Créer l'association dans linked_emails via l'API existante
