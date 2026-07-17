# Configuration Module (`/config`)

This directory houses all configuration files, environment variable validation schemas, and application setting definitions.

## Purpose

To centralize all configuration settings of the application. It acts as the single source of truth for configuration values and ensures that invalid configurations or missing environment variables fail fast during application startup using Zod validation.

## Structure

- `env.ts`: Loads variables from the `.env` file via `dotenv`, defines a rigorous Zod schema for environment variables, validates them at startup, prints human-readable errors if validation fails, and exits the application immediately (fail-fast).
- `index.ts`: The main configuration file that imports the validated environment variables and exports a unified, fully typed, ready-to-use config object (`config`) for the rest of the application.

## Guidelines

1. **No direct `process.env` access elsewhere**: Code outside this module should never reference `process.env` directly. Instead, import configuration values from this directory:
   ```typescript
   import { config } from '../config';
   ```
2. **Fail Fast**: If any critical environment configuration is invalid or missing, the validation in `env.ts` triggers an immediate application exit (`process.exit(1)`) with a descriptive log.
3. **Type Safety**: Use the strongly typed `config` object which is derived directly from the Zod validation schema.
