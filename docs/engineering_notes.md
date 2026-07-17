# Engineering Notes & Learning Notebook

This is a personal engineering notebook tracking the design decisions, architecture choices, lessons learned, and implementation details during the development of this Centralized Exchange (CEX).

---

## Phase 0: Planning & Design

### Tasks Completed
*   Defined product requirements for a production-grade Centralized Exchange (CEX).
*   Designed the structural layouts of services and libraries.
*   Chose the repository architecture (monorepo vs. multi-repo).

### What We Built
*   Conceptual blueprint outlining:
    *   `apps/backend` (REST/WebSocket API Gateway)
    *   `apps/engine` (Stateful Matching Engine)
    *   `apps/frontend` (Trading Dashboard/Terminal)
    *   `packages/common` (Shared helpers, DB connections, math utility)
    *   `packages/types` (Shared types/interfaces)

### Why We Built It
*   **Separation of Concerns**: A CEX demands separation between the network/client gateway and the transaction execution matching engine.
*   **Low Latency**: The matching engine must be stateful and operate memory-resident (in-memory order book) without blocking on HTTP processing or database writes. The backend acts as a stateless queue buffer.

### Files Created
*   None (Planning stage).

### Commands Used
*   None.

### Important Concepts
*   **Stateless vs. Stateful Microservices**: API gates can scale horizontally (stateless). Matching engines must run as single instances per market/symbol to avoid race conditions and maintain strict execution ordering (stateful).
*   **Monorepo Benefits**: Allows instantaneous code sharing of API types and math utilities between frontend and backend without hosting a private npm registry.

### Architecture Decisions
*   **pnpm Monorepo**: Selected pnpm for its fast installation times, workspace symlinking, and disk-space-friendly content-addressable store.

### Interview Questions
1.  *Why decouple the Matching Engine from the API Gateway/Backend in an exchange?*
    *   **Answer**: Decoupling prevents HTTP network congestion, JSON parsing overhead, and database locks from introducing latency into the order book. The API gateway validates and accepts orders, putting them into a queue, while the engine processes them sequentially.
2.  *What are the synchronization risks of running multiple matching engine instances for the same pair (e.g., BTC/USDT)?*
    *   **Answer**: High risk of race conditions, double-spend, and out-of-order matching. A matching engine for a specific market must process orders sequentially (single-threaded or single-process queue executor) to guarantee correct price-time priority.

### Common Mistakes
*   Designing the matching engine to write to a SQL database for *every* incoming limit order before matching. This introduces disk I/O bottlenecks and limits throughput to a few hundred transactions per second.

### Notes for Future
*   Prepare messaging patterns (e.g., Redis PubSub or Kafka) early on to bridge the backend and matching engine.

---

## Phase 1: Task 1.1 (Monorepo Setup)

### Tasks Completed
*   Created workspace folders.
*   Created workspace configuration files.
*   Configured root-level script orchestration.

### What We Built
*   A fully initialized pnpm workspace containing root `package.json`, `pnpm-workspace.yaml`, `tsconfig.json`, and `.gitignore`.

### Why We Built It
*   To establish a unified dev environment where workspace linking is automated and TypeScript configurations are inherited.

### Files Created
*   `pnpm-workspace.yaml`
*   `package.json`
*   `tsconfig.json`
*   `.gitignore`
*   `README.md`
*   `docs/README.md`
*   `docker/README.md`

### Commands Used
*   `npx pnpm install`: Installs root devDependencies and symlinks workspaces.

### Important Concepts
*   **Workspace Protocol (`workspace:*`)**: Tells pnpm to resolve dependencies locally inside the repository workspace instead of fetching them from the npm registry.
*   **Root Manifest Panning**: Using `"private": true` on the root package prevents accidental publishing of the container workspace.

### Architecture Decisions
*   **Base TypeScript Inheritance**: Created a root `tsconfig.json` defining strict rules (like `strict: true` and `skipLibCheck: true`), which individual packages extend. This ensures uniform code standards.

### Interview Questions
1.  *How does pnpm workspaces handle symlinking under the hood compared to npm/yarn v1?*
    *   **Answer**: pnpm uses hard links and symlinks to create a nested `node_modules` layout that matches the true dependency tree, preventing "phantom dependencies" while sharing global store files across packages.

### Common Mistakes
*   Accidentally committing massive `node_modules` or `.turbo` files because the root `.gitignore` was configured too late.

### Notes for Future
*   Ensure all workspace projects declare distinct name scopes (e.g., `@cex/name`) to prevent name collision with external npm packages.

---

## Phase 1: Task 1.2 (Backend Foundation)

### Tasks Completed
*   Created the backend app workspace (`apps/backend`).
*   Configured Express server listening on port 3000.
*   Integrated database layer with Prisma ORM pointing to PostgreSQL.
*   Created the entry point file and environmental configurations.

### What We Built
*   A basic, compiling REST endpoint (`GET /`) with Prisma schema layout and `.env` loader.

### Why We Built It
*   To establish the web entry gateway and prepare the DB connection schema.

### Files Created
*   `apps/backend/package.json`
*   `apps/backend/tsconfig.json`
*   `apps/backend/.env`
*   `apps/backend/src/index.ts`
*   `apps/backend/prisma/schema.prisma`

### Commands Used
*   `npx pnpm install` (Root): Re-ran to link Express, Prisma, and typescript types.
*   `npx pnpm --filter @cex/backend build`: Compiles TS into `dist/`.

### Important Concepts
*   **Schema Initialization**: Defining `datasource db` with the `postgresql` provider and assigning `url = env("DATABASE_URL")`.
*   **TSX Execution**: Using `tsx` (TypeScript Execute) for fast development watch runs without needing a manual build step.

### Architecture Decisions
*   **Extended TS Config**: `apps/backend/tsconfig.json` extends `../../tsconfig.json` but specifies project-specific `rootDir` and `outDir`.
*   **Clean Build Script**: Set the backend build command to `tsc`. We decoupled `prisma generate` from the standard build pipeline for now because Prisma fails client generation if there are zero models in the schema file.

### Interview Questions
1.  *Why does Prisma Client need to be generated (`prisma generate`), and how does this affect TypeScript typings?*
    *   **Answer**: Prisma reads the `schema.prisma` file and generates a custom TypeScript client tailor-made for your database models. This injects accurate, autocomplete-ready types directly into `node_modules/.prisma/client`, ensuring compile-time safety.
2.  *Why does "prisma generate" fail if no models are defined in schema.prisma?*
    *   **Answer**: Prisma needs at least one model declaration to generate typings and database access methods. When schema.prisma only contains datasource and generator blocks, there is nothing for Prisma to build, prompting a validation error.

### Common Mistakes
*   Hardcoding connection strings inside `schema.prisma` instead of utilizing `env("DATABASE_URL")`, exposing credentials in git.

### Notes for Future
*   Ensure that models are defined before executing the first build that has a generated prisma client dependency step.

---

## Phase 1: Task 1.3 (Database Schema Design)

### Tasks Completed
*   Designed the core database models (`User`, `Wallet`, `Balance`, `Market`, `Order`, `Fill`, `Transaction`).
*   Established explicit table relationships (1-to-many, many-to-many, etc.).
*   Added database enums for system states (`OrderSide`, `OrderType`, `OrderStatus`, `TransactionType`, `TransactionStatus`).
*   Configured precise PostgreSQL `Decimal` types and performance indexes.

### What We Built
*   A production-ready database schema definition in `apps/backend/prisma/schema.prisma`.

### Why We Built It
*   **Precision Safety**: Financial applications cannot afford floating-point rounding errors. Using `@db.Decimal(32, 16)` guarantees 16-decimal precision for crypto balances, order quantities, and prices.
*   **Scalable Lookups**: CEX databases scale rapidly in terms of transactions and order records. Adding indexes on query keys (`userId`, `marketId`, `status`, `createdAt`) ensures query times remain constant as the dataset grows.

### Files Created
*   Updated `apps/backend/prisma/schema.prisma`
*   Updated `apps/backend/package.json`

