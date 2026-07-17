import express from 'express';
import { requestLogger, errorHandler } from './middleware';
import router from './routes';

const app = express();

// Standard parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Global Request Logger
app.use(requestLogger);

// API Router registration
app.use('/api', router);

// Default wildcard fallback handler for 404s
app.use((req, res, next) => {
  const error: any = new Error(`Cannot ${req.method} ${req.path}`);
  error.status = 404;
  next(error);
});

// Global Error Handler
app.use(errorHandler);

export default app;
