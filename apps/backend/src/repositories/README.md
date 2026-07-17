# Repositories Module (`/repositories`)

This directory contains repository classes or functions that directly interact with the database or data stores.

## Purpose

To isolate database queries and ORM details (like Prisma) from the rest of the application. By abstracting query logic, business services can focus on logic rather than DB connections, join queries, or SQL dialects.

## Structure

- `index.ts`: Placeholder or base class for repositories.
- Individual repositories should be created per domain (e.g., `user.repository.ts`, `balance.repository.ts`).

## Guidelines

1. **Keep it focused**: Only write queries and data mapping inside repositories. Do not put business validation or authorization checks here.
2. **Encapsulate Prisma/ORM**: Do not return raw ORM entities directly if they leak DB-specific patterns; instead, map them to clean application models/types if necessary.
3. **Mockable**: By separating data access into repositories, it becomes much easier to unit-test services by mocking the repositories.