### Commands Used
*   `npx pnpm --filter @cex/backend prisma:generate`
*   `npx pnpm build` (Root)

### Important Concepts
*   **Locked vs. Free Balances**: Partitioning user assets prevents double-spending. When an order is placed, the required balance is moved from `free` to `locked`.
*   **Financial Audit Trails**: Trades (`Fill`) link two separate orders (`maker` and `taker`) back to their parent records.

### Architecture Decisions
*   **onDelete Safety**: Linked `User` -> `Wallet`/`Balance` with `onDelete: Cascade`, but set `onDelete: Restrict` on orders and fills to preserve trade history for accounting audits.
*   **Build Pipeline Integration**: Re-established automatic client generation (`pnpm prisma:generate && tsc`) in the backend workspace since models are now present.

### Interview Questions
1.  *Why use Decimal instead of Float for transaction ledgers?*
    *   **Answer**: Floating-point numbers use binary fractions (IEEE 754) causing loss of precision (e.g. `0.1 + 0.2 !== 0.3`). Decimal types use exact base-10 calculations.
2.  *What is the purpose of distinguishing maker and taker orders in a Fill record?*
    *   **Answer**: It is crucial for fee calculation (maker vs taker fees often differ) and reconstructibility of execution matching history.

### Common Mistakes
*   Using default prisma numbers (`Float`) for assets.
*   Forgetting indexes on foreign keys, causing heavy table scans during high-traffic order placements.

### Notes for Future
*   Once a PostgreSQL database is spun up, generate migrations and configure database seed data.

---

## Phase 1: Task 1.4 (Refined CEX Database Architecture)

### Tasks Completed
*   Removed the `Wallet` model and its corresponding relationships.
*   Introduced the `Asset` model as a single source of truth for all currencies (crypto and fiat).
*   Refactored `Balance`, `Market`, `Fill`, and `Transaction` models to establish relationships pointing directly to `Asset` table references.
*   Ensured indexes, primary keys, and decimal configurations remained intact.

### What We Built
*   An updated CEX database schema (`apps/backend/prisma/schema.prisma`) featuring normalized asset configuration mapping.

### Why We Built It
*   **Decoupled Deposit Layer**: Centrally-maintained internal exchange bookkeeping does not require direct link to on-chain wallet objects. Decoupling wallets into a separate future service prevents over-complication of the core ledger.
*   **Normalized Asset Properties**: Storing decimals, symbols, names, and active flags on an `Asset` table allows the exchange to support new coins/currencies dynamically without mutating existing schema properties.
*   **Enforced Referential Integrity**: Restricting deletion of assets (`onDelete: Restrict`) when active markets, balances, or transactions references exist ensures data consistency.

### Files Created
*   Updated `apps/backend/prisma/schema.prisma`

### Commands Used
*   `npx pnpm --filter @cex/backend build`

### Important Concepts
*   **Asset Decimals Precision**: Storing asset-specific precision decimals (e.g. 8 for BTC, 18 for ETH, 2 for fiat INR) allows the system to validate inputs and format values correctly dynamically.
*   **Data Integrity via Foreign Keys**: Replacing string identifiers (e.g. `asset: "BTC"`) with foreign key IDs (`assetId` pointing to an `Asset` record) prevents typos and guarantees referential consistency.

### Architecture Decisions
*   **Market Asset Mapping**: Markets now link to two distinct relations in the `Asset` model (`baseAsset` and `quoteAsset`) utilizing explicit naming `@relation("BaseAsset")` and `@relation("QuoteAsset")`.
*   **Restrictive Deletes on Assets**: Set `onDelete: Restrict` on all models that reference `Asset`. This prevents deleting an asset that has active orders, historical transactions, or client balances.

### Interview Questions
1.  *What is the difference between cascade and restrict referential actions, and why use restrict for financial assets?*
    *   **Answer**: `onDelete: Cascade` automatically deletes child rows when parent rows are deleted. `onDelete: Restrict` prevents parent deletion if child dependencies exist. We use `Restrict` on assets because deleting an asset while users hold balances or have transaction histories would lead to unbalanced ledgers and auditing gaps.
2.  *How do you handle trading markets where both assets reference the same table?*
    *   **Answer**: In Prisma, this is done by declaring named relations (e.g. `@relation("BaseAsset")` and `@relation("QuoteAsset")`) to clearly map two separate foreign keys in the `Market` model (`baseAssetId` and `quoteAssetId`) to the same `Asset` model.

### Common Mistakes
*   Failing to add indexes on both base and quote asset columns, leading to slower joins when fetching ticker prices.
*   Using string columns for assets in high-frequency order systems, which increases index size and degrades performance compared to short key lookups.

### Notes for Future
*   When seed data is added, ensure the `Asset` table is populated first so that markets and user balances can resolve their relationships.

---

## Phase 1: Task 1.5 (Final Database Refinements)

### Tasks Completed
*   Added `username` to the `User` model with a unique constraint.
*   Renamed `Market.name` to `Market.symbol`.
*   Added `remainingQuantity` and `averageFillPrice` fields to the `Order` model.
*   Added `marketId` to the `Fill` model to link trades directly to their markets.
*   Added `referenceId` to the `Transaction` model to generalize banking, fiat, and internal transfers.
*   Preserved all existing relational integrity rules, indexes, and decimal precisions.

### What We Built
*   The final production-ready CEX database schema (`apps/backend/prisma/schema.prisma`) featuring advanced order state and querying optimizations.

### Why We Built It
*   **Unique Usernames**: Crucial for profile representation, identification during internal logging, and implementing invite/referral programs.
*   **Industry Terminology**: Renaming `name` to `symbol` aligns the codebase with industry standards (e.g. CCXT, Binance, Coinbase specifications).
*   **Order Tracking Optimization**: Storing `remainingQuantity` and `averageFillPrice` directly in the database speeds up calculations in the order match lifecycle and prevents expensive runtime joins/calculations of active orders.
*   **Simplified Trade Querying**: By linking `Fill` directly to `Market` via `marketId`, we can fetch ticker historical trades with a simple SELECT query rather than joining across maker and taker orders.
*   **Generalized Ledger Tracking**: Adding `referenceId` to transactions generalizes our database to support non-blockchain payment systems (Razorpay, UPI, bank transfers) without abusing `txHash` columns.

### Files Created
*   Updated `apps/backend/prisma/schema.prisma`

### Commands Used
*   `npx pnpm --filter @cex/backend build`

### Important Concepts
*   **Weighted Average Price**: The average fill price calculates execution cost across multiple partial executions at different price points.
*   **De-normalization for Speed**: Storing fields like `remainingQuantity` and `marketId` directly inside child models represents a deliberate design trade-off to optimize query performance in high-frequency trading contexts.

### Architecture Decisions
*   **Direct Fill-to-Market Link**: Storing `marketId` directly in `Fill` allows the system to build real-time market candlesticks (OHLC) directly from trade executions without querying order details.

### Interview Questions
1.  *Why is it useful to denormalize the remainingQuantity field in the Order model?*
    *   **Answer**: Although `remainingQuantity` is mathematically `quantity - filledQuantity`, storing it explicitly speeds up order book evaluations. The matching engine does not need to compute arithmetic values on decimal fields when checking order status.
2.  *Why should transaction history support both referenceId and txHash?*
    *   **Answer**: Centralized exchanges operate at the boundary of traditional finance (fiat gateways) and decentralized networks (crypto nodes). A `txHash` is blockchain-specific, whereas a generic `referenceId` accommodates bank reference numbers, payment processor checkout IDs, and internal audit IDs.

### Common Mistakes
*   Relying solely on blockchain transactions when storing exchange ledger records, which makes fiat operations difficult to model.
*   Failing to index `marketId` on the `Fill` table, leading to database degradation when loading public trade histories.

### Notes for Future
*   The schema is now fully primed for core business logic. Next step is building matching engine mechanisms.

---

## Phase 2: Configuration & Database Connection Management

