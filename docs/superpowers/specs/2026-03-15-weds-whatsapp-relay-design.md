# weds-whatsapp-relay — Design Spec

## Purpose

Standalone micro-service that receives WhatsApp webhooks from Meta, persistently stores all messages and media, and forwards them to configurable downstream services (e.g., weds-crm). Ensures no messages are lost regardless of downstream availability.

## Stack

- **Runtime:** Bun + TypeScript
- **Framework:** Express
- **ORM:** Drizzle ORM
- **Database:** Cloud SQL PostgreSQL (dedicated instance)
- **Media storage:** Google Cloud Storage (GCS)
- **Deployment:** Google Cloud Run
- **Auth:** API key (header `X-API-Key`) for REST API

## Database Schema

### `messages`

Stores every WhatsApp message (one row per message — each media is a separate message from Meta).

| Column | Type | Description |
|---|---|---|
| id | serial PK | Auto-increment |
| wa_message_id | varchar(255) UNIQUE | Meta's unique message ID (dedup key) |
| from_number | varchar(20) | Sender phone (E.164) |
| to_number | varchar(20) | Recipient phone (E.164) |
| direction | varchar(10) | `inbound` or `outbound` |
| type | varchar(20) | `text`, `image`, `audio`, `video`, `document`, `sticker`, `location`, `contacts` |
| body | text | Text content (null for media-only) |
| media_url | text | GCS URL of downloaded media (null for text) |
| media_mime_type | varchar(100) | MIME type of media |
| raw_payload | jsonb | Full Meta webhook payload for debugging |
| sent_at | timestamp | Original message timestamp from Meta (sender's device) |
| status | varchar(20) | `received`, `forwarded`, `forward_failed` (forward_failed = ANY target failed) |
| created_at | timestamp | Default now() |
| updated_at | timestamp | Updated on status change |

### `webhook_targets`

Downstream services to forward messages to.

| Column | Type | Description |
|---|---|---|
| id | serial PK | Auto-increment |
| name | varchar(255) | Descriptive name (e.g., "weds-crm") |
| url | varchar(500) | Destination URL |
| api_key | varchar(255) | API key to include in forwarded request (nullable) |
| active | boolean | Enable/disable without deleting, default true |
| created_at | timestamp | Default now() |
| updated_at | timestamp | Updated on change |

### `forward_logs`

Audit trail for every forward attempt.

| Column | Type | Description |
|---|---|---|
| id | serial PK | Auto-increment |
| message_id | integer FK → messages.id | Which message |
| target_id | integer FK → webhook_targets.id | Which target |
| status | varchar(20) | `success` or `failed` |
| http_status | integer | HTTP status code from target (nullable) |
| error | text | Error message if failed (nullable) |
| created_at | timestamp | Default now() |

## Inbound Message Flow

```
Meta → POST /webhook/whatsapp → Relay
  1. Verify HMAC-SHA256 signature (X-Hub-Signature-256 header)
  2. Parse message (from, type, text/media_id, timestamp, wa_message_id)
  3. INSERT into `messages` table (status: 'received', body for text, media_url null for now)
     - Use INSERT ... ON CONFLICT (wa_message_id) DO NOTHING for deduplication
     - If duplicate → skip processing, return 200
  4. Return 200 to Meta
  5. Async processing via setImmediate:
     a. If media type → download from Meta API → upload to GCS → update media_url
     b. For each active webhook_target:
        - POST message data (JSON) to target URL
        - Include target's api_key in X-API-Key header if configured
        - Include media GCS URL (not the binary)
        - Log result in forward_logs
     c. Update message status to 'forwarded' or 'forward_failed'
        ('forward_failed' if ANY target failed)
```

### Media Download Flow

Meta provides a media ID in the webhook. To get the actual file:

1. `GET https://graph.facebook.com/v21.0/{media_id}` → returns `{ url }` (temporary download URL)
2. `GET {url}` with Bearer token → returns binary file (timeout: 30s, max size: 100MB)
3. Upload binary to GCS bucket `weds-whatsapp-media/{YYYY-MM}/{media_id}.{ext}`
4. Store GCS URL in `messages.media_url`
5. On failure (timeout, GCS error): log error, set `media_url` to null, message is still stored with body "Media recu (echec telechargement)"

## REST API

All endpoints require `X-API-Key` header matching the configured `API_KEY` env var.

### Messages

- `GET /api/messages` — paginated list
  - Query params: `phone` (matches from_number OR to_number), `from_date`, `to_date`, `type`, `page`, `limit`
  - Returns: `{ data: Message[], total: number, page: number, limit: number }`

- `GET /api/messages/:id` — single message detail

- `GET /api/messages/:id/media` — proxy download of media from GCS
  - Returns binary with correct Content-Type header

### Webhook Targets

- `GET /api/targets` — list all targets
- `POST /api/targets` — create target `{ name, url, api_key?, active? }`
- `PATCH /api/targets/:id` — update target fields
- `DELETE /api/targets/:id` — remove target

### Meta Webhook

- `GET /webhook/whatsapp` — Meta verification handshake (hub.mode, hub.verify_token, hub.challenge)
- `POST /webhook/whatsapp` — receive incoming messages

### Health

- `GET /health` — returns `{ status: "ok", timestamp }` (no auth required)

## Forward Payload Format

What gets POSTed to each webhook target:

```json
{
  "id": 123,
  "waMessageId": "wamid.xxx",
  "from": "+33612345678",
  "to": "+33712345678",
  "direction": "inbound",
  "type": "text",
  "body": "Bonjour, je suis interesse",
  "mediaUrl": null,
  "mediaMimeType": null,
  "metadata": null,
  "timestamp": "2026-03-15T10:30:00.000Z"
}
```

For media messages, `mediaUrl` contains the GCS URL and `body` is null.

For structured types (location, contacts), `metadata` contains the parsed data:
- Location: `{ latitude, longitude, name?, address? }`
- Contacts: `{ contacts: [...] }` (Meta's vCard format)

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| DATABASE_URL | yes | Cloud SQL PostgreSQL connection string |
| PORT | no | Server port (default: 8080) |
| API_KEY | yes | API key for REST endpoints |
| WHATSAPP_VERIFY_TOKEN | yes | Token for Meta webhook verification |
| WHATSAPP_APP_SECRET | yes | Secret for HMAC signature verification |
| WHATSAPP_ACCESS_TOKEN | yes | Meta API token for downloading media |
| GCS_BUCKET | yes | GCS bucket name for media storage |
| GCS_PROJECT_ID | yes | GCP project ID |
| NODE_ENV | no | `production` or `development` |

## Project Structure

```
weds-whatsapp-relay/
├── src/
│   ├── index.ts              # Express app setup + server start
│   ├── config.ts             # Env validation (zod)
│   ├── logger.ts             # Pino logger
│   ├── db/
│   │   ├── index.ts          # Drizzle client
│   │   └── schema.ts         # Table definitions
│   ├── routes/
│   │   ├── webhook.ts        # GET/POST /webhook/whatsapp
│   │   ├── messages.ts       # /api/messages
│   │   └── targets.ts        # /api/targets
│   ├── services/
│   │   ├── media.ts          # Download from Meta + upload to GCS
│   │   ├── forwarder.ts      # Forward to webhook targets
│   │   └── whatsapp.ts       # Parse/verify webhook payloads
│   └── middleware/
│       └── auth.ts           # API key middleware
├── tests/
│   ├── webhook.test.ts
│   ├── messages.test.ts
│   ├── targets.test.ts
│   ├── media.test.ts
│   └── forwarder.test.ts
├── drizzle.config.ts
├── package.json
├── tsconfig.json
├── Dockerfile
├── docker-compose.yml          # Local dev: PostgreSQL
└── .env.example
```

## CRM Integration

The weds-crm will:

1. Register itself as a webhook target via `POST /api/targets`
2. Receive forwarded messages at its existing `POST /webhook/whatsapp` endpoint (same payload format as Meta, or adapted — see forward payload format above)
3. Query message history via `GET /api/messages?phone=xxx` when needed
4. Download media via `GET /api/messages/:id/media` if needed

The CRM's existing WhatsApp webhook handler will need minor adaptation to accept the relay's forward format instead of Meta's raw format.

## Scope — V1 Limitations

- **Inbound only**: the relay only stores inbound messages. Outbound messages remain the CRM's responsibility (sent directly via Meta API). The relay's message history is partial — the CRM holds the full conversation view by merging its own outbound records with the relay's inbound data.
- **No retry**: failed forwards are logged but not retried automatically. The CRM can pull missed messages via `GET /api/messages` filtered by date range.
- **Status updates from Meta** (sent, delivered, read): ignored in V1. Only `messages` payloads are processed.

## Security

- HMAC-SHA256 verification on all incoming Meta webhooks
- API key authentication on all REST endpoints
- GCS media URLs are not public — served through the relay's proxy endpoint
- No secrets in logs (raw_payload may contain phone numbers — acceptable for business use)
