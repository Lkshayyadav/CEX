import { AuthenticatedUser } from './index';

export interface JWTPayload {
  userId: string;
  email: string;
  role: 'ADMIN' | 'USER' | 'AUDITOR';
}

export interface LoginResponseData {
  user: AuthenticatedUser;
  accessToken: string;
}