### Tasks Completed
*   Implemented a production-grade configuration validation system using Zod and dotenv.
*   Enforced fail-fast checks at startup for critical environment variables (`NODE_ENV`, `PORT`, `DATABASE_URL`, `JWT_SECRET`, `REDIS_URL`).
*   Created a standard Prisma Client singleton module in `apps/backend/src/lib/prisma.ts`.
*   Documented connection-pooling and hot-reloading gotchas in development.

### What We Built
*   `apps/backend/src/config/env.ts` and `apps/backend/src/config/index.ts`: The validation and typed configuration boundary.
*   `apps/backend/src/lib/prisma.ts`: A shared database connection singleton preventing resource leaks.
*   Updated `middleware/index.ts` to consume settings from the typed config instead of raw `process.env`.

### Why We Built It
*   **Fail-Fast Startup**: It is dangerous to run servers in production with misconfigured environment variables (like missing `JWT_SECRET` or incorrect database URL). Crashing immediately on startup makes configuration errors highly visible.
*   **Prevent Connection Leakage**: In Node.js environment, hot reloads in development rebuild modules. If a new `PrismaClient` is instantiated on every module reload, the database connections are quickly exhausted. Storing the active connection pool in a global namespace resolves this issue.

### Files Created/Updated
*   `apps/backend/src/config/env.ts`
*   `apps/backend/src/config/index.ts`
*   `apps/backend/src/lib/prisma.ts`
*   `apps/backend/src/middleware/index.ts`
*   `apps/backend/.env`
*   `docs/engineering_notes.md`

### Commands Used
*   `npx pnpm --filter @cex/backend add zod`: Installs Zod library.
*   `npx pnpm --filter @cex/backend run build`: Compiles TypeScript workspace to verify types.

### Important Concepts
*   **Prisma Client Lifecycle**: The Client handles connection pools and executes a Node-to-Rust native bridge. Because of this architecture, instantiation has a high process/memory overhead.
*   **Zod Coercion**: Using `z.coerce.number()` to automatically cast string port values from `.env` files into correct TypeScript number types.

### Architecture Decisions
*   **Config Isolation**: Standardized on importing `config` via `import { config } from '../config'` to restrict `process.env` lookups to a single file, eliminating phantom dependency on OS variables across controllers or services.

### Interview Questions
1.  *What is a connection pool leak, and how does the global Prisma singleton pattern prevent it in local development environments?*
    *   **Answer**: In local development, framework watchdogs reload the module graph on every save. In doing so, any instantiation of a database client at the module scope is run again, opening a new connection pool. The old connection pools remain open until garbage collected or timed out by the database server. A global singleton prevents this by caching the instantiated client on Node's `global` object, which persists across module invalidation reloads.
2.  *Why use schema validation like Zod for environment variables instead of standard fallback checks?*
    *   **Answer**: Fallback checks (e.g. `const port = process.env.PORT || 3000`) silently accept invalid values (like alphabetic strings) and defer failure until runtime. Zod validation parses, transforms, and validates variable formats at boot time, ensuring the application fails early and clearly if the configuration is invalid.

### Common Mistakes
*   Instantiating multiple `PrismaClient` objects inside individual repository or service files rather than importing a shared singleton instance, which leads to immediate connection limits being reached.
*   Failing to coerce data types (like port number) when retrieving variables from `process.env`, leading to runtime type errors.

---

## Phase 2.4: Express Application Bootstrap

### Tasks Completed
*   Configured Express application bootstrap inside `app.ts` registering `express.json()`, `cors`, `helmet`, `compression`, and `pino-http`.
*   Moved 404 (not found) and global error handling logic into modular dedicated middleware files (`not-found.ts` and `error-handler.ts`).
*   Configured `/api/v1/health` route.
*   Updated application entry point (`index.ts`) to use structured logger (Pino), accept typed configurations, and handle graceful shutdown signals (SIGINT/SIGTERM).

### What We Built
*   `apps/backend/src/middleware/not-found.ts`: Handles requests mapping to non-existent routes.
*   `apps/backend/src/middleware/error-handler.ts`: Dedicated global error handling and formatting middleware that integrates with Pino logger.
*   `apps/backend/src/routes/index.ts`: Exposes API endpoints under `/api/v1/health`.
*   `apps/backend/src/app.ts`: Orchestrates security, compression, request parsing, logging, and routing.
*   `apps/backend/src/index.ts`: Orchestrates startup connection checks, listening, and graceful termination hooks.

### Why We Built It
*   **Security & Performance**: Incorporating Helmet protects the server from well-known web vulnerabilities by setting appropriate HTTP headers, and Compression reduces the bandwidth consumption of JSON responses.
*   **Structured Logging**: Production apps require structured JSON logging (like Pino) instead of unstructured `console.log`. Pino logs are JSON formatted, allowing aggregation services (like Datadog, ELK, or CloudWatch) to easily parse and query logs.
*   **Graceful Shutdown**: Abruptly terminating a node application leaves active requests hanging, doesn't close database pools (causing stale socket connections), and can corrupt states. Properly handling SIGTERM and SIGINT lets the server finish processing active requests, close database client instances, and exit cleanly.

### Files Created/Updated
*   `apps/backend/src/middleware/not-found.ts`
*   `apps/backend/src/middleware/error-handler.ts`
*   `apps/backend/src/middleware/index.ts`
*   `apps/backend/src/routes/index.ts`
*   `apps/backend/src/app.ts`
*   `apps/backend/src/index.ts`
*   `docs/engineering_notes.md`

### Commands Used
*   `npx pnpm --filter @cex/backend add cors helmet compression pino pino-http`
*   `npx pnpm --filter @cex/backend add -D @types/cors @types/compression`
*   `npx pnpm --filter @cex/backend run build`

### Important Concepts
*   **HTTP Middleware Chain**: In Express, middleware acts as a pipeline. Middleware registered at the end (like `errorHandler`) receives unhandled exceptions thrown by prior middlewares or route handlers.
*   **Signal Handling**: SIGINT is sent on Ctrl+C (interactive terminal interrupt), and SIGTERM is the default termination signal sent by container orchestration environments (like Kubernetes or AWS ECS) before force-killing a container.

### Interview Questions
1.  *Why is it important to stop accepting HTTP requests before disconnecting from the database during graceful shutdown?*
    *   **Answer**: If you disconnect from the database first, any HTTP requests currently being processed or arriving in the milliseconds before the server shuts down will fail with database access exceptions. By shutting down the HTTP server first, you ensure no new requests are accepted and existing requests finish, then it is safe to close the database connection.
2.  *What are the advantages of Pino over loggers like Winston or standard console.log?*
    *   **Answer**: Pino is highly optimized for performance and is much faster than Winston because it does not block the event loop for string manipulation (it serializes logs quickly to JSON format). Additionally, structured logging enables querying and filtering log messages programmatically.

### Common Mistakes
*   Registering the global error handler middleware *before* the router or other middlewares, causing errors in route handlers to skip the error handler.
*   Not cleaning up native child processes or database connections on SIGINT/SIGTERM, causing containers to hang in a zombie state for 10-30 seconds until the system forcefully kills them.

---

## Phase 3.0: Authentication Module (Register & Login)

### Tasks Completed
*   Installed bcrypt, jsonwebtoken, and their TypeScript type definitions.
*   Built authentication module following strict Clean Architecture boundaries:
    `Route` → `Controller` → `Service` → `Repository` → `Prisma`
*   Created Zod validation schemas for registration and login requests, using a custom express validation middleware.
*   Implemented `POST /api/v1/auth/register` with unique checks for username and email, bcrypt password hashing, and database storage.
*   Implemented `POST /api/v1/auth/login` supporting dual-lookup (by email or username), bcrypt password comparison, and JWT access token signing (24h validity).
*   Created password, JWT, and standardized API response utilities, and structured constants for message and status definitions.
*   Created a placeholder `requireAuth` middleware.

