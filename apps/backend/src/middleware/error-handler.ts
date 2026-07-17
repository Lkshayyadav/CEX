import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

/**
 * Global Error Handling Middleware
 * Must be registered as the final middleware in the Express chain.
 */
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void => {
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  // Log error using pino-http logger bound to the request if available, otherwise console
  const logger = (req as any).log || console;
  logger.error({ err }, `[Error Handler] ${req.method} ${req.originalUrl} - Status: ${statusCode}`);

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(config.env === 'development' && { stack: err.stack }),
    },
  });
};
