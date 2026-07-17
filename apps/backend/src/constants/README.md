# Constants Module (`/constants`)

This directory contains application-wide constant values that do not change during runtime.

## Purpose

To prevent hardcoded magic numbers or strings throughout the codebase, making the application easier to maintain and update.

## Structure

- `index.ts`: The main entry point that exports constants groups, such as status codes, validation rules, or standard response messages.

## Guidelines

1. **Group by Category**: Keep constants categorized (e.g., HTTP status codes, error messages, user roles, system limits).
2. **Read-Only**: Ensure variables are defined with `as const` for TypeScript's read-only type inference.