### What We Built
*   `apps/backend/src/constants/http-status.ts` & `apps/backend/src/constants/messages.ts`: Enforces centralized status and text values.
*   `apps/backend/src/utils/password.ts` & `apps/backend/src/utils/jwt.ts`: Cryptographic wrappers for password handling and token administration.
*   `apps/backend/src/utils/response.ts`: Structured JSON envelopes for unified client responses, including an `AppError` class for propagation.
*   `apps/backend/src/validators/auth.validator.ts`: Zod schema validation rules for incoming JSON bodies.
*   `apps/backend/src/repositories/auth.repository.ts`: Direct queries to PostgreSQL via Prisma Client.
*   `apps/backend/src/services/auth.service.ts`: Implements business validation rules (email/username uniqueness, credentials checking).
*   `apps/backend/src/controllers/auth.controller.ts`: Unwraps Express requests, calls service, and returns standardized envelopes.
*   `apps/backend/src/middleware/auth.middleware.ts`: Placeholder middleware for JWT checking.
*   `apps/backend/src/routes/auth.routes.ts`: Binds paths to validate middlewares and controllers.

### Why We Built It
*   **Segregation of Concerns**: Separating repositories (database syntax) from services (business rules) allows us to change database ORMs (e.g. from Prisma to raw SQL or another database driver) without modifying any business logic inside the service layer.
*   **Standardized API Contracts**: Clients (like web apps, mobile apps, or third-party integrations) rely on predictable API formats. Standardizing response shapes to always follow `{ success: true, message: string, data: T }` or `{ success: false, error: { message: string, details: any } }` simplifies client-side parsing.
*   **Password Safety**: We never store plaintext passwords. Using `bcrypt` with a work factor of 12 ensures that passwords are computationally expensive to brute-force even in the event of a database compromise.

### Files Created/Updated
*   `apps/backend/src/constants/http-status.ts`
*   `apps/backend/src/constants/messages.ts`
*   `apps/backend/src/constants/index.ts`
*   `apps/backend/src/types/auth.ts`
*   `apps/backend/src/types/index.ts`
*   `apps/backend/src/utils/password.ts`
*   `apps/backend/src/utils/jwt.ts`
*   `apps/backend/src/utils/response.ts`
*   `apps/backend/src/utils/index.ts`
*   `apps/backend/src/validators/auth.validator.ts`
*   `apps/backend/src/validators/index.ts`
*   `apps/backend/src/repositories/auth.repository.ts`
*   `apps/backend/src/repositories/index.ts`
*   `apps/backend/src/services/auth.service.ts`
*   `apps/backend/src/services/index.ts`
*   `apps/backend/src/controllers/auth.controller.ts`
*   `apps/backend/src/controllers/index.ts`
*   `apps/backend/src/middleware/auth.middleware.ts`
*   `apps/backend/src/middleware/index.ts`
*   `apps/backend/src/routes/auth.routes.ts`
*   `apps/backend/src/routes/index.ts`
*   `docs/engineering_notes.md`

### Commands Used
*   `npx pnpm --filter @cex/backend add bcrypt jsonwebtoken`
*   `npx pnpm --filter @cex/backend add -D @types/bcrypt @types/jsonwebtoken`
*   `npx pnpm --filter @cex/backend run build`

### Important Concepts
*   **JWT Stateless Authentication**: A signed token allows servers to identify and trust a user request without performing a database lookup on every API access, saving database roundtrips.
*   **Clean Architecture Segregation**: Ensures that controllers only know about HTTP protocols, services only know about business rules, and repositories only know about database persistence details.

### Interview Questions
1.  *Why should controllers never import or query the Prisma Client directly in Clean Architecture?*
    *   **Answer**: Directly coupling controllers to the ORM bypasses the service (business rules) and repository (data access abstraction) layers. If you want to change persistence technologies (e.g. migrate to a partition-scaled database), or inject custom auditing or event dispatching routines during writes, you would have to refactor every controller rather than updating a single repository or service method.
2.  *What is a rainbow table attack, and how does salting passwords prevent it?*
    *   **Answer**: Rainbow tables are precomputed tables of cryptographic hashes of common passwords. If a database is compromised, attackers can instantly reverse hashes back to plaintext. Salting appends a unique, random string to each password before hashing, forcing attackers to compute hashes individually for each user, rendering precomputed tables useless.

### Common Mistakes
*   Leaking sensitive fields (like `passwordHash`) in API response objects, which increases risk in logging pipelines or client-side caching.
*   Using simple, fast hash algorithms (like MD5 or SHA256) for passwords. These algorithms are designed for speed, allowing attackers to check billions of hashes per second. slow hashing functions (like Bcrypt or Argon2) must be used instead.

---

## Phase 3.1: JWT Authentication Middleware & Protected Routes

### Tasks Completed
*   Implemented `requireAuth` JWT validation middleware in `auth.middleware.ts`.
*   Extended Express `Request` type using declaration merging inside `types/express.d.ts` to allow access to a strongly-typed `req.user`.
*   Added `findById` lookup query in `auth.repository.ts`.
*   Added `getCurrentUser` profile getter in `auth.service.ts` excluding sensitive credentials (`passwordHash`).
*   Created `getCurrentUser` controller action in `auth.controller.ts` returning standard responses.
*   Protected `GET /api/v1/auth/me` with the `requireAuth` middleware.

### What We Built
*   `apps/backend/src/types/express.d.ts`: Adds type safety to Express request objects for tracking signed-in users.
*   `apps/backend/src/middleware/auth.middleware.ts`: Validates Bearer authorization headers and prevents cryptographic details from escaping to API clients.

### Why We Built It
*   **Declaration Merging**: Extending the namespace of external libraries (like Express) is a TypeScript best practice. It prevents developer hacks (such as casting to `any` or using `// @ts-ignore`) and enforces autocomplete and type checks during request processing.
*   **Token Obfuscation**: Intercepting and mapping JWT library errors to a generic "Access unauthorized" response prevents attackers from diagnosing structural details of our token system (e.g. checking signature schemes or algorithm details).

### Files Created/Updated
*   `apps/backend/src/types/express.d.ts`
*   `apps/backend/src/middleware/auth.middleware.ts`
*   `apps/backend/src/repositories/auth.repository.ts`
*   `apps/backend/src/services/auth.service.ts`
*   `apps/backend/src/controllers/auth.controller.ts`
*   `apps/backend/src/routes/auth.routes.ts`
*   `docs/engineering_notes.md`

### Commands Used
*   `npx pnpm --filter @cex/backend run build`

### Important Concepts
*   **Declaration Merging**: Type definitions with the exact same name and namespace merge automatically under TypeScript compilation.
*   **Bearer Scheme**: The HTTP standard way of sending credentials using the `Authorization: Bearer <token>` header format.

