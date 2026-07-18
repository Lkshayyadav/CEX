import { Request, Response, NextFunction } from 'express';

/**
 * 404 Fallback Middleware
 * Triggers when no registered routes match the incoming request path.
 */
export const notFound = (req: Request, res: Response, next: NextFunction): void => {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  (error as any).statusCode = 404;
  next(error);
};
