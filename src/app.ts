import express from 'express';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import * as Sentry from '@sentry/node';
import { getPool } from './db/index.js';
import { configurePassport } from './auth/passport.js';
import { ensureAuthenticated } from './auth/middleware.js';
import healthRouter from './routes/health.js';
import authRouter from './routes/auth.js';
import webhookRouter from './routes/webhook.js';
import { config } from './config.js';

const app = express();

// Trust proxy (Cloud Run sits behind a load balancer)
app.set('trust proxy', 1);

// JSON body parsing (needed for Pub/Sub webhook)
app.use(express.json());

// Session configuration with PostgreSQL store
const PgSession = connectPgSimple(session);

app.use(
  session({
    store: new PgSession({
      pool: getPool(),
      tableName: 'session',
      createTableIfMissing: true,
    }),
    secret: config.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: config.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  })
);

// Initialize Passport authentication
configurePassport(app);

// Public routes (no auth required)
app.use(healthRouter);
app.use(authRouter);
app.use('/webhook', webhookRouter);

// Protected routes
app.get('/', ensureAuthenticated, (_req, res) => {
  res.send('Weds CRM - Systeme actif');
});

// Sentry error handler (must be after all routes)
Sentry.setupExpressErrorHandler(app);

export { app };
