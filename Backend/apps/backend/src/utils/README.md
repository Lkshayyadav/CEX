# Utilities Module (`/utils`)

This directory houses utility functions and helper methods that are pure, side-effect-free, and reusable across the application.

## Purpose

To store common computations, formatting logic, math helpers, or encryption helpers, preventing code duplication.

## Structure

- `index.ts`: Exposes utility functions.

## Guidelines

1. **Keep it Pure**: Whenever possible, utilities should be pure functions (same input yields same output, with no database calls or API side-effects).
2. **Independent**: Utilities should not depend on controllers, routes, or services.
