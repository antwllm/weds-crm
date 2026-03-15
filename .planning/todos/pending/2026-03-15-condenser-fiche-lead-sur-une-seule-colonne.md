---
created: 2026-03-15T09:36:03.448Z
title: Condenser fiche lead sur une seule colonne
area: ui
files:
  - client/src/pages/LeadDetailPage.tsx
---

## Problem

La section informations du lead (Prénom, Nom, Email, Téléphone, Date, Budget, Source, Statut, Message) prend trop de place verticalement sur la page de détail du lead. Chaque champ est affiché en label + valeur empilés avec beaucoup d'espace blanc, ce qui pousse le contenu important (emails, WhatsApp, historique) vers le bas.

## Solution

Condenser les informations sur une seule colonne compacte : afficher les champs en grille dense (label: valeur sur la même ligne) ou en format inline pour réduire l'espace vertical. S'inspirer du style Pipedrive avec des champs compacts éditables en ligne.
