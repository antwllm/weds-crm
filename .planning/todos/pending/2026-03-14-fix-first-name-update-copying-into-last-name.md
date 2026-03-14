---
created: 2026-03-14T18:24:47.705Z
title: Fix first name update copying into last name
area: api
files: []
---

## Problem

Lors de la mise a jour du prenom d'un lead, la valeur du prenom est copiee dans le champ nom de famille. Le bug se produit probablement dans la logique de mise a jour des leads (LeadForm ou service de sync/import).

## Solution

TBD - Investiguer le flux de mise a jour des leads pour identifier ou le prenom ecrase le nom. Verifier LeadForm.tsx, les routes API de mise a jour, et les services de sync Pipedrive.
