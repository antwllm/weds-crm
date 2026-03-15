---
created: 2026-03-14T18:25:38.306Z
title: Fix accent encoding issues
area: general
files: []
---

## Problem

Les caracteres accentues (e, a, u, etc.) ne s'affichent pas correctement dans certaines parties de l'application. Cela peut concerner l'affichage client, les donnees stockees en base, les emails parses, ou les notifications SMS/email envoyees.

## Solution

TBD - Investiguer ou les accents sont corrompus : parsing email, stockage BDD, rendu frontend, envoi SMS/email. Verifier l'encodage UTF-8 a chaque etape du pipeline.
