import { Request, Response, NextFunction } from 'express';
import { HTTP_STATUS } from '../constants';

/**
 * Basic interface validator helper (placeholder design).
 * In a real application, you might use a library like Zod:
 * `export const validate = (schema: AnyZodObject) => ...`
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
