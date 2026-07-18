# Services Module (`/services`)

This directory houses all business logic of the application. Services coordinate data flow between repositories, apply business validation rules, and run computations.

## Purpose

To isolate pure business logic from the transport layer (Express controllers) and data layer (Prisma repositories). Services are the core of your backend application.

## Structure

- `index.ts`: Re-exports service classes/functions, and contains a placeholder.
- Individual services should be defined per resource or action (e.g., `auth.service.ts`, `trade.service.ts`).

## Guidelines

1. **Transport Agnostic**: Services should not know about Express `req` or `res` objects. They receive raw parameters (like strings, numbers, objects) and return data or throw errors.
2. **Transactional Safety**: Wrap operations that modify multiple tables in database transactions.
3. **Reusable**: Services can be reused across different controllers (e.g., HTTP controllers, cron jobs, WebSockets, CLI commands).
