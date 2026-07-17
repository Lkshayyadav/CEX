# Validators Module (`/validators`)

This directory houses all schemas or validation utilities used to validate client input (request body, request query, and request params).

## Purpose

To intercept incoming data at the routing level and ensure it meets strict typing, range, and format requirements before reaching controllers or services.

## Structure

- `index.ts`: Exports validation schemas and validation helper middleware.
- Individual validator files can be created per endpoint or domain (e.g., `auth.validator.ts`, `trade.validator.ts`).

## Guidelines

1. **Fail early**: Place input validation middleware directly in the route declaration so invalid data is rejected before any service or repository logic runs.
2. **Schema-driven**: Use validation libraries (like Zod or Joi) to define clean, declarative validation schemas.
