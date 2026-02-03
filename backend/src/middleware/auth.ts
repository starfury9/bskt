import type { Request, Response, NextFunction } from 'express';

/**
 * API Key authentication middleware
 * Expects header: x-api-key: <key>
 */
export function apiKeyAuth(req: Request, res: Response, next: NextFunction): void {
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    console.error('[Auth] API_KEY not configured in environment');
    res.status(500).json({
      success: false,
      error: 'AUTH_NOT_CONFIGURED',
      message: 'Server authentication not configured',
    });
    return;
  }

  const providedKey = req.headers['x-api-key'];

  if (!providedKey) {
    res.status(401).json({
      success: false,
      error: 'MISSING_API_KEY',
      message: 'Missing x-api-key header',
    });
    return;
  }

  if (providedKey !== apiKey) {
    res.status(403).json({
      success: false,
      error: 'INVALID_API_KEY',
      message: 'Invalid API key',
    });
    return;
  }

  next();
}
