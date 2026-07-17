# Middleware Module (`/middleware`)

This directory contains application middlewares that intercept and process HTTP requests before they reach the controllers, or responses before they are returned.

## Purpose

To implement cross-cutting concerns like logging, authentication, request validation, CORS, rate limiting, and global error handling in a reusable manner.

## Structure

- `index.ts`: Exports core middlewares like `errorHandler` and `logger`.
- Additional custom middlewares should be created as separate files (e.g., `auth.ts`, `role.ts`, `rateLimiter.ts`).

## Guidelines

1. **Keep it single-responsibility**: Each middleware should do one thing (e.g., check authentication, validate inputs, or log details).
2. **Global Error Handler**: Must have 4 parameters `(err, req, res, next)` to be recognized as an Express error-handling middleware.
3. **Always call `next()`**: Ensure execution proceeds to the next handler, or return a response (e.g. error) to terminate the request-response cycle.
