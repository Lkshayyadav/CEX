import { Request } from 'express';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: 'ADMIN' | 'USER' | 'AUDITOR';
}

/**
 * Custom request interface extending standard Express request to include authenticated user details.
 */
export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export * from './auth';
export * from './market';
export * from './balance';
