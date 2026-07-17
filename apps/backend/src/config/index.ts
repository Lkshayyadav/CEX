import { env } from './env';

export interface AppConfig {
  env: 'development' | 'production' | 'test';
  port: number;
  databaseUrl: string;
  jwtSecret: string;
  redisUrl: string;
  corsAllowedOrigins: string[];
}

export const config: AppConfig = {
  env: env.NODE_ENV,
  port: env.PORT,
  databaseUrl: env.DATABASE_URL,
  jwtSecret: env.JWT_SECRET,
  redisUrl: env.REDIS_URL,
  corsAllowedOrigins: env.CORS_ALLOWED_ORIGINS.split(','),
};
