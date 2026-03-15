---
created: 2026-03-15T09:38:00.000Z
title: Reorganiser lead detail sidebar et onglets centraux
area: ui
files:
  - client/src/pages/LeadDetailPage.tsx
  - client/src/components/leads/LeadEmails.tsx
  - client/src/components/whatsapp/WhatsAppChat.tsx
  - client/src/components/leads/ActivityTimeline.tsx
---

## Problem

La page de détail du lead est mal organisée : les infos lead, les emails, le WhatsApp et l'historique d'activités sont empilés verticalement, ce qui rend la navigation difficile. L'utilisateur veut un layout style Pipedrive avec une sidebar gauche et un contenu central à onglets.

## Solution

Layout en 2 colonnes :
- **Colonne gauche (sidebar)** : Informations du lead (condensées, cf todo précédent) + Historique d'activités en dessous
- **Zone centrale** : Onglets avec Emails, Notes (liste des notes), WhatsApp (conversations)

Utiliser le composant Tabs existant pour les onglets centraux.