### Interview Questions
1.  *What is TypeScript Declaration Merging and why is it preferred over casting requests to 'any'?*
    *   **Answer**: Declaration merging compiles additional type properties directly into existing modules (like Express's `Request` interface). Casting to `any` turns off TypeScript's compiler safety checks, leading to typos or refactoring bugs failing silently during development and breaking in production. Merging preserves type-checking and IDE autocomplete.
2.  *Why is it important to scrub internal JWT errors before sending HTTP error responses?*
    *   **Answer**: JWT libraries throw verbose errors (e.g., `invalid signature`, `jwt signature is invalid`, `jwt malformed`, or `jwt expired`). Returning these verbatim to the client assists attackers with probe diagnostics, letting them know if a signature is syntactically correct but expired, or if a signature verification routine was executed, which leaks infrastructure context.

### Common Mistakes
*   Casting `req` to `any` to set custom values in middleware, which silences warnings but destroys type checking in downstream controllers.
*   Forgetting to verify if the token exists inside the `Authorization` string after splitting the Bearer prefix, which can result in runtime crashes.

---

## Phase 3.2: Asset & Market Management

### Tasks Completed
*   Created type definitions for assets and markets in `types/market.ts`.
*   Implemented `marketRepository` with queries targeting active assets, active markets, and market by symbol using selective field inclusion.
*   Implemented `marketService` to handle asset and market lists, decimal-to-string mapping, and not-found validations.
*   Implemented `marketController` with endpoints to retrieve assets, markets, and detailed market information by symbol.
*   Created Zod request params validator schema `getMarketBySymbolSchema` inside `validators/market.validator.ts`.
*   Implemented generic `validateRequestParams` middleware in the validator layer to handle path parameter schema validation.
*   Mounted market sub-routes (`/assets` and `/markets`) to the main API v1 router.
*   Verified that the TypeScript project builds successfully.

### What We Built
*   `apps/backend/src/types/market.ts`: Defines strong typings for Asset and Market entities.
*   `apps/backend/src/repositories/market.repository.ts`: Handles Prisma queries using `select` and `include` projections to prevent over-fetching.
*   `apps/backend/src/services/market.service.ts`: Translates database-level `Decimal` values into safe string formats for accurate JSON serialization.
*   `apps/backend/src/validators/market.validator.ts`: Validates the market symbol parameter format (e.g. `BTC/USDT`).

### Why We Built It
*   **Precision Safety**: Financial values must not be serialized as Javascript floating-point numbers due to the risk of decimal precision loss. Mapping values to strings in the service layer enforces data integrity.
*   **Parameter Validation**: Validating route parameters like `:symbol` prior to hitting the controller reduces database load from malformed queries and prevents unexpected errors.

### Files Created/Updated
*   `apps/backend/src/types/market.ts`
*   `apps/backend/src/repositories/market.repository.ts`
*   `apps/backend/src/services/market.service.ts`
*   `apps/backend/src/controllers/market.controller.ts`
*   `apps/backend/src/routes/market.routes.ts`
*   `apps/backend/src/validators/market.validator.ts`
*   `apps/backend/src/validators/index.ts`
*   `apps/backend/src/routes/index.ts`
*   `docs/engineering_notes.md`

### Commands Used
*   `npx pnpm --filter @cex/backend run build`

### Important Concepts
*   **Precision and Decimals**: Centralized exchange records must avoid standard binary floating-point representation. Decimals should be mapped to strings or handled with special decimal arithmetic libraries.
*   **Param-Level Validation**: Route parameters require standard validation and coercion patterns just like request body inputs.

### Interview Questions
1.  *Why do we represent financial values (like transaction amounts or order prices) as strings or Decimal types in API responses rather than JavaScript numbers?*
    *   **Answer**: Standard JavaScript numbers are double-precision floating-point numbers (IEEE 754). They cannot accurately represent decimal fractions, resulting in rounding errors (like `0.1 + 0.2 = 0.30000000000000004`). In financial exchanges, even a tiny rounding error can cause audits to fail and lose capital. String representations preserve exact digits, and operations are performed using specialized decimal libraries (like `decimal.js`).
2.  *How do selective includes or select statements in Prisma prevent over-fetching and improve DB performance?*
    *   **Answer**: By default, Prisma queries fetch all columns from the database tables. Using `select` or explicit `include` with projections ensures only the needed fields are queried and returned by the SQL server. This reduces memory footprint, serialisation costs, and network payload sizes, leading to faster response times.

### Common Mistakes
*   Using double-precision float values for asset decimals and trade quantities, resulting in rounding errors.
*   Directly mapping path parameters to database queries without regex validation, which opens up SQL/NoSQL injections or unnecessary DB queries.

---

## Phase 3.3: User Balance Management (Internal Exchange Ledger)

### Tasks Completed
*   Created type definitions for user balances and deposit inputs in `types/balance.ts`.
*   Implemented `balanceRepository` handling user balance retrieval, single asset lookup, record creation, and free balance increments.
*   Implemented `balanceService` to manage user balances list, asset existence verification, and simulated deposit logic wrapped inside a Prisma transaction block.
*   Implemented `balanceController` with protected endpoints to retrieve user balances, a single asset's balance, and deposit simulated funds.
*   Created Zod schemas for validating path parameters and request body values inside `validators/balance.validator.ts`.
*   Mounted balance sub-routes under the `/balances` path namespace in `routes/index.ts`.
*   Verified that the TypeScript project builds successfully.

### What We Built
*   `apps/backend/src/types/balance.ts`: Data Transfer Objects representing balance snapshots and deposit inputs.
*   `apps/backend/src/repositories/balance.repository.ts`: Abstracts raw Prisma queries, supporting transaction-aware updates and database-level numeric increments.
*   `apps/backend/src/services/balance.service.ts`: Implements business validation rules (such as asset check logic) and enforces transaction integrity during deposits.
*   `apps/backend/src/controllers/balance.controller.ts`: Authenticates req.user presence and bridges the API gateway to the services layer.
*   `apps/backend/src/validators/balance.validator.ts`: Houses validation rules for body inputs and route params.

### Why We Built It
*   **Prisma Transaction Isolation**: Simultaneous deposit actions or ledger updates can lead to race conditions. Wrapping balance queries, creates, and writes in a single `$transaction` ensures updates execute sequentially and atomically.
*   **Decoupled Database Operation**: Service layers should remain agnostic to exact database execution. By passing optional transaction context (`tx`) to repository functions, we preserve separation of concerns while keeping operations atomic.

### Files Created/Updated
*   `apps/backend/src/types/balance.ts`
*   `apps/backend/src/repositories/balance.repository.ts`
*   `apps/backend/src/services/balance.service.ts`
*   `apps/backend/src/controllers/balance.controller.ts`
*   `apps/backend/src/routes/balance.routes.ts`
*   `apps/backend/src/validators/balance.validator.ts`
*   `apps/backend/src/validators/index.ts`
*   `apps/backend/src/routes/index.ts`
*   `docs/engineering_notes.md`
*   `README.md`

### Commands Used
*   `npx pnpm --filter @cex/backend run build`

### Important Concepts
*   **Database Increments**: Never perform mathematical additions in-memory inside the application server (e.g. `const newBal = oldBal + deposit; await db.update(newBal)`). This leads to lost updates under high concurrency. Database-level atomic increments (such as `free: { increment: amount }`) lock and update the record on the server side.
*   **Atomic Transactions**: A simulated deposit requires a read followed by a write (check if exists -> create -> update). An atomic transaction ensures that if two identical deposits are requested concurrently, they don't produce duplicate records or incorrect ledger sums.

### Interview Questions
1.  *Why are in-memory calculations of user balances followed by updates harmful in a centralized exchange, and how do database increments solve this?*
    *   **Answer**: In a concurrent environment, two requests reading a user's balance at the exact same millisecond will get the same initial value (e.g., $100). If both add $50 in-memory, both will try to write $150 to the database. The final balance becomes $150 instead of $200 (a lost update). Database-level increments lock the database row and perform the addition inside the database engine, forcing concurrent updates to execute sequentially and correctly.
2.  *How does passing an optional transaction client (`tx`) to repository functions preserve Clean Architecture boundaries during database transactions?*
    *   **Answer**: Clean Architecture dictates that services contain business rules (including transaction definitions), while repositories handle database operations. If we created transactions inside the repository, we couldn't easily chain updates across different repositories atomically. By defining the transaction in the service and passing the `tx` client as an optional argument to repository functions, we allow repositories to remain independent of transaction boundaries while still participating in them.

### Common Mistakes
*   Performing balance math inside Node.js code and overwriting the database value, which causes massive race conditions under load.
*   Updating a user's balance without validating that the asset symbol exists in the exchange's asset database.

---

## Phase 3.4: Order Placement

### Tasks Completed
*   Created type definitions for orders and order placement inputs in `types/order.ts`.
*   Implemented `orderRepository` handling user orders retrieval, single order lookup, and order creation.
*   Implemented `lockFunds` in `balanceRepository` to atomically deduct free balances and increment locked balances.
*   Implemented `orderService` implementing order validation, sufficient funds check (including computing BUY cost as price * quantity), balance locking, and order database creation within a single transaction.
*   Implemented `orderController` with endpoints to retrieve a user's orders, order details, and place new orders.
*   Created Zod validation schemas for order inputs and order ID lookups inside `validators/order.validator.ts`.
*   Mounted order routes under `/orders` namespace.
*   Verified that the TypeScript project builds successfully.

### What We Built
*   `apps/backend/src/types/order.ts`: Data Transfer Objects for order details and placement inputs.
*   `apps/backend/src/repositories/order.repository.ts`: Handles Order entity reads and transaction-aware writes.
*   `apps/backend/src/services/order.service.ts`: Implements matching rules and coordinates the transaction flow.
*   `apps/backend/src/controllers/order.controller.ts`: Authenticates user requests and routes order tasks.
*   `apps/backend/src/validators/order.validator.ts`: Validates request bodies (checking for positive prices for LIMIT orders) and UUID paths.

### Why We Built It
*   **Balance Locking**: In a financial exchange, balances must be locked when limit orders are placed (base asset locked for sells, quote asset locked for buys). This blocks double-spending of identical funds across concurrent orders.
*   **Transactional atomicity**: Deducting free balance, adding locked balance, and creating an order in the database must succeed or fail as a single unit. Wrapping all operations in a Prisma transaction (`$transaction`) guarantees no orphaned locked balances or unbacked orders.

### Files Created/Updated
*   `apps/backend/src/types/order.ts`
*   `apps/backend/src/repositories/order.repository.ts`
*   `apps/backend/src/repositories/balance.repository.ts`
*   `apps/backend/src/services/order.service.ts`
*   `apps/backend/src/controllers/order.controller.ts`
*   `apps/backend/src/routes/order.routes.ts`
*   `apps/backend/src/validators/order.validator.ts`
*   `apps/backend/src/validators/index.ts`
*   `apps/backend/src/routes/index.ts`
*   `docs/engineering_notes.md`
*   `README.md`

### Commands Used
*   `npx pnpm --filter @cex/backend run build`

### Important Concepts
*   **Double-Spend Prevention (Balance Locking)**: Moving assets from a "free" wallet to a "locked" state instantly prevents users from placing multiple overlapping buy or sell orders with the same capital.
*   **Atomic State Integrity**: Decoupling the calculation of required funds from DB mutations. Calculating total buy cost (price * quantity) in-memory using a high-precision decimal library before committing ensures exact ledger changes.

### Interview Questions
1.  *Why is it critical to lock user funds immediately upon order placement rather than at order match/fill time?*
    *   **Answer**: If funds are not locked immediately, a user with a $100 balance could place 5 concurrent buy orders of $100 each. If these orders get matched concurrently, the user would spend $500, leading to a negative balance ($400 deficit) and exchange insolvency. Locking funds immediately guarantees that every open order is fully backed by real capital.
2.  *How does using a high-precision Decimal library prevent floating-point drift during total cost calculations?*
    *   **Answer**: Floating-point drift is caused by the binary conversion limits of float64 numbers (IEEE 754). Multiplying a small price (e.g. `0.00000001`) by a large quantity (e.g. `12.35`) in standard JavaScript can produce rounding errors. A Decimal library uses base-10 representations, preserving exactly defined decimal places (up to 32 digits, 16 decimals in this DB design) and avoiding fractional leakage.

### Common Mistakes
*   Locking the wrong asset during orders (e.g. locking base asset during BUY orders or quote asset during SELL orders).
*   Forgetting to execute the balance check and the order creation inside the same database transaction, opening a window for race conditions.

---

## Phase 3.5: Order Cancellation

### Tasks Completed
*   Implemented `unlockFunds` in `balanceRepository` to atomically credit a user's free balance and decrement their locked balance.
*   Implemented `updateOrderStatus` in `orderRepository` to set an order's status to `CANCELLED` within a transaction context.
*   Updated the select projections inside `orderRepository` (find/create actions) to include base and quote asset IDs inside the related `market` payload.
*   Implemented `cancelOrder` in `orderService` enforcing ownership, status checks (only OPEN orders can be cancelled), calculation of quote assets to unlock for BUY orders, and execution of database mutations inside a Prisma transaction.
*   Implemented the delete action inside `orderController` mapping to the cancel service call.
*   Registered the `DELETE /api/v1/orders/:id` endpoint protected by JWT middleware.
*   Verified that the TypeScript project builds successfully.

### What We Built
*   `apps/backend/src/repositories/balance.repository.ts`: Added `unlockFunds` to shift locked assets back to free assets atomically.
*   `apps/backend/src/repositories/order.repository.ts`: Added `updateOrderStatus` and enriched selection queries with base/quote asset IDs.
*   `apps/backend/src/services/order.service.ts`: Added `cancelOrder` logic computing releases (price * remainingQuantity for BUYs, remainingQuantity for SELLs) and transaction flow.
*   `apps/backend/src/controllers/order.controller.ts`: Added `cancelOrder` controller action.
*   `apps/backend/src/routes/order.routes.ts`: Mounted the DELETE route under `/orders/:id`.

### Why We Built It
*   **Balance Unlocking**: An order cancellation requires restoring the exact funds locked when the order was created. Doing this atomically prevents funds from becoming permanently frozen or vanishing from the user's ledger.
*   **Status Isolation**: Restricting cancellation exclusively to `OPEN` orders prevents double-release conditions (e.g., trying to cancel a filled, cancelled, or rejected order).

### Files Created/Updated
*   `apps/backend/src/repositories/balance.repository.ts`
*   `apps/backend/src/repositories/order.repository.ts`
*   `apps/backend/src/services/order.service.ts`
*   `apps/backend/src/controllers/order.controller.ts`
*   `apps/backend/src/routes/order.routes.ts`
*   `docs/engineering_notes.md`
*   `README.md`

### Commands Used
*   `npx pnpm --filter @cex/backend run build`

### Important Concepts
*   **Remaining Quantity Releases**: During order cancellation, we only unlock the *remaining* unfilled amount (`remainingQuantity`). If the order was partially filled in a future execution phase, unlocking the initial quantity would lead to credit inflation.
*   **Atomic Rollback Integrity**: Releasing balances and transitioning the order status to `CANCELLED` must execute as a single SQL unit to protect the exchange's ledger from structural corruption.

### Interview Questions
1.  *Why is it dangerous to release the initial order quantity instead of the remaining quantity during cancellation, and how does this affect ledger integrity?*
    *   **Answer**: In a running exchange, an order can be partially matched and filled, reducing its `remainingQuantity` while leaving its status as `OPEN`. If you cancel the order and release the initial `quantity`, you credit the user with funds that were already spent on the partial fill, creating artificial assets in the database and causing severe insolvency.
2.  *Why must order state transition and fund releasing occur in a single transaction block rather than in separate operations?*
    *   **Answer**: If the order status is updated to `CANCELLED` but the balance release fails (or vice versa), the system enters an inconsistent state. The user either has cancelled orders with permanently trapped locked funds, or they get their funds back while the order remains open, allowing them to double-spend.

### Common Mistakes
*   Unlocking the base asset for BUY orders or the quote asset for SELL orders, mismatching exchange wallets.
*   Failing to check that the order's current status is strictly `OPEN`, allowing users to cancel already-completed orders and get duplicate refunds.
---

## Phase 5.0: Redis Asynchronous Communication Queue

### Tasks Completed
*   Integrated `ioredis` into `@cex/common`, `@cex/backend`, and `@cex/engine`.
*   Implemented a graceful, type-safe Redis client singleton service in `packages/common/src/redis.ts`.
*   Configured the Express backend `order.service.ts` to serialize new orders and push them into the `engine:orders` Redis list queue using `LPUSH` upon database creation and fund locking.
*   Implemented a high-concurrency Redis consumer loop in `apps/engine/src/index.ts` utilizing `BRPOP` to continuously pop, deserialize, and route orders to the `MatchingEngine` for execution.
*   Updated graceful shutdown signals in both backend and engine to cleanly close Redis connection sockets.

### What We Built
*   `packages/common/src/redis.ts`: Redis connection manager supporting auto-reconnection and blocking operations.
*   `apps/backend/src/services/order.service.ts`: Updated order creation pipeline to queue orders asynchronously.
*   `apps/engine/src/index.ts`: Thread-safe consumer engine loop polling from Redis.
*   `apps/backend/src/index.ts`: Hooked Redis client disconnections into the API bootstrap shutdown handler.

### Why We Built It
*   **Asynchronous Decoupling**: Queueing orders through Redis decouples the backend API request-response cycle from the high-throughput matching engine execution loop.
*   **Guaranteed Sequential Execution**: Using a FIFO list queue (`LPUSH` and `BRPOP`) guarantees that orders are processed by the matching engine in the exact order they were validated and stored in the database.
*   **Reliability**: Using blocking pops (`BRPOP`) prevents CPU hot-looping and ensures orders are consumed immediately upon queue arrival without latency overhead.

### Files Created/Updated
*   `packages/common/package.json`
*   `packages/common/src/index.ts`
*   `packages/common/src/redis.ts`
*   `apps/backend/package.json`
*   `apps/backend/src/index.ts`
*   `apps/backend/src/services/order.service.ts`
*   `apps/engine/package.json`
*   `apps/engine/src/index.ts`
*   `docs/engineering_notes.md`

### Commands Used
*   `npx pnpm build`

### Important Concepts
*   **Blocking List Pops (BRPOP)**: Employs a blocking connection that waits for elements to arrive in the queue, preventing busy-waiting and conserving system resources.
*   **Queue-Based Serialization**: Serializing complex order records into JSON strings allows cross-service execution without code coupling.
*   **Graceful Sockets Disconnection**: Quitting Redis clients ensures open socket descriptors are closed, preventing resource leaks on shutdowns.

### Interview Questions
1.  *Why use a Redis List queue with LPUSH/BRPOP rather than Pub/Sub for routing orders to the matching engine?*
    *   **Answer**: Redis Pub/Sub operates on a fire-and-forget broadcast mechanism where messages are lost if no subscriber is actively connected. Furthermore, Pub/Sub broadcasts to all active listeners, which would result in duplicate processing in a scaled consumer environment. A Redis List queue acts as a message broker where each order is processed exactly once by a single worker, and orders remain in the queue if the matching engine goes offline.
2.  *Why is it important to set maxRetriesPerRequest to null in ioredis configuration when using blocking commands?*
    *   **Answer**: By default, ioredis reconnects and throws an error if a request takes too long to respond. Blocking commands like `BRPOP` purposefully hold the request socket open until an item is available. Setting `maxRetriesPerRequest` to `null` tells ioredis not to terminate these intentionally long-lived connections.


---

## Phase 6.0: Real-Time Communication (WebSockets & Redis Pub/Sub)

### Tasks Completed
*   Configured a separate subscription client (`redisSub`) in `@cex/common` to avoid blocking conflicts on the main command connection.
*   Updated the `MatchingEngine` to publish match fills (to `market:<symbol>:trades`) and order book depth updates (to `market:<symbol>:depth`) after matches or cancellations.
*   Implemented `getDepth` method in `OrderBook` to group and aggregate quantities at correct price levels.
*   Built a performant, scale-ready `WebSocketManager` service using the `ws` package in `@cex/backend` that handles client sub/unsub actions.
*   Subscribed to the pattern `market:*:*` in the backend and routed incoming pub/sub events to corresponding WebSocket client streams.

### What We Built
*   `packages/common/src/redis.ts`: Exposed a second Redis connection `redisSub` specifically configured for pattern subscription.
*   `apps/engine/src/orderbook.ts`: Added `getDepth` grouping and aggregation logic.
*   `apps/engine/src/engine.ts`: Enabled publish triggers for trades and depth updates on matching or cancel runs.
*   `apps/backend/src/services/websocket.service.ts`: Implemented subscription state management and pub/sub routing to client connections.
*   `apps/backend/src/index.ts`: Bound WebSocket server initialization to the Express HTTP listener and graceful shutdown hooks.

### Why We Built It
*   **Pub/Sub Broadcast Decoupling**: Redis Pub/Sub is ideal for one-to-many broadcasts like streaming market ticks and depth changes, preventing direct network connections between the matching engine and WebSocket clients.
*   **Centralized Pattern Subscriptions**: Subscribing once to the Redis pattern `market:*:*` allows the backend to handle all current and future market streams on a single connection instead of orchestrating dynamic Redis subscriptions.
*   **Sub-Millisecond Broadcast Latency**: Using lightweight WebSockets (`ws`) bypasses HTTP request-response overheads for high-frequency client updates.

### Files Created/Updated
*   `packages/common/src/redis.ts`
*   `packages/common/src/index.ts`
*   `apps/engine/src/orderbook.ts`
*   `apps/engine/src/engine.ts`
*   `apps/backend/package.json`
*   `apps/backend/src/services/websocket.service.ts`
*   `apps/backend/src/services/index.ts`
*   `apps/backend/src/index.ts`
*   `docs/engineering_notes.md`

### Commands Used
*   `npx pnpm build`

### Important Concepts
*   **Separate Redis Sub Socket**: Because a Redis client enters "subscriber mode" and rejects normal commands once subscribed, a dedicated socket connection is required for subscription operations.
*   **Pattern Matching Routing**: Dynamically maps Redis channel strings (e.g. `market:BTC_USDT:trades`) to user-facing stream identifiers (e.g. `trade:BTC_USDT`).
*   **Stateful Subscription Map**: Maintains a fast lookup mapping between active sockets and the streams they are subscribed to, protecting bandwidth by sending data only to subscribed users.

---

## Phase 7.0: Frontend Architecture & Dashboard Foundation

### Tasks Completed
*   Scaffolded the React + TypeScript application inside `apps/frontend` using the Vite CLI in non-interactive mode.
*   Configured the workspace build pipelines to fully integrate and lint the React application.
*   Implemented client-side routing using `react-router-dom` with a persistent top navigation bar layout.
*   Created isolated component modules for Landing page tickers, Auth views (Login/Register), Trading Dashboard panels, and Wallet balances.
*   Integrated Tailwind CSS v4 in the frontend application using Vite compiler plugins and defined a sleek, dark trading theme.
*   Configured strict TypeScript compile settings in the React application context.

### What We Built
*   `apps/frontend/package.json`: Configured script hooks, devDependencies, and monorepo workspace references.
*   `apps/frontend/vite.config.ts`: Configured Vite to bundle React and utilize Tailwind CSS.
*   `apps/frontend/src/index.css`: Loaded Tailwind v4 directives and set custom neon/slate color schemes.
*   `apps/frontend/src/App.tsx`: Configured routing paths for Landing, Auth, Dashboard, and Wallet pages.
*   `apps/frontend/src/components/Layout.tsx`: Created a persistent layout wrapper with simulated balances and profile nav headers.
*   `apps/frontend/src/pages/LandingPage.tsx`: Created the public market overview page with mock token ticker grids.
*   `apps/frontend/src/pages/LoginPage.tsx` & `apps/frontend/src/pages/RegisterPage.tsx`: Built form-based credential inputs mapping simulated account validation.
*   `apps/frontend/src/pages/DashboardPage.tsx`: Built the trading layout grid containing mock SVG charts, ask/bid order books, buy/sell consoles, and recent trade tickers.
*   `apps/frontend/src/pages/WalletPage.tsx`: Created the portfolio balances grid mapping free/locked assets and an interactive deposit simulator.

### Why We Built It
*   **Separation of Client Concerns**: Isolating the user interface into `apps/frontend` keeps the Web/Mobile UI independent from the low-latency matching engine and the gateway API gateways.
*   **Consistent Styling Rules**: Setting theme tokens directly inside the CSS utilizing Tailwind CSS v4 enables writing consistent, high-performance utility classes for trading panels.
*   **Modular View Layouts**: Segregating trade books, candlesticks, and ledger inputs into structured components provides a clean codebase that will easily connect to WebSockets in the next phases.

### Files Created/Updated
*   `apps/frontend/package.json`
*   `apps/frontend/vite.config.ts`
*   `apps/frontend/tsconfig.app.json`
*   `apps/frontend/src/index.css`
*   `apps/frontend/src/App.tsx`
*   `apps/frontend/src/components/Layout.tsx`
*   `apps/frontend/src/pages/LandingPage.tsx`
*   `apps/frontend/src/pages/LoginPage.tsx`
*   `apps/frontend/src/pages/RegisterPage.tsx`
*   `apps/frontend/src/pages/DashboardPage.tsx`
*   `apps/frontend/src/pages/WalletPage.tsx`
*   `README.md`
*   `docs/engineering_notes.md`

### Commands Used
*   `npx pnpm build`

### Important Concepts
*   **Tailwind CSS v4 Vite Integration**: Direct CSS imports compile styles within Vite, producing faster bundles.
*   **Persistent Layout States**: Using React Router `<Outlet />` context allows child routes to synchronize login status and shared state details instantly.
*   **Responsive CSS Grids**: The trading dashboard utilizes flexible Tailwind grids that layout charts, order books, and trade panels responsively.

---

## Phase 7.1: Frontend API Integration (Auth & Wallet)

### Tasks Completed
*   Installed `axios` in `apps/frontend` and configured a global API instance pointing to the backend namespace (`http://localhost:3000/api/v1`).
*   Created request interceptors to automatically retrieve JWT tokens from `localStorage` and inject them as `Authorization` headers.
*   Built the global `AuthContext` to fetch authenticated profiles via `GET /auth/me` and maintain dynamic user states.
*   Updated the `RegisterPage` to make HTTP POST requests to `/auth/register` and redirect to Login on success.
*   Updated the `LoginPage` to trigger authentication via `/auth/login`, save JWT token keys, and populate user sessions.
*   Connected `WalletPage` to load live asset balances using `GET /balances` and submit simulated deposit transfers to `POST /balances/deposit`.
*   Integrated global user sessions and wallet status into the top header navbar component.

### What We Built
*   `apps/frontend/src/lib/api.ts`: Setup Axios client instance with token inject interceptors.
*   `apps/frontend/src/context/AuthContext.tsx`: Setup context session provider for login/logout and profiles validation.
*   `apps/frontend/src/App.tsx`: Wrapped routing endpoints within the `AuthProvider`.
*   `apps/frontend/src/components/Layout.tsx`: Loaded user profile details and header balances via context.
*   `apps/frontend/src/pages/RegisterPage.tsx`: Connected forms submission to the backend registration API.
*   `apps/frontend/src/pages/LoginPage.tsx`: Linked email/password fields to return JWT authorizations.
*   `apps/frontend/src/pages/WalletPage.tsx`: Loaded live user asset metrics and hooked up the simulated deposit ledger.

### Why We Built It
*   **Decoupled Authentication Lifecycle**: Handling state in a React Context isolates profile checks from component rendering cycles, ensuring uniform headers are attached to API calls.
*   **Automatic Header Enrichment**: Using Axios interceptors avoids manual token copying inside page components, minimizing code bloat and preventing unauthorized API rejections.
*   **Robust Balance Merging**: Merging live API responses with a default list of token assets guarantees new users get a clean, zeroed dashboard interface instead of empty states.

### Files Created/Updated
*   `apps/frontend/package.json`
*   `apps/frontend/src/lib/api.ts`
*   `apps/frontend/src/context/AuthContext.tsx`
*   `apps/frontend/src/App.tsx`
*   `apps/frontend/src/components/Layout.tsx`
*   `apps/frontend/src/pages/RegisterPage.tsx`
*   `apps/frontend/src/pages/LoginPage.tsx`
*   `apps/frontend/src/pages/WalletPage.tsx`
*   `README.md`
*   `docs/engineering_notes.md`

### Commands Used
*   `npx pnpm build`

### Important Concepts
*   **JWT Token Interceptor**: Automatically decorates all outbound requests with client credentials.
*   **Context Session Guarding**: Keeps route visibility synchronized with backend authentication.

---

## Phase 7.2: Real-Time Frontend Sync (WebSocket Client & Dashboard Data)

### Tasks Completed
*   Created a unified `WebSocketProvider` inside `apps/frontend/src/context/WebSocketContext.tsx` handling connection management, ping/pong check loops, and automatic reconnection delays on dropouts.
*   Designed a callback registration pattern that registers client-side stream listeners dynamically and sends JSON SUBSCRIBE/UNSUBSCRIBE protocol requests matching the backend WebSocket manager.
*   Hooked up the global provider inside `apps/frontend/src/App.tsx`.
*   Connected `DashboardPage.tsx` to use the `useWebSocketStream` hook to listen to depth and trade streams (`depth:<symbol>` and `trade:<symbol>`).
*   Configured auto-cleanup hooks to unsubscribe from channels on component unmount or when changing selected active symbols.
*   Implemented high-frequency state updates in the Order Book table that compute cumulative sizes and relative depth bar percentages.
*   Mapped recent trades into an array capped at 20 entries to show real-time transactions.

### What We Built
*   `apps/frontend/src/context/WebSocketContext.tsx`: Setup socket connections, auto-reconnects, and stream subscription event routing.
*   `apps/frontend/src/App.tsx`: Registered `WebSocketProvider` wrapper.
*   `apps/frontend/src/pages/DashboardPage.tsx`: Integrated `useWebSocketStream` hooks, depth sorting logic, and stateful trade feeds.

### Why We Built It
*   **Single Connection Management**: Utilizing a single global WebSocket instance avoids browser connection throttling, saving resources compared to opening separate connection sockets for each individual component.
*   **Callback Listener Registry**: Managing subscription callbacks in a Map ensures components receive relevant updates without forcing global React rerenders of unrelated views.
*   **High-Frequency Updates**: Restricting visual lists to slice thresholds (e.g. 5 order levels and 20 recent trades) keeps the browser responsive and prevents lagging loops.

### Files Created/Updated
*   `apps/frontend/src/context/WebSocketContext.tsx`
*   `apps/frontend/src/App.tsx`
*   `apps/frontend/src/pages/DashboardPage.tsx`
*   `docs/engineering_notes.md`
*   `README.md`

### Commands Used
*   `npx pnpm build`

### Important Concepts
*   **Auto-Reconnect Intervals**: Re-establishes broken socket feeds automatically if the backend restarts.
*   **Selective Client-Side Routing**: Direct message streams bypass context state changes and update page lists directly.
*   **Cumulative Depth Calculation**: Calculates volume summaries dynamically to lay out relative scaling bars.
*   **Clean Unsubscription Hooks**: Tears down stale feeds upon switching active currency pairings to keep connection parameters lean.

---

## Phase 7.3: Frontend Order Execution & User Feedback

### Tasks Completed
*   Installed `react-hot-toast` in `apps/frontend` for lightweight, themeable toast notifications.
*   Configured the global `<Toaster />` in `App.tsx` with dark CEX-themed style overrides (background, border, typography).
*   Extracted the Order Entry form out of `DashboardPage.tsx` into a dedicated `src/components/OrderEntry.tsx` component with single responsibility.
*   Wired `POST /orders` via the existing Axios client, mapping form state to the Zod-validated backend payload schema (`marketSymbol`, `side`, `type`, `price?`, `quantity`).
*   Applied typed `AxiosError<BackendError>` to safely extract `error.response.data.error.message` from backend error responses without unsafe `any` casts.
*   Added loading state (`disabled` button + `Loader2` spinner) that blocks re-submission while the request is in flight.
*   Showed green success toast with order status on placement; red error toast with exact backend message on failures.
*   Imported `OrderSide`, `OrderType`, and `Order` from the shared `@cex/types` workspace package to avoid type duplication.
*   Cleared `quantity` field on success; retained `price` for quick order repetition.
*   Added auth guard: prevents submission if user is not logged in and prompts with a sign-in link.

### Files Created/Updated
*   `apps/frontend/src/components/OrderEntry.tsx`
*   `apps/frontend/src/App.tsx`
*   `apps/frontend/src/pages/DashboardPage.tsx`
*   `apps/frontend/package.json`
*   `docs/engineering_notes.md`
*   `README.md`

### Commands Used
*   `npx pnpm add react-hot-toast --filter @cex/frontend`
*   `npx pnpm build`

### Important Concepts
*   **Typed AxiosError**: Parameterising `AxiosError<BackendError>` lets the compiler verify the `.response.data.error.message` access path.
*   **Single-responsibility component**: `OrderEntry` owns all form state and API side effects; the dashboard only passes props.
*   **Global toast singleton**: One `<Toaster />` at App root avoids duplicate notification stacks across routes.
*   **Auth-gated submission**: Unauthenticated users see an inline link instead of an error mid-flight.
