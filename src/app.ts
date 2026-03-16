import express from 'express';
import fs from 'fs';
import path from 'path';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import * as Sentry from '@sentry/node';
import { getPool } from './db/index.js';
import { configurePassport } from './auth/passport.js';
import { ensureAuthenticated } from './auth/middleware.js';
import healthRouter from './routes/health.js';
import authRouter from './routes/auth.js';
import webhookRouter from './routes/webhook.js';
import leadsRouter from './routes/api/leads.js';
import activitiesRouter from './routes/api/activities.js';
import inboxRouter from './routes/api/inbox.js';
import whatsappRouter from './routes/api/whatsapp.js';
import templatesRouter from './routes/api/templates.js';
import aiRouter from './routes/api/ai.js';
import settingsRouter from './routes/api/settings.js';
import uploadRouter from './routes/api/upload.js';
import { config } from './config.js';

const app = express();

// Trust proxy (Cloud Run sits behind a load balancer)
app.set('trust proxy', 1);

// JSON body parsing (needed for Pub/Sub webhook)
// The verify callback saves raw body for WhatsApp webhook signature verification
app.use(express.json({
  verify: (req: any, _res, buf) => {
    req.rawBody = buf;
  },
}));

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

// API routes (protected via middleware in each router)
app.use('/api/leads', leadsRouter);
app.use('/api', activitiesRouter);
app.use('/api', inboxRouter);
app.use('/api', whatsappRouter);
app.use('/api', templatesRouter);
app.use('/api', aiRouter);
app.use('/api', settingsRouter);
app.use('/api', uploadRouter);

// Serve the React SPA from client/dist (built by Docker or locally)
const clientDist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(ensureAuthenticated, express.static(clientDist));
  app.get('{*path}', ensureAuthenticated, (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Sentry error handler (must be after all routes)
Sentry.setupExpressErrorHandler(app);

export { app };
