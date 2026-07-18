# Routes Module (`/routes`)

This directory contains route definitions that define URL endpoints and map them to middlewares and controllers.

## Purpose

To isolate routing configuration from logic execution. By mapping URLs to controllers here, we maintain a clear map of the application's API endpoints.

## Structure

- `index.ts`: The main router that aggregates all domain routers (e.g., auth, users, wallets) and exposes a single unified router.
- Other specific route files should be added here (e.g., `auth.routes.ts`, `market.routes.ts`).

## Guidelines

1. **Keep it routing-only**: Do not write inline handler logic in route definitions. Only specify middleware chains and controller methods.
2. **RESTful structure**: Organize routes hierarchically and logically according to REST principles.
