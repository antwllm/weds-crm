# Weds CRM

CRM dédié aux prestataires de mariage pour gérer les leads provenant de Mariages.net et d'autres sources.

## Fonctionnalités

- **Parsing automatique des emails** — Ingestion Gmail via Pub/Sub webhook + cron, extraction des informations lead (nom, email, téléphone, date, budget, message)
- **Pipeline Kanban & Table** — Vue pipeline avec colonnes de statut, drag & drop, et vue tableau triable
- **Fiche lead détaillée** — Sidebar compacte avec champs éditables inline + onglets (Notes, Emails, WhatsApp)
- **Synchronisation Pipedrive** — Sync bidirectionnelle (push/pull) avec gestion des doublons et boucles
- **Boîte de réception Gmail** — Lecture des threads, réponse directe, brouillons IA via OpenRouter
- **WhatsApp Business** — Envoi/réception de messages, templates, détection de fenêtre 24h
- **Notifications** — SMS Twilio (prospects) + Free Mobile (admin) + email récap
- **vCard** — Génération et stockage Google Cloud Storage

## Stack technique

| Couche | Technologie |
|--------|------------|
| Runtime | Bun + TypeScript |
| Backend | Express |
| ORM | Drizzle |
| Base de données | PostgreSQL 16 |
| Frontend | React + Vite + Tailwind CSS |
| Tests | Vitest |
| Déploiement | Docker Compose / Google Cloud Run |

## Développement local

### Prérequis

- Docker & Docker Compose
- Node.js 20+ ou Bun

### Lancement

```bash
# Copier les variables d'environnement
cp .env.example .env

# Démarrer PostgreSQL + app
docker compose up -d

# L'app est accessible sur http://localhost:8082
```

### Variables d'environnement requises

| Variable | Description |
|----------|------------|
| `GOOGLE_CLIENT_ID` | OAuth Google |
| `GOOGLE_CLIENT_SECRET` | OAuth Google |
| `SESSION_SECRET` | Secret de session Express |
| `PIPEDRIVE_API_TOKEN` | Token API Pipedrive |
| `OPENROUTER_API_KEY` | Clé API OpenRouter (brouillons IA) |
| `WHATSAPP_ACCESS_TOKEN` | Token Meta WhatsApp Business |
| `WHATSAPP_PHONE_NUMBER_ID` | ID du numéro WhatsApp |
| `WHATSAPP_APP_SECRET` | Secret app Meta (vérification webhook) |
| `TWILIO_ACCOUNT_SID` | Twilio SMS |
| `TWILIO_AUTH_TOKEN` | Twilio SMS |
| `FREE_MOBILE_USER` | Free Mobile SMS API |
| `FREE_MOBILE_PASS` | Free Mobile SMS API |

### Scripts

```bash
npm run dev        # Développement backend
npm run build      # Build TypeScript
npm test           # Tests Vitest
cd client && npm run dev   # Frontend dev server
```

## Architecture

```
src/
├── db/            # Schema Drizzle + migrations
├── routes/        # Express routes (API, auth, webhooks)
├── services/      # Logique métier (Gmail, Pipedrive, WhatsApp, notifications)
└── index.ts       # Point d'entrée

client/
├── src/
│   ├── components/  # Composants React (leads, pipeline, inbox, whatsapp)
│   ├── hooks/       # React Query hooks
│   ├── pages/       # Pages (Pipeline, LeadDetail, Inbox, Settings)
│   └── lib/         # Utils, API client, constantes
```

## Licence

Privé
