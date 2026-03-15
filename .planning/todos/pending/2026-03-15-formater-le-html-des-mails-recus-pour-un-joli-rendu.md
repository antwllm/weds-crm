---
created: 2026-03-15T11:23:16.417Z
title: Formater le HTML des mails reçus pour un joli rendu
area: ui
files:
  - client/src/components/inbox/ThreadDetail.tsx
  - client/src/components/leads/LeadEmails.tsx
---

## Problem

Les mails reçus dans l'inbox et la vue lead affichent le HTML brut sans mise en forme. Le rendu est moche et illisible, surtout pour les mails HTML riches (newsletters, notifications Meta/WhatsApp, etc.). Le screenshot montre un mail Meta avec du texte collé sans espacement ni structure visuelle.

## Solution

- Utiliser un composant de rendu HTML sécurisé (sanitize avec DOMPurify) pour afficher le contenu des mails
- Appliquer des styles CSS de base pour le contenu HTML des mails (typographie, espacement, liens)
- Gérer les cas text/plain et text/html correctement
