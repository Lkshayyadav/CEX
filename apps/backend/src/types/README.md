# Types Module (`/types`)

This directory houses global TypeScript interface, type, and module declarations.

## Purpose

To ensure strict type safety across all files in the backend. This includes type overrides for external libraries (like adding `user` context to Express's `Request`) and internal entity dtos.

## Structure

- `index.ts`: The main entry point to import/export types.
- Individual declaration files (e.g., `express.d.ts`) can be created for module augmentation.

## Guidelines

1. **Keep it clean**: Only type declarations belong here. Do not write executable TypeScript code (unless it's an enum or const assertion).
2. **Reuse package types**: Since this is a monorepo, prefer importing shared types from `@cex/types` (configured in workspace dependencies) where applicable.
