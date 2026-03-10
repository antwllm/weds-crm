import passport from 'passport';
import { Strategy as GoogleStrategy, type Profile } from 'passport-google-oauth20';
import type { Express } from 'express';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { saveTokens } from '../services/token-store.js';
import { getGmailClient } from '../services/gmail.js';
import { setGmailClientInstance } from '../services/gmail-client-holder.js';
import { startScheduler } from '../pipeline/scheduler.js';

// User shape stored in session
export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
  accessToken: string;
  refreshToken: string;
}

// Extend Express types for passport user
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface User extends SessionUser {}
  }
}

const SCOPES = [
  'profile',
  'email',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.send',
  'https://mail.google.com/',
];

export { SCOPES };

export function configurePassport(app: Express): void {
  passport.use(
    new GoogleStrategy(
      {
        clientID: config.GOOGLE_CLIENT_ID,
        clientSecret: config.GOOGLE_CLIENT_SECRET,
        callbackURL: config.GOOGLE_REDIRECT_URI,
      },
      (
        accessToken: string,
        refreshToken: string,
        profile: Profile,
        done: (error: Error | null, user?: SessionUser | false) => void
      ) => {
        const email = profile.emails?.[0]?.value;

        if (!email) {
          logger.warn('Tentative de connexion sans email dans le profil Google', {
            profileId: profile.id,
          });
          return done(null, false);
        }

        // Check email allowlist
        if (
          config.ALLOWED_USER_EMAIL &&
          email.toLowerCase() !== config.ALLOWED_USER_EMAIL.toLowerCase()
        ) {
          logger.warn('Tentative de connexion avec un email non autorise', {
            email,
            allowed: config.ALLOWED_USER_EMAIL,
          });
          return done(null, false);
        }

        const user: SessionUser = {
          id: profile.id,
          email,
          displayName: profile.displayName || email,
          accessToken,
          refreshToken,
        };

        // Persist tokens in database for restart recovery
        saveTokens(email, accessToken, refreshToken).catch((err) => {
          logger.error('Echec sauvegarde tokens OAuth apres connexion', {
            error: err instanceof Error ? err.message : String(err),
          });
        });

        // Initialize Gmail client and start scheduler
        try {
          const gmailClient = getGmailClient(accessToken, refreshToken);
          setGmailClientInstance(gmailClient);
          startScheduler(gmailClient);
          logger.info('Client Gmail initialise et scheduler demarre apres connexion');
        } catch (err) {
          logger.error('Echec initialisation Gmail client apres connexion', {
            error: err instanceof Error ? (err as Error).message : String(err),
          });
        }

        logger.info('Connexion reussie', { email });
        return done(null, user);
      }
    )
  );

  passport.serializeUser((user: Express.User, done) => {
    done(null, user);
  });

  passport.deserializeUser((user: Express.User, done) => {
    done(null, user);
  });

  app.use(passport.initialize());
  app.use(passport.session());
}
