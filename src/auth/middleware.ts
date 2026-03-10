import type { Request, Response, NextFunction } from 'express';

/**
 * Middleware that ensures the user is authenticated.
 * - For API requests (Accept: application/json): returns 401 JSON
 * - For browser requests: redirects to /auth/google
 */
export function ensureAuthenticated(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (req.isAuthenticated()) {
    return next();
  }

  const wantsJson =
    req.headers.accept?.includes('application/json') ||
    req.headers['content-type']?.includes('application/json');

  if (wantsJson) {
    res.status(401).json({ error: 'Non authentifie' });
  } else {
    res.redirect('/auth/google');
  }
}
