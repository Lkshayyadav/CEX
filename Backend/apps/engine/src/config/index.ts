import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from backend's .env file or local process.env
dotenv.config({ path: path.join(__dirname, '../../../../apps/backend/.env') });

export const config = {
  env: (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test',
  port: parseInt(process.env.ENGINE_PORT || '5001', 10),
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/cex?schema=public',
};
