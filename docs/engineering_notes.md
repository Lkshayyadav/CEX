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



