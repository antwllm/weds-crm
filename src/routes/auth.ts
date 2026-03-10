import { Router } from 'express';
import passport from 'passport';
import { SCOPES } from '../auth/passport.js';

const router = Router();

// Initiate Google OAuth flow
router.get(
  '/auth/google',
  passport.authenticate('google', {
    scope: SCOPES,
    accessType: 'offline',
    prompt: 'consent',
  } as object)
);

// Google OAuth callback
router.get(
  '/auth/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/auth/failed',
  }),
  (_req, res) => {
    res.redirect('/');
  }
);

// Auth failure
router.get('/auth/failed', (_req, res) => {
  res.status(401).send('Acces refuse - compte non autorise');
});

// Logout
router.get('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    req.session.destroy((sessionErr) => {
      if (sessionErr) {
        return next(sessionErr);
      }
      res.redirect('/');
    });
  });
});

export default router;
