// Weds CRM - Entry point
// Sentry must be initialized before any other imports
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN || undefined,
  environment: process.env.NODE_ENV || 'development',
  tracesSampleRate: 1.0,
});

// App initialization will be added in later plans
console.log('Weds CRM starting...');
