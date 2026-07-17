import jwt from 'jsonwebtoken';
import { config } from '../config';
import { JWTPayload } from '../types';

/**
 * Generates a JWT access token for a user.
 * @param payload Payload containing userId, email, and role.
 * @returns Signed JWT string.
 */
export const generateAccessToken = (payload: JWTPayload): string => {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: '24h',
  });
};

/**
 * Verifies a JWT access token.
 * @param token JWT string.
 * @returns Decoded payload if valid, otherwise throws.
 */
export const verifyAccessToken = (token: string): JWTPayload => {
  return jwt.verify(token, config.jwtSecret) as JWTPayload;
};
