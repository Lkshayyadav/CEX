import { Request, Response, NextFunction } from 'express';
import { HTTP_STATUS, ERROR_MESSAGES } from '../constants';
import { config } from '../config';

/**
 * Global Error Handling Middleware
 */
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void => {
  const statusCode = err.status || err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  const message = err.message || ERROR_MESSAGES.INTERNAL_SERVER_ERROR;

  // Log error (in production, use a library logger like Winston or Pino)
  console.error(`[Error Handler] ${req.method} ${req.path} - Status: ${statusCode}`, err);

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(config.env === 'development' && { stack: err.stack }),
    },
  });
};

  /**
 * Basic request logging middleware
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[Request Log] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
  });
  next();
};
