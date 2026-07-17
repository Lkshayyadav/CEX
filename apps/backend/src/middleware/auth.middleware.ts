import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';

/**
 * Authentication Middleware (Placeholder)
 * In the future, this will extract, verify, and validate JWT access tokens.
 * Currently, it passes execution straight through to the next handler.
 */
export const requireAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  // TODO: Implement JWT extraction from Authorization header and verification
  next();
};
