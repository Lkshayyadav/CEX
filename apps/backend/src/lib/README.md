# Libraries Module (`/lib`)

This directory is reserved for third-party library initializations and wrappers.

## Purpose

To encapsulate external integrations (e.g., Database ORM clients, Redis clients, Logger instances, Mailers) so that the rest of the application is not tightly coupled to specific third-party library APIs.

## Structure

- `prisma.ts`: Exports a single shared instance of the Prisma Client.
- `index.ts`: Re-exports libraries as needed.

## Guidelines

1. **Singleton Pattern**: For resources like database or caching clients, initialize once and reuse across the application.
2. **Abstract complexity**: Avoid exposing internal details of third-party SDKs directly if they can be wrapped or standardized.
