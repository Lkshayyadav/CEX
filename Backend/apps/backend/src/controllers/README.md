# Controllers Module (`/controllers`)

Controllers act as the entry point for HTTP requests. They parse and validate input, call the appropriate business services, and format the response.

## Purpose

To separate HTTP routing details (headers, cookies, status codes) from the core business logic (which lives in services).

## Structure

- `index.ts`: Serves as a registry or base utility export, and includes a placeholder example.
- Individual controller classes or files should be created for each resource (e.g., `user.controller.ts`, `trade.controller.ts`).

## Guidelines

1. **Keep them thin**: Controllers should not contain business logic or direct database queries. Instead, they should delegate to services.
2. **Handle errors gracefully**: Use `next(error)` to forward exceptions to the global error handling middleware, or use an async wrapper.
3. **HTTP-specific**: A controller knows about HTTP requests and responses. Services and repositories should not.
