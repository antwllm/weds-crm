---
created: 2026-03-15T00:00:00.000Z
title: Prepare SaaS multi-tenant architecture and CII application
area: planning
files: []
---

## Problem

Le CRM est actuellement mono-utilisateur (William / weds.fr). Pour le commercialiser aupres d'autres prestataires mariage (photographes, DJ, wedding planners, traiteurs) et obtenir le Credit d'Impot Innovation (CII), il faut preparer l'architecture multi-tenant et le dossier CII.

## Solution

### Multi-tenant (V2)
- Row-Level Security PostgreSQL avec `tenant_id` sur toutes les tables
- Onboarding flow (inscription, config compte, connexion Gmail/WhatsApp)
- Stripe Billing pour la facturation SaaS
- Dashboard admin (gestion des tenants, metriques)
- Isolation des donnees par tenant

### CII
- Documenter les heures de R&D sur les briques innovantes :
  - Parsing IA d'emails Mariages.net
  - Orchestration multi-canal (email + WhatsApp + SMS) unifiee
  - Generation de brouillons IA contextualises depuis les donnees lead
- Preparer le dossier avec description de l'etat de l'art et positionnement innovant
- Budget CII : 20% des depenses d'innovation (salaires, sous-traitance)

### ERP (V2+)
- Module devis/factures integre directement dans l'app
- Pas d'Odoo — tout custom pour garder le controle et l'eligibilite CII
