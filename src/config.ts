import 'dotenv/config';
import { z } from 'zod';

const isProduction = process.env.NODE_ENV === 'production';

const envSchema = z.object({
  // Application
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().default(8080),

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL est requis'),

  // Google OAuth 2.0
  GOOGLE_CLIENT_ID: z.string().min(1, 'GOOGLE_CLIENT_ID est requis'),
  GOOGLE_CLIENT_SECRET: z.string().min(1, 'GOOGLE_CLIENT_SECRET est requis'),
  GOOGLE_REDIRECT_URI: z
    .string()
    .default('http://localhost:8080/auth/google/callback'),

  // Session
  SESSION_SECRET: z.string().min(1, 'SESSION_SECRET est requis'),

  // Twilio SMS (requis en production, optionnel en dev/test)
  TWILIO_ACCOUNT_SID: isProduction
    ? z.string().min(1, 'TWILIO_ACCOUNT_SID est requis en production')
    : z.string().optional(),
  TWILIO_AUTH_TOKEN: isProduction
    ? z.string().min(1, 'TWILIO_AUTH_TOKEN est requis en production')
    : z.string().optional(),
  TWILIO_PHONE_NUMBER: isProduction
    ? z.string().min(1, 'TWILIO_PHONE_NUMBER est requis en production')
    : z.string().optional(),

  // Free Mobile SMS (requis en production, optionnel en dev/test)
  FREE_MOBILE_USER: isProduction
    ? z.string().min(1, 'FREE_MOBILE_USER est requis en production')
    : z.string().optional(),
  FREE_MOBILE_PASS: isProduction
    ? z.string().min(1, 'FREE_MOBILE_PASS est requis en production')
    : z.string().optional(),

  // Google Cloud Storage (requis en production, optionnel en dev/test)
  GCS_BUCKET_NAME: isProduction
    ? z.string().min(1, 'GCS_BUCKET_NAME est requis en production')
    : z.string().optional(),

  // Sentry (toujours optionnel)
  SENTRY_DSN: z.string().optional(),

  // Pipedrive (requis en production, optionnel en dev/test)
  PIPEDRIVE_API_TOKEN: isProduction
    ? z.string().min(1, 'PIPEDRIVE_API_TOKEN est requis en production')
    : z.string().optional(),
  PIPEDRIVE_FIELD_CONFIG: z.string().optional(), // JSON blob of PipedriveFieldConfig
  PIPEDRIVE_WEBHOOK_USER: z.string().optional(),
  PIPEDRIVE_WEBHOOK_PASSWORD: z.string().optional(),

  // Gmail Pub/Sub
  GMAIL_PUBSUB_TOPIC: isProduction
    ? z.string().min(1, 'GMAIL_PUBSUB_TOPIC est requis en production')
    : z.string().optional(),

  // Emails
  ADMIN_EMAIL: z.string().email().default('contact@weds.fr'),
  ALLOWED_USER_EMAIL: z.string().email().optional(),

  // Configuration defaults
  VCARD_EXPIRY_DAYS: z.coerce.number().default(7),
  FALLBACK_SWEEP_INTERVAL: z.string().default('*/30 * * * *'),
});

function validateEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(
      `Configuration invalide:\n${formatted}`
    );
  }

  return result.data;
}

export const config = validateEnv();

export type Config = typeof config;
