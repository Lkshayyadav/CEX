import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { HTTP_STATUS } from '../constants';
import { sendErrorResponse } from '../utils';

/**
 * Zod validation middleware for Express requests
 */
export const validateRequest = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.issues.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        sendErrorResponse(res, 'Validation failed', HTTP_STATUS.BAD_REQUEST, details);
        return;
      }
      next(error);
    }
  };
};

/**
 * Zod validation middleware for Express request params
 */
export const validateRequestParams = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.params = await schema.parseAsync(req.params) as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.issues.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        sendErrorResponse(res, 'Validation failed', HTTP_STATUS.BAD_REQUEST, details);
        return;
      }
      next(error);
    }
  };
};

/**
 * Basic interface validator helper (legacy placeholder design).
 */
export const validateRequestBodyKeys = (requiredKeys: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const missingKeys = requiredKeys.filter((key) => !(key in req.body));

    if (missingKeys.length > 0) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: {
          message: `Missing required request body keys: ${missingKeys.join(', ')}`,
        },
      });
      return;
    }

    next();
  };
};

export * from './auth.validator';
export * from './market.validator';
