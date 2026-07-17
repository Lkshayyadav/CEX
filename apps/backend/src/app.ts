import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import pinoHttp from 'pino-http';
import router from './routes';
import { notFound, errorHandler } from './middleware';
import { config } from './config';

const app = express();

// 1. Helmet for security headers
app.use(helmet());

// 2. CORS configuration with allowed origins from configuration
app.use(
  cors({
    origin: config.corsAllowedOrigins,
    credentials: true,
  })
);

// 3. Built-in body parsing middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 4. Compression for minimizing payload sizes
app.use(compression());

// 5. Pino HTTP Request Logger for structured logging
app.use(
  pinoHttp({
    level: config.env === 'production' ? 'info' : 'debug',
    customAttributeKeys: {
      reqId: 'reqId',
    },
    // Avoid verbose logging of requests/responses in test/dev if needed, 
    // but keep standard settings for production auditing.
  })
);

// 6. Registered routes under API v1 path namespace
app.use('/api/v1', router);

// 7. Route not found fallback (404)
app.use(notFound);

// 8. Global Error Handler (must be the final middleware)
app.use(errorHandler);

export default app;
