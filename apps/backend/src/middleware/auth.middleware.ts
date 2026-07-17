import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, AppError } from '../utils';
import { HTTP_STATUS } from '../constants';

/**
 * JWT Authentication Middleware
 * Extracts the JWT from the Authorization Bearer header, verifies it,
 * and attaches the decoded user data to req.user.
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  // 1. Verify Authorization header exists and has the correct Bearer prefix
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError('Access unauthorized. Please login first.', HTTP_STATUS.UNAUTHORIZED);
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    throw new AppError('Access unauthorized. Token missing.', HTTP_STATUS.UNAUTHORIZED);
  }

  try {
    // 2. Decode and verify the cryptographic signature of the token
    const decoded = verifyAccessToken(token);

    // 3. Attach the verified user details to the request object
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    // 4. Suppress internal verification errors (e.g. signature mismatch, expired token details)
    next(new AppError('Access unauthorized. Invalid or expired token.', HTTP_STATUS.UNAUTHORIZED));
  }
};
