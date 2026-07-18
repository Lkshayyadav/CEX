# Centralized Exchange (CEX) Monorepo: Master Learning Guide

Welcome to the ultimate learning guide and engineering handbook for this Centralized Exchange (CEX) project. This document is designed specifically for you to learn, understand, and master every single aspect of the project—from high-level architecture decisions to the low-level execution of orders.

---

# 1. Project Overview

## What is this Project?
At a high level, this project is a **Centralized cryptocurrency/asset Exchange (CEX)**. It provides a platform where users can register, deposit funds (USDT, BTC, etc.), view real-time market data, and trade assets by placing Buy and Sell orders. 

But beneath the surface, it is a high-performance, event-driven trading platform. It consists of three core components:
1. **API Gateway / Backend** (`Backend/apps/backend`): A stateless REST and WebSocket server that handles user onboarding, authentication, balance management, and order submission.
2. **Matching Engine** (`Backend/apps/engine`): A stateful, memory-resident engine that holds the order books for all active markets in RAM and matches BUY and SELL orders in microsecond speeds.
3. **Frontend Terminal** (`frontend`): A modern, responsive React trading terminal that displays live order books, candlestick charts, user balances, and trade history.

---

## What Problem Does It Solve?
If you build a typical web application (like an e-commerce store or a social media site), your architecture usually looks like this:
```
Client ──► Backend API Server ──► Database (e.g., PostgreSQL/MongoDB)
```
In this naive architecture:
- Every request reads and writes directly to the database.
- Database locking protects data from concurrent changes.

If you try to build a financial exchange this way, the system will immediately collapse under load. Why?
* **High Latency**: Disk I/O (Database writes) takes milliseconds. In trading, millisecond latencies are unacceptable. If two trades try to execute, waiting for a database transaction to lock the rows and write to disk will queue up all other users.
* **Race Conditions**: Two buyers might try to match with the same seller simultaneously. If the database doesn't lock correctly, you could sell the same asset twice (double spending). If it does lock correctly, the bottleneck makes the platform unusable.
* **Throughput Limits**: Databases are designed for persistence, not for matching thousands of bids and asks per second.

### The Solution: Decoupled In-Memory Matching
This project solves these issues by **decoupling transaction ingestion from execution**:
1. Orders are accepted by the Backend API and immediately pushed into a high-speed **Redis Queue**.
2. The **Matching Engine** pops these orders one-by-one and executes them **entirely in RAM**. Since there is no database I/O in the matching loop, execution takes microseconds.
3. Trades are matched in-memory, and the resulting transactions are asynchronously persisted to the database and broadcasted to the frontend via WebSockets.

---

## Why Someone Would Build It
Building a CEX teaches you some of the most critical concepts in advanced backend engineering:
* **Stateful Microservices**: How to maintain state in-memory across service restarts.
* **Event-Driven Architectures**: Using message brokers (Redis) to decouple services.
* **Concurrency Control**: Ensuring order execution sequence is deterministic.
* **Financial Integrity**: Guaranteeing that balances are locked/unlocked atomically and trades settle without a single penny going missing.

---

## High-Level Architecture

The system utilizes an **Engine-First, Queue-Buffered** architecture. Here is the operational flow:

```
                  ┌────────────────────────┐
                  │   React Frontend UI    │
                  └───────────┬────────────┘
                              │
               REST Requests  │  WebSocket (Real-Time Streams)
               (Auth, Order)  │  (Order Book, Trades, Charts)
                              ▼
                  ┌────────────────────────┐
                  │  Backend API Gateway   │◄──────────────┐
                  │      (Stateless)       │               │
                  └───────────┬────────────┘               │
                              │                            │
                              │ Push Order Commands        │ Redis Pub/Sub
                              │ (LPUSH "engine:orders")    │ (Matches/Cancellations)
                              ▼                            │
                  ┌────────────────────────┐               │
                  │   Redis Message Queue  ├───────────────┘
                  │       (Buffer)         │
                  └───────────┬────────────┘
                              │
                              │ Pop & Match
                              │ (BRPOP "engine:orders")
                              ▼
                  ┌────────────────────────┐
                  │    Matching Engine     │
                  │  (Stateful / In-Mem)   │
                  └───────────┬────────────┘
                              │
                              │ Async Database Settlements
                              ▼
                  ┌────────────────────────┐
                  │   PostgreSQL Database  │
                  │    (Prisma Persistence)│
                  └────────────────────────┘
```

---

## Real-World Analogs
This architecture is not a toy. It is the industry standard for financial systems. Similar architectures are used by:
* **Coinbase & Binance**: Process millions of trades per second using decoupled, memory-resident matching engines.
* **LMAX Exchange**: Designed the famous "Disruptor" pattern (a high-speed memory ring buffer) to feed an in-memory matching engine.
* **NASDAQ**: Uses highly specialized hardware sequencers to queue incoming orders before they hit the matching cores.

---

## Interview Perspective: Quick Pitch
> **Question**: "Can you explain the architecture of the trading system you built?"
>
> **Answer**: "I built a Centralized Exchange using an event-driven, decoupled architecture. The frontend communicates with a stateless Express API Gateway. Instead of executing trades directly in the request handler, the gateway acts as an ingestion buffer, validating user funds and pushing order commands into a Redis queue. A separate, stateful Matching Engine consumes these commands sequentially and matches trades entirely in memory using a custom Red-Black Tree / Double-Linked List Order Book. This keeps execution latency in the microsecond range. Matches are settled in a PostgreSQL database via Prisma transactions and streamed back to users in real-time using Redis Pub/Sub and WebSockets."

---

# 2. Learning Roadmap

To get the absolute most out of this handbook, you should read it systematically. We have structured this guide so that each chapter builds upon the previous one. 

Here is the recommended reading path:

```
┌─────────────────────────────────────────────────────────┐
│              Phase 1: Foundations & Architecture        │
│  (Read Chapter 1 & 2 -> Proceed to Chapter 3 & 4)       │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│              Phase 2: Dependencies & System Env         │
│  (Read Chapter 5 & 6 to understand the building blocks) │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│              Phase 3: The Request Journey               │
│  (Read Chapter 7 & 18 to trace execution step-by-step)  │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│              Phase 4: Component Deep Dives              │
│  (Read Chapters 8, 9, 10, 11, 12, 13 to master code)   │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│              Phase 5: Advanced Mechanics                │
│  (Read Chapters 14, 15, 16 to study file/function APIs) │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│              Phase 6: Deployment & Debugging            │
│  (Read Chapters 17, 19, 20 to operate in production)    │
└─────────────────────────────────────────────────────────┘
```

### Table of Chapters
1. **Project Overview** *(You are here)*: Understand the "Why" and "What".
2. **Learning Roadmap** *(You are here)*: Your syllabus and strategy guide.
3. **Project Architecture**: Deep dive into why we decoupled the components.
4. **Complete Folder Structure**: Maps out the monorepo directory tree.
5. **Every Dependency**: Explains every package in `package.json`.
6. **Environment Variables**: Explains the configuration settings.
7. **Complete Request Lifecycle**: A step-by-step walk of a "BUY BTC" order.
8. **Backend Deep Dive**: Structural walkthrough of the API Gateway.
9. **Engine Deep Dive**: Inner workings of the in-memory matching loop.
10. **Redis Deep Dive**: Detailed explanation of Redis Queues and Pub/Sub.
11. **Database Schema**: Study the PostgreSQL models, relationships, and queries.
12. **Authentication Flow**: Learn how JWTs protect routes and authenticate WebSockets.
13. **WebSockets**: Explore the real-time subscription model.
14. **Every Important File**: File-by-file blueprint of responsibilities.
15. **Every Important Function**: Code-level analysis of core functions.
16. **Design Patterns**: Study Repository, Service Layer, Singleton, and Pub/Sub.
17. **Deployment**: Step-by-step guide to hosting in production.
18. **Complete Data Flow**: Visual flowcharts of key user actions.
19. **Debugging Guide**: How to log, locate bugs, and isolate failures.
20. **Interview Preparation**: Real-world interview questions and answers.
21. **Things I Learned**: Key takeaways from building this system.

---

# 3. Project Architecture

## Detailed Architecture Flow
Here is a comprehensive visualization of how data flows through the entire system during execution:

```
  ┌────────────────────────────────────────────────────────────────────────┐
  │                                CLIENTS                                 │
  └─────────────┬────────────────────────────────────────────▲─────────────┘
                │                                            │
                │ 1. HTTP POST /orders                       │ 8. WS Broadcast
                │ (Limit Buy BTC @ 50,000)                   │ (ORDER_MATCHED stream)
                ▼                                            │
  ┌──────────────────────────────────────────┐               │
  │            BACKEND GATEWAY               │               │
  │            (apps/backend)                │               │
  └─────────────┬────────────────────────────┘               │
                │                                            │
                │ 2. LPUSH "engine:orders"                   │
                ▼                                            │
  ┌──────────────────────────────────────────┐               │
  │             REDIS QUEUE                  │               │
  │        (Broker / Sequencer)              │               │
  └─────────────┬────────────────────────────┘               │
                │                                            │
                │ 3. BRPOP (Blocking Pop)                    │
                ▼                                            │
  ┌──────────────────────────────────────────┐   6. Pub/Sub  │
  │             MATCHING ENGINE              ├───────────────┼───────────────┐
  │         (apps/engine - In RAM)           │   Broadcast   │               │
  └─────────────┬────────────────────────────┘               ▼               │
                │                                       ┌──────────┐         │
                │ 4. Batch DB updates                   │ REDIS    │         │
                │ (Fills, Balances, Orders)             │ PUB/SUB  │         │
                ▼                                       └────▲─────┘         │
  ┌──────────────────────────────────────────┐               │               │
  │             POSTGRESQL DB                │               │ 7. WS Forward │
  │          (Prisma Persistence)            ├───────────────┘               │
  └──────────────────────────────────────────┘                               │
                                                                             ▼
                                                                  ┌────────────────────┐
                                                                  │  BACKEND WS SERVER │
                                                                  │  (apps/backend/ws) │
                                                                  └────────────────────┘
```

---

## Why Decouple Backend and Engine?
In a traditional monolithic backend, the database acts as the single source of truth and execution. For a high-performance exchange, we separate the **Backend Gateway** and the **Matching Engine** into two different OS processes.

### 1. The Core Bottleneck: Disk I/O vs. Memory Speeds
* **The Problem**: A hard drive write (SSD or NVMe) takes anywhere from **50 microseconds to 2 milliseconds**. A RAM read/write takes **10 to 100 nanoseconds**. If the matching engine is coupled to the database, it can only process a few hundred matches per second.
* **The Solution**: By keeping the active order books in RAM, the matching engine can match orders in **nanoseconds/microseconds**. The slow database persistence is done asynchronously and batched, completely removed from the critical matching path.

### 2. Sequential vs. Parallel Processing (Single-Writer Principle)
* **The Problem**: If three separate threads try to execute trades against the same order book in parallel, they will cause race conditions (e.g. two buyers executing against the same seller's 0.1 BTC limit). Standard API servers scale horizontally, running many threads across multiple servers.
* **The Solution**: An order book for a given market must be processed **sequentially (single-threaded)** to preserve the strict time-priority of orders. Our Matching Engine acts as a single-writer instance per market. By funneling all orders through a single Redis queue, we serialize them, ensuring they hit the engine one-by-one in deterministic order.

### 3. Fault Isolation
* **Scenario**: The database goes down or becomes congested with heavy analytics queries.
* **With Coupled Architecture**: The API server blocks, API requests timeout, the frontend freezes, and orders are lost.
* **With Decoupled Architecture**: The Backend API Gateway remains fully operational. It continues to accept orders, validates that users have enough balances, and drops them safely into the **Redis Queue**. Once the database recovers, the Matching Engine processes the queued orders. No requests are dropped.

### 4. Workload Characteristics
* **Backend API Gateway**: Heavily **I/O bound** (network calls, JSON parsing, SSL handshake, JWT verification). It scales horizontally by spinning up more instances behind a Load Balancer.
* **Matching Engine**: Heavily **CPU and Memory bound** (pointer manipulations, tree balancing, arithmetic math). It scales vertically (faster CPU, more RAM).

---

## Real-world Case Study
* **Binance**: Processes up to 1.4 million orders per second. They use a distributed engine cluster. Each partition is responsible for a subset of trading pairs (e.g., Engine A handles BTC/USDT and ETH/USDT; Engine B handles SOL/USDT).
* **LMAX Disruptor**: A famous open-source Java framework developed by LMAX Exchange. It uses a lock-free Ring Buffer to pass data between threads at ultra-high throughput, ensuring the matching engine thread is never blocked by I/O.

---

## Interview Questions on Architecture
1. **"Why can't you run multiple instances of the matching engine in parallel for the same trading pair?"**
   * *Answer*: "Running multiple engines in parallel for the same trading pair violates the strict FIFO (First-In, First-Out) time priority of order books. If two engines process the book concurrently, they will execute trade matches out-of-order, leading to double-allocation of bids/asks or race conditions. A single trading pair's book must be controlled by a single writer process."
2. **"How do you prevent data loss if the matching engine crashes before writes hit the database?"**
   * *Answer*: "We use a write-ahead message queue (Redis). Orders are not acknowledged as settled until the engine processes them and persists the state. If the engine crashes, its RAM state is lost. Upon restarting, it re-hydrates its memory-state by fetching all `OPEN` and `PARTIALLY_FILLED` orders from the database, ensuring it starts from the last saved state. Any orders still in the Redis queue that were not processed are then popped and executed safely."

---

# 4. Complete Folder Structure

Below is the directory tree of our monorepo showing exactly where every key folder is located:

```
CEX/
├── Backend/                       # Backend Monorepo Sub-Root
│   ├── apps/
│   │   ├── backend/               # stateless API Gateway (REST & WebSocket)
│   │   │   ├── prisma/            # database schema definition
│   │   │   └── src/               # Express source code
│   │   │       ├── config/        # Environment configurations
│   │   │       ├── controllers/   # Request entrypoints
│   │   │       ├── middleware/    # Auth, validation, error handlers
│   │   │       ├── repositories/  # Database access layer
│   │   │       ├── routes/        # Express router mappings
│   │   │       ├── scripts/       # Database seed scripts
│   │   │       ├── services/      # Business logic handlers
│   │   │       └── validators/    # Zod schemas for validation
│   │   └── engine/                # stateful Matching Engine
│   │       └── src/               # TS source code
│   │           ├── config/        # Environment configurations
│   │           ├── lib/           # Core library wrappers (Prisma, Redis)
│   │           ├── repositories/  # Database persistence layer
│   │           ├── index.ts       # Engine bootstrap / Redis consumer
│   │           ├── engine.ts      # Core matching loops
│   │           └── orderbook.ts   # RAM structures (Bids, Asks, AVL Trees)
│   └── packages/                  # Shared Workspace Packages
│       ├── common/                # Shared DB/Redis connections
│       └── types/                 # Shared TS Interface declarations
├── frontend/                      # React Frontend Terminal
│   └── src/
│       ├── assets/                # Images & styles
│       ├── components/            # UI components (Chart, OrderEntry, Book)
│       ├── context/               # React Auth & WS State Providers
│       ├── lib/                   # API utilities (axios)
│       └── pages/                 # Full pages (Landing, Dashboard, Wallet)
├── learning/                      # Educational assets
│   └── README.md                  # This Master Guide
└── package.json                   # Root workspace scripts configuration
```

---

## Folder Responsibilities & Communication Mappings

The table below breaks down the purpose and responsibilities of each key folder, how they interact, and when they are used:

| Folder Path | Purpose | Key Responsibilities | Communicates With | When It's Used |
| :--- | :--- | :--- | :--- | :--- |
| `Backend/apps/backend` | **API Gateway** | Handles client REST requests, manages WebSockets, validates inputs, puts orders into Redis queue. | Frontend (Client), Redis, Database (PostgreSQL) | On user login, registration, deposit, balance check, and order submission. |
| `Backend/apps/engine` | **Matching Engine** | Maintains in-memory order books, consumes Redis queue, processes matches, performs database settlements. | Redis Queue, Database (PostgreSQL), Redis Pub/Sub | Continuously runs in background; processes every order command popped from Redis. |
| `Backend/packages/common` | **Shared Library** | Exports singletons of the Redis client (`ioredis`) and shared database helper utilities. | `apps/backend`, `apps/engine` | Imported at startup by both apps to connect to database and cache layers. |
| `Backend/packages/types` | **Shared Typings** | Houses shared TypeScript interfaces (e.g., `Order`, `Trade`, `User`) to ensure static type safety across services. | `apps/backend`, `apps/engine`, `frontend` | Compile-time checking. |
| `frontend` | **Client Terminal** | Renders trading dashboard, place-order form, live chart, and updates book in real-time. | `apps/backend` (REST/WS) | Used by traders to interact with the platform. |

---

## Folder Communication Sequence Diagram

```
[frontend] ────(REST request)────► [apps/backend]
                                         │
                                   (LPUSH command)
                                         ▼
                                   [Redis Queue]
                                         ▲
                                   (BRPOP command)
                                         │
                                   [apps/engine] ───(Settlements)───► [Postgres DB]
                                         │
                                  (PUBLISH match)
                                         ▼
                                  [Redis Pub/Sub]
                                         ▲
                                 (SUBSCRIBE match)
                                         │
[frontend] ◄───(WS broadcast)──── [apps/backend/ws]
```

---

# 5. Code Navigation Guide

For a junior developer, entering a monorepo for the first time can feel like walking into a maze. This guide gives you the exact blueprint of which files to open, in what order, for every major feature. 

Reading files in this order shows you the logical progression of data: **Client request ──► Validation ──► Queue ──► Execution ──► Database ──► Broadcast**.

---

## Feature 1: User Registration & Authentication
To understand how a user signs up and logs in:
1. **[Backend/apps/backend/src/routes/auth.routes.ts](file:///home/lakshay-yadav/CEX/Backend/apps/auth.routes.ts)**: Start here to see the endpoint definitions (`/register` and `/login`) and what middleware validators are applied.
2. **[Backend/apps/backend/src/validators/auth.validator.ts](file:///home/lakshay-yadav/CEX/Backend/apps/backend/validators/auth.validator.ts)**: Open this to see the schema requirements (what fields are required for emails and passwords).
3. **[Backend/apps/backend/src/controllers/auth.controller.ts](file:///home/lakshay-yadav/CEX/Backend/apps/backend/src/controllers/auth.controller.ts)**: Read this to see how the controller handles the request and sends the response back to the client.
4. **[Backend/apps/backend/src/services/auth.service.ts](file:///home/lakshay-yadav/CEX/Backend/apps/backend/src/services/auth.service.ts)**: Read this to see the business logic: checking password hashes using `bcrypt` and generating JSON Web Tokens (JWT).
5. **[Backend/apps/backend/src/repositories/user.repository.ts](file:///home/lakshay-yadav/CEX/Backend/apps/backend/src/repositories/user.repository.ts)**: Finally, read this to see the exact SQL queries executed via Prisma to create or retrieve users.

> [!NOTE]
> **Why this order?** 
> Router sets the HTTP path. Validator filters bad requests. Controller delegates to Service. Service does calculations. Repository talks to Database. This is the **Layered Architecture Pattern**.

---

## Feature 2: Placing an Order (The Core Engine Flow)
To trace how a "Limit Buy BTC @ 50,000 USDT" order goes from a user's screen to matching:
1. **[frontend/src/components/OrderEntry.tsx](file:///home/lakshay-yadav/CEX/frontend/src/components/OrderEntry.tsx)**: Open this to see the user interface and the API call that sends the order details to the backend.
2. **[Backend/apps/backend/src/routes/order.routes.ts](file:///home/lakshay-yadav/CEX/Backend/apps/backend/src/routes/order.routes.ts)**: Open this to see the POST `/orders` endpoint protection middleware.
3. **[Backend/apps/backend/src/controllers/order.controller.ts](file:///home/lakshay-yadav/CEX/Backend/apps/backend/src/controllers/order.controller.ts)**: Read how the request payload is parsed and sent to the service layer.
4. **[Backend/apps/backend/src/services/order.service.ts](file:///home/lakshay-yadav/CEX/Backend/apps/backend/src/services/order.service.ts)**: Watch how the service checks if the user has enough balances, locks the funds in the database, and publishes the order into the Redis queue.
5. **[Backend/apps/engine/src/index.ts](file:///home/lakshay-yadav/CEX/Backend/apps/engine/src/index.ts)**: See how the Matching Engine's background consumer loop pops the order from the Redis queue.
6. **[Backend/apps/engine/src/engine.ts](file:///home/lakshay-yadav/CEX/Backend/apps/engine/src/engine.ts)**: Open this to see the core matching logic: checking the order books and executing trade matches in RAM.
7. **[Backend/apps/engine/src/orderbook.ts](file:///home/lakshay-yadav/CEX/Backend/apps/engine/src/orderbook.ts)**: Study this to see the in-memory data structures (trees and lists) that organize bids and asks.
8. **[Backend/apps/engine/src/repositories/engine.repository.ts](file:///home/lakshay-yadav/CEX/Backend/apps/engine/src/repositories/engine.repository.ts)**: Review how the engine performs the database atomic transactions to write trade fills and balance modifications.

> [!IMPORTANT]
> **Code Reading Checkpoint #1:**
> Stop reading this guide. Go open **[Backend/apps/backend/src/services/order.service.ts](file:///home/lakshay-yadav/CEX/Backend/apps/backend/src/services/order.service.ts)** and read the `createOrder` method. Notice how it does NOT match the order; it only checks user balances and pushes to the queue. When you understand this, return to this guide.

---

# 6. Project Startup Flow

Let's dissect exactly what the computer is doing step-by-step from the moment you run installation commands to when the servers are running.

## Step 1: Package Installation (`pnpm install` / `npx pnpm install`)

### What Gets Installed?
In a monorepo workspace managed by `pnpm`, running install resolves dependencies for all workspace projects concurrently.
* **Hoisted Node Modules**: Under the hood, `pnpm` uses hard links and a content-addressable store to install packages inside a global store, then links them to root `/node_modules` and subproject `/node_modules`.
* **Workspace Linkages**: `pnpm` checks our root `pnpm-workspace.yaml`. It notices that `frontend` and `Backend/apps/*` use packages like `@cex/common` and `@cex/types` as dependencies. Instead of downloading these from npm, it creates **symbolic links (symlinks)** directly from `/Backend/packages/common` and `/Backend/packages/types` to their respective `/node_modules` folders. 

```
                               ┌────────────────────────────────┐
                               │     Global PNPM Store          │
                               │  (Content-Addressable Storage) │
                               └─────────┬──────────────┬───────┘
                                         │              │
                              Hard Links │              │ Hard Links
                                         ▼              ▼
                     ┌───────────────────────┐      ┌───────────────────────┐
                     │  Root node_modules/   │      │  apps/*/node_modules/ │
                     └───────────────────────┘      └───────────────────────┘
                                                        │
                                                        │ Symlinks
                                                        ▼
                                            ┌───────────────────────┐
                                            │  packages/common/     │
                                            │  packages/types/      │
                                            └───────────────────────┘
```

---

## Step 2: The Bootstrapping and Dev Server Run (`npx pnpm dev`)

When you run `npx pnpm dev` from the root directory, the execution follows this strict sequence:

```
                  [User types: npx pnpm dev]
                              │
                              ▼
                [Root package.json: dev script]
                              │
                              ▼
            [Pre-dev Hook: Generate Prisma Client]
          (prisma generate for Backend/apps/backend)
                              │
                              ▼
          [Parallel Exec: pnpm -r run dev for all]
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
 [Vite Dev Server]    [Express Backend]     [Matching Engine]
   (Port 5173)           (Port 3000)          (CLI Consumer)
```

---

### Sequence 1: The Pre-dev Hook (`predev`)
Because we configured `"predev": "pnpm --filter @cex/backend prisma:generate"`, this command runs **first**:
1. It reads the schema file **[Backend/apps/backend/prisma/schema.prisma](file:///home/lakshay-yadav/CEX/Backend/apps/backend/prisma/schema.prisma)**.
2. It generates typescript types representing our database models.
3. It installs these types into `node_modules/@prisma/client` so that both the backend and matching engine can import type-safe database queries.

---

### Sequence 2: Express Backend Server Starts (`apps/backend`)
1. The server executes **[Backend/apps/backend/src/index.ts](file:///home/lakshay-yadav/CEX/Backend/apps/backend/src/index.ts)**.
2. **Environment Variables**: Reads configurations using `dotenv` from `apps/backend/.env`.
3. **Database Connection**: Calls the singleton helper **[Backend/packages/common/src/db.ts](file:///home/lakshay-yadav/CEX/Backend/packages/common/src/db.ts)** to establish a database connection pool to PostgreSQL via Prisma Client.
4. **Redis Connection**: Calls the singleton helper **[Backend/packages/common/src/redis.ts](file:///home/lakshay-yadav/CEX/Backend/packages/common/src/redis.ts)** to connect to the Redis server (via Upstash/local ioredis connection strings).
5. **Express Routes Registration**: Express instantiates the server app and registers the middleware (CORS, JSON parsers, authentication check) and routing tables (`/auth`, `/orders`, `/balances`, `/markets`).
6. **HTTP & WebSocket Startup**: Express binds to port `3000`. Concurrently, the HTTP server initializes the `ws` module to handle real-time WebSocket protocol handshakes on the same port.

---

### Sequence 3: Matching Engine Startup (`apps/engine`)
1. The engine executes **[Backend/apps/engine/src/index.ts](file:///home/lakshay-yadav/CEX/Backend/apps/engine/src/index.ts)**.
2. **Re-hydration (Recovery)**: The engine initializes itself by calling `matchingEngine.initialize()` in **[Backend/apps/engine/src/engine.ts](file:///home/lakshay-yadav/CEX/Backend/apps/engine/src/engine.ts)**. Under the hood:
   * It queries the PostgreSQL database via Prisma for all active trading pairs.
   * For each active pair, it queries the database for all `OPEN` or `PARTIALLY_FILLED` orders.
   * It populates its in-memory AVL trees and double-linked lists (the Order Books) with these orders. This ensures that if the engine crashes, it restarts with the exact same order state.
3. **Queue Consumer Setup**: Once re-hydration is complete, it sets up its gracefully terminable blocking loop.
4. **BRPOP Consumer Loop**: It starts calling Redis `BRPOP('engine:orders', 5)`. This is a blocking call: it sits idle and uses zero CPU. When an order is pushed into the queue by the Backend, Redis immediately wakes up the engine, which pops the payload and executes it.

---

### Sequence 4: Vite Frontend Starts (`frontend`)
1. Vite spins up a local server on port `5173`.
2. It compiles the assets and opens the user interface.
3. The frontend immediately makes REST calls to fetch available markets and tries to establish a real-time WebSocket connection to `ws://localhost:3000` to stream prices.

---

## Startup Flow Checkpoint & Quiz
1. **"Why does pnpm install create symbolic links (symlinks) instead of downloading folders from npm?"**
   * *Answer*: "Because packages like `@cex/common` and `@cex/types` are defined locally in our monorepo packages directory. Symlinking connects the local folder directly to the project's node modules. This lets us modify shared types/logic and see updates instantly in backend/frontend without needing to publish to an external npm registry."
2. **"What happens if Redis is not running when the matching engine boots up?"**
   * *Answer*: "The matching engine's background consumer loop will throw a connection refused error when attempting to establish a client link or execute `BRPOP`. The engine process will log the connection failure and exit, halting trade matching."

---

# 7. Complete Execution Flow

To master backend systems engineering, you must be able to trace a single bite of data as it hops through physical network lines, RAM structures, and disk storage. 

Let’s trace the journey of a trader placing a **LIMIT BUY order: 0.1 BTC @ 50,000 USDT**.

```
[Browser] ────► [Express Router] ────► [authMiddleware] ────► [validateBody] ────► [OrderController]
                                                                                        │
                                                                                        ▼
[Redis Queue] ◄──── (LPUSH) ◄──── [OrderService] ◄──── (Lock Balances) ◄────── [OrderRepository]
      │
(BRPOP block wakes up)
      ▼
[Engine index.ts] ──► [matchingEngine] ──► [OrderBook (AVL/DLL)] ──► [engineRepository (SQL Transaction)]
                                                                                │
                                                                                ▼
[React UI] ◄── (WS Broadcast) ◄── [Express WS Server] ◄── (PubSub Subscribe) ◄─ [Redis Channel]
```

---

## Step-by-Step Request Trace

### Step 1: The Browser (React UI)
* **What happens**: The user enters `0.1` in the quantity field and `50000` in the price field, then clicks **"Buy BTC"**.
* **File executing**: **[frontend/src/components/OrderEntry.tsx](file:///home/lakshay-yadav/CEX/frontend/src/components/OrderEntry.tsx)** (`handleSubmit` function).
* **Data leaving**:
  ```json
  {
    "marketSymbol": "BTC/USDT",
    "side": "BUY",
    "type": "LIMIT",
    "quantity": "0.100000",
    "price": "50000.00"
  }
  ```
* **Why it exists**: Collects user input, validates that input fields are positive numbers on the client side, adds the JWT auth header, and serializes the data to a JSON payload over an HTTP POST connection.

---

### Step 2: The Router & Middlewares (Express Gateway)
* **What happens**: The physical HTTP packets hit the server network card. Express receives the request, parses the headers, and runs it through the middleware chain.
* **Files executing**: 
  1. **[Backend/apps/backend/src/routes/order.routes.ts](file:///home/lakshay-yadav/CEX/Backend/apps/backend/src/routes/order.routes.ts)**: Intercepts the request path `/orders`.
  2. **[Backend/apps/backend/src/middleware/auth.ts](file:///home/lakshay-yadav/CEX/Backend/apps/backend/src/middleware/auth.ts)**: Verifies the `Authorization: Bearer <JWT>` header, extracts the user ID, and appends it to `req.user`.
  3. **[Backend/apps/backend/src/middleware/validate.ts](file:///home/lakshay-yadav/CEX/Backend/apps/backend/src/middleware/validate.ts)**: Validates the request body against the Zod schema in `validators/order.validator.ts`.
* **Data leaving**: The validated request object with `req.user` attached.
* **Why it exists**: Blocks unauthorized traders and malformed payloads at the perimeter before they consume backend resources.

---

### Step 3: The Controller
* **What happens**: Express routes the validated request to the Controller, which acts as the coordinator.
* **File executing**: **[Backend/apps/backend/src/controllers/order.controller.ts](file:///home/lakshay-yadav/CEX/Backend/apps/backend/src/controllers/order.controller.ts)** (`createOrder` method).
* **Data leaving**: Pass variables (`userId`, `marketSymbol`, `side`, `type`, `quantity`, `price`) to the Service Layer.
* **Why it exists**: Decouples Express HTTP details (req, res objects) from clean JavaScript business logic.

---

### Step 4: The Service Layer (The Fund Blocker)
* **What happens**: The business service checks if the user has the funds to place this order and locks them in SQL.
* **File executing**: **[Backend/apps/backend/src/services/order.service.ts](file:///home/lakshay-yadav/CEX/Backend/apps/backend/src/services/order.service.ts)** (`createOrder` function).
* **Execution Flow**:
  1. Calls `marketRepository.findBySymbol` to get the base and quote asset identifiers (BTC and USDT IDs).
  2. Calculates the cost of the order in quote asset terms: `0.1 * 50000 = 5000 USDT`.
  3. Begins a database transaction: checks if the user's `free` balance for USDT is `>= 5000`.
  4. Deducts `5000` from `free` balance, and adds `5000` to `locked` balance.
  5. Inserts an order record in the database with status `OPEN` and generates a unique order UUID.
  6. Pushes the order command payload as a stringified JSON into the Redis list queue:
     ```typescript
     await redis.lpush('engine:orders', JSON.stringify({ type: 'CREATE_ORDER', data: order }));
     ```
* **Data leaving**: The created order record returned to the client as an HTTP 201 response.
* **Why it exists**: Ensures user funds are safely locked in SQL **before** the matching engine processes it, preventing double-spending.

---

### Step 5: The Redis Queue & Sequencer
* **What happens**: The order payload is stored sequentially in the Redis list under the key `'engine:orders'`. It sits there until popped.
* **Why it exists**: Acts as a buffer and a **global transaction sequencer**. Orders are processed strictly in the order they arrive in Redis.

---

### Step 6: The Engine Consumer (BRPOP Loop)
* **What happens**: The Matching Engine is blocked on a `BRPOP` call. The moment Redis receives the `LPUSH` from the backend, it sends the payload to the engine. The engine pops it and handles it.
* **File executing**: **[Backend/apps/engine/src/index.ts](file:///home/lakshay-yadav/CEX/Backend/apps/engine/src/index.ts)** (`startConsumer` loop).
* **Data leaving**: Parsed `Order` type cast to memory representation.
* **Why it exists**: Continuously monitors the queue asynchronously without consuming excessive CPU resources.

---

### Step 7: The Core Matching Engine (In-RAM Order Book)
* **What happens**: The engine routes the order to the correct order book memory structure.
* **File executing**: **[Backend/apps/engine/src/engine.ts](file:///home/lakshay-yadav/CEX/Backend/apps/engine/src/engine.ts)** (`processOrder` function).
* **Execution Flow**:
  1. The engine checks the memory book for BTC/USDT.
  2. Since it is a **BUY** order, it traverses the **SELL (Asks)** tree to see if there are any sellers willing to sell at or below `50,000 USDT`.
  3. If a match is found: It calculates match quantity, removes/updates the filled nodes from the memory tree, and generates a **BookFill** trade result.
  4. If no match is found (or order is partially filled): It inserts the remaining quantity of the BUY order into the **BUY (Bids)** tree.
* **Data leaving**: A match result object containing all trade fills generated and updated order states.
* **Why it exists**: Executing matches at RAM speeds instead of waiting on disk writes.

---

### Step 8: Database Settlement (Asynchronous write-behind)
* **What happens**: The engine writes the matches and state updates to PostgreSQL inside a single database transaction.
* **File executing**: **[Backend/apps/engine/src/repositories/engine.repository.ts](file:///home/lakshay-yadav/CEX/Backend/apps/engine/src/repositories/engine.repository.ts)** (`settleTrades` function).
* **Database Actions**:
  1. Deducts locked funds from the buyer and adds free BTC to the buyer's balance.
  2. Deducts locked BTC from the seller and adds free USDT to the seller's balance.
  3. Records the `Fill` transaction rows.
  4. Updates the database status of both the maker and taker orders (`FILLED` or `PARTIALLY_FILLED`).
* **Why it exists**: Saves the trade records to disk permanently, ensuring the memory matches match the database state.

---

### Step 9: Pub/Sub Broadcast
* **What happens**: After committing the database changes, the engine publishes the trade matches and updated order book state to Redis Pub/Sub channels.
* **File executing**: **[Backend/apps/engine/src/engine.ts](file:///home/lakshay-yadav/CEX/Backend/apps/engine/src/engine.ts)**.
* **Data published**:
  ```json
  {
    "stream": "order:BTC_USDT",
    "data": {
      "type": "ORDER_MATCHED",
      "data": { "fills": [...], "takerOrder": {...} }
    }
  }
  ```
* **Why it exists**: Distributes matching events to all listening API servers in real-time.

---

### Step 10: WebSocket Server Broadcast
* **What happens**: The API gateway WebSocket instance, which has subscribed to the Redis channel, receives the message and writes it to the TCP socket of every client watching the BTC/USDT market.
* **File executing**: **[Backend/apps/backend/src/index.ts](file:///home/lakshay-yadav/CEX/Backend/apps/backend/src/index.ts)** (WebSocket connection handler).
* **Why it exists**: Delivers updates to client screens in real-time without polling.

---

# 8. File Relationship Map

Understanding how files import and call each other is crucial when debugging import issues. The map below outlines the relationship boundaries in the project.

```
       ┌────────────────────────┐
       │ Backend: index.ts      │
       └───────────┬────────────┘
                   │
                   ▼ Imports
       ┌────────────────────────┐
       │ Backend: app.ts        │
       └───────────┬────────────┘
                   │
                   ├───────────────────────────────┐
                   ▼ Imports                       ▼ Imports
       ┌────────────────────────┐      ┌────────────────────────┐
       │ Backend: routes/*      │      │ Backend: ws/ (Sockets) │
       └───────────┬────────────┘      └───────────┬────────────┘
                   │                               │
                   ▼ Imports                       │ Subscribes to Pub/Sub
       ┌────────────────────────┐                  │
       │ Backend: controllers/* │                  │
       └───────────┬────────────┘                  │
                   │                               │
                   ▼ Imports                       │
       ┌────────────────────────┐                  │
       │ Backend: services/*    │                  │
       └───────────┬────────────┘                  │
                   │                               │
                   ▼ Imports                       │
       ┌────────────────────────┐                  │
       │ Backend: repositories/*│                  │
       └───────────┬────────────┘                  │
                   │                               │
                   ▼ Imports                       │
       ┌───────────────────────────────────────────┼────────┐
       │ packages/common (redis.ts, db.ts)         │◄───────┘
       └───────────────────────────────────────────┘
```

---

# 9. Function Call Chain

When tracing code execution, focus on this operational hierarchy of function calls:

### Place Order: `POST /api/v1/orders`
```
[POST /orders HTTP Request]
   │
   ▼
Express Route Handler (routes/order.routes.ts)
   │
   ▼
authMiddleware (middleware/auth.ts)
   │
   ▼
validateBody (middleware/validate.ts)
   │
   ▼
orderController.createOrder(req, res) (controllers/order.controller.ts)
   │
   ▼
orderService.createOrder(userId, data) (services/order.service.ts)
   │
   ├─► marketRepository.findBySymbol(symbol) (repositories/market.repository.ts)
   ├─► balanceRepository.findAndLock(userId, assetId) (repositories/balance.repository.ts)
   ├─► orderRepository.create(orderData) (repositories/order.repository.ts)
   │
   ▼
redis.lpush('engine:orders', payload) (packages/common/src/redis.ts)
   │
   ▼
[Redis Server Ingests Command]
   │
   ▼
redis.brpop('engine:orders') (engine/src/index.ts)
   │
   ▼
matchingEngine.processOrder(order) (engine/src/engine.ts)
   │
   ├─► orderBook.add(order) or orderBook.match(order) (engine/src/orderbook.ts)
   │
   ▼
engineRepository.settleTrades(fills, updates) (engine/repositories/engine.repository.ts)
   │
   ▼
[PostgreSQL Commit Transaction]
   │
   ▼
redis.publish('order:BTC_USDT', wsPayload)
```

---

### Cancel Order: `DELETE /api/v1/orders/:id`
```
[DELETE /orders/:id HTTP Request]
   │
   ▼
orderController.cancelOrder(req, res)
   │
   ▼
orderService.cancelOrder(orderId, userId)
   │
   ├─► orderRepository.findById(orderId)
   │
   ▼
redis.lpush('engine:orders', { type: 'CANCEL_ORDER', data: { orderId, userId } })
   │
   ▼
[Redis Server Ingests Command]
   │
   ▼
redis.brpop('engine:orders')
   │
   ▼
matchingEngine.cancelOrder(orderId, userId, marketSymbol)
   │
   ├─► orderBook.remove(orderId)
   │
   ▼
engineRepository.settleCancel(orderId, remainingQty)
   │
   ▼
[PostgreSQL Commit Transaction]
   │
   ▼
redis.publish('order:BTC_USDT', wsPayload)
```

---

# 10. File-by-File Walkthrough

Let's dissect the core source files in the project. For each file, we explain its exact purpose, functions, dependencies, and what breaks if it is removed.

---

## 1. `Backend/packages/common/src/redis.ts`
* **Purpose**: Houses the connection singleton to the Redis server.
* **Responsibilities**: Reuses a single TCP connection pool for publishing messages, and provides secondary client connections for subscription tasks.
* **Key Exports**: `redis` (default connection instance), `redisService` (wrapper class containing connection/disconnection helpers).
* **Execution Timing**: Initialized on backend and matching engine startup.
* **What Breaks If Removed**: The entire application halts. The Backend cannot queue orders, the Engine cannot consume orders, and WebSockets cannot synchronize real-time updates.

---

## 2. `Backend/apps/backend/src/services/order.service.ts`
* **Purpose**: Orchestrates order requests from clients.
* **Responsibilities**: 
  1. Validates that the target market symbol exists.
  2. Resolves asset IDs.
  3. Deducts and locks appropriate balances inside a database transaction.
  4. Inserts the order as `OPEN` in Postgres.
  5. Queues the order command into Redis.
* **Key Functions**:
  * `createOrder(userId, data)`: Locks buyer/seller funds, inserts order to database, pushes to Redis.
  * `cancelOrder(orderId, userId)`: Fetches order from database, checks ownership, pushes cancel command to Redis.
* **Used By**: `controllers/order.controller.ts`
* **What Breaks If Removed**: Users can no longer place or cancel orders. If logic is written inside the controller instead, we lose separation of concerns, making testing business logic difficult.

---

## 3. `Backend/apps/engine/src/orderbook.ts`
* **Purpose**: An in-memory, highly efficient data representation of a trading pair's bids and asks.
* **Responsibilities**:
  1. Organizes Buy limits (Bids) in descending order of price.
  2. Organizes Sell limits (Asks) in ascending order of price.
  3. Executes price-time matched execution (matching BUY orders against the lowest Ask, and SELL orders against the highest Bid).
* **Key Structures**:
  * **OrderBook class**: Houses AVL Trees/Sorted Arrays of price levels, where each price level contains a Double-Linked List of individual orders to maintain time priority.
* **Key Functions**:
  * `add(order)`: Inserts a limit order to the book.
  * `match(order)`: Traverses the opposing tree side, decrementing quantities and generating `BookFill` objects until filled or out of matching price levels.
* **What Breaks If Removed**: The matching engine becomes stateless or slow. Matches would have to be calculated via expensive SQL queries, resulting in high latency.

---

## 4. `Backend/apps/engine/src/engine.ts`
* **Purpose**: The coordinator for memory order book states and database persistence.
* **Responsibilities**:
  1. Initializes order books by loading `OPEN` orders from SQL.
  2. Routes incoming queue orders to their respective books.
  3. Handles matching results and delegates trade settlements to the repository.
  4. Publishes matches to Redis Pub/Sub.
* **Key Functions**:
  * `initialize()`: Re-hydrates state from database on startup.
  * `processOrder(order)`: Executes the order book matching logic, saves results, and broadcasts streams.
  * `cancelOrder(orderId, userId, symbol)`: Removes the order from memory, updates database status, and broadcasts.
* **What Breaks If Removed**: The engine loses its recovery sequence on restart, and cannot route orders between different markets.

---

## 5. `Backend/apps/backend/src/middleware/auth.ts`
* **Purpose**: Security boundary for protected endpoints.
* **Responsibilities**: Parses the request `Authorization` header, decrypts the JWT secret, extracts user metadata, and rejects unauthenticated traffic with HTTP 401.
* **Used By**: Handled by Express routing chains (e.g. `order.routes.ts`, `balance.routes.ts`).
* **What Breaks If Removed**: The exchange becomes insecure. Anyone could place orders or withdraw balances on behalf of any user ID by spoofing HTTP headers.

---

## 11. Dependency Deep Dive

Here is the technical breakdown of the packages configured in our project, explaining the architectural decisions behind choosing them.

| Dependency Name | Why Chosen? | Key Alternatives | Architectural Trade-offs | Where It Is Used | Typical Interview Question |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`prisma` / `@prisma/client`** | Provides type-safe queries, migration control, and declarative schema models. | TypeORM, Sequelize, raw SQL drivers (`pg`). | **Pros**: Autogenerated TS types, easy schema migrations. <br>**Cons**: Generates query overhead; raw SQL is faster for complex joins. | All repositories in backend and matching engine. | *"How does Prisma handle connection pooling, and why is it important in microservices?"* |
| **`ioredis`** | Supports robust features like Promises, clustering, Sentinel, and Pub/Sub out of the box. | `redis` (official package). | **Pros**: Built-in reconnection logic, stable Pub/Sub clients. <br>**Cons**: Heavy package footprint compared to light wrappers. | `packages/common/src/redis.ts` | *"What is the difference between Redis Queue and Redis Pub/Sub, and which connections can they share?"* |
| **`decimal.js`** | Handles arbitrary-precision decimal arithmetic to avoid floating-point errors. | `bignumber.js`, JS native BigInt. | **Pros**: Prevents rounding issues in currency math (e.g., `0.1 + 0.2 = 0.30000000000000004` in standard JS). <br>**Cons**: Decreased math performance compared to native numbers. | `apps/engine`, `frontend`, `apps/backend/services`. | *"Why should you never use JavaScript's native float numbers for transaction amounts in a financial system?"* |
| **`zod`** | Declarative schema validation with automatic TypeScript type inference. | Yup, Joi. | **Pros**: Incredibly clean TS support, validation at runtime. <br>**Cons**: Minor bundle size impact in frontend. | `apps/backend/src/validators/*`, `middleware/validate.ts`. | *"How do you handle input validation at the boundary of a TypeScript system?"* |
| **`jsonwebtoken`** | Lightweight, stateless authentication token standard. | Sessions in Redis, Cookies. | **Pros**: Stateless, no database lookup required to verify signature on API gateway. <br>**Cons**: Revocation is difficult before expiration. | `apps/backend/src/services/auth.service.ts`, `middleware/auth.ts`. | *"What are the security trade-offs of stateless JWT vs. stateful Session tokens?"* |

---

## Technical Deep Dive: Floating Point Mathematics
In standard JavaScript:
```javascript
const buyerUSDT = 0.1 + 0.2;
console.log(buyerUSDT); // Outputs: 0.30000000000000004
```
This happens because computer processors represent fractional numbers using binary floating-point representations (IEEE 754 standard). Many decimals (like 0.1 and 0.2) cannot be represented exactly in binary fractions, resulting in rounding errors. 

In an exchange, this is unacceptable: a tiny rounding error could accumulate and cause a discrepancy between the total currency circulating in user wallets and the actual cash deposited. 

To solve this, we use **`decimal.js`**:
```typescript
import { Decimal } from 'decimal.js';
const buyerUSDT = new Decimal('0.1').add(new Decimal('0.2'));
console.log(buyerUSDT.toString()); // Outputs: "0.3"
```
It stores values as integers representing coefficient, exponent, and sign internally, bypassing binary floating-point hardware limitations.

---

## Dependency Checkpoint & Quiz
1. **"What is the disadvantage of using a library like decimal.js?"**
   * *Answer*: "The disadvantage is speed and memory overhead. Creating JS objects for every number calculation takes much longer and uses more memory than using native numbers. However, in financial applications, correctness is prioritized over raw speed."
2. **"Can a single Redis client connection handle both publishing and subscribing?"**
   * *Answer*: "No. Once a Redis client enters subscription mode (by calling `SUBSCRIBE`), it is dedicated to reading the incoming pub/sub stream. It can only execute a small subset of connection commands and cannot be used to run normal commands like `LPUSH` or `GET`. Thus, you must maintain separate client instances for publishing/commands and subscriptions."

---

# 12. Design Decision Section

In software system design, there are no "best" solutions—only trade-offs. This section examines the core engineering decisions made in this project and explains what would happen if we chose a naive approach.

---

### Decision 1: Stateful In-Memory Matching Engine vs. Database-Driven Matching
* **Why we did it**: We keep the order books as memory-resident AVL trees in the Engine process. Order matching happens entirely in CPU cache and RAM.
* **If we didn't do this**: If we wrote matching logic using PostgreSQL queries (e.g. searching the database for the cheapest seller matching our buyer, locking rows, and updating records in a database transaction), our throughput would drop from **~100,000 orders/sec** to **~200 orders/sec**. The database disk read/write lock bottlenecks would freeze the server during periods of high market activity.

---

### Decision 2: Redis List as a Command Queue buffer
* **Why we did it**: The API Gateway acts as a stateless producer that pushes order commands into a Redis queue using `LPUSH`. The Matching Engine is a consumer that pops them using a blocking pop `BRPOP`.
* **If we didn't do this**: If the API gateway called the matching engine directly via HTTP requests, the API server would have to block and wait for the trade to match and settle before returning a response. Under heavy traffic spikes, HTTP connections would pool up, memory would leak, and connections would timeout, dropping trades.

---

### Decision 3: Decoupled Service Layer and Repository Pattern
* **Why we did it**: Controllers only parse network inputs. Services handle business rules. Repositories handle database SQL queries.
* **If we didn't do this**: Writing SQL queries (Prisma calls) inside our controllers makes our code highly coupled. If we wanted to migrate from Postgres to MongoDB or mock the database for unit testing, we would have to rewrite all our controller route handlers.

---

### Decision 4: Stateless JWT Authentication vs. Stateful Sessions in Redis
* **Why we did it**: The client logs in, receives a signed JWT containing their ID, and sends it in the headers of subsequent requests. The API gateway verifies the cryptographic signature without querying a database.
* **If we didn't do this**: If we used server-side sessions, the API gateway would have to make a Redis read or Database query for *every single incoming HTTP request* just to verify who the user is, doubling our internal network traffic.

---

### Decision 5: Monorepo with Workspace Packages
* **Why we did it**: We use a pnpm monorepo where the backend, engine, and frontend share local package directories (`packages/common` and `packages/types`).
* **If we didn't do this**: If we kept them in separate git repositories, every time we added a new field to our order schema, we would have to:
  1. Update the backend repo.
  2. Update the type library.
  3. Publish the library to npm registry.
  4. Run `npm install` in the engine repo.
  5. Run `npm install` in the frontend repo.
  This introduces significant development friction.

---

# 13. Think Like the Computer

Let's look at exactly what happens at the hardware, OS, and memory level when a user places a buy order.

```
[Browser UI: User Clicks BUY]
  │ (Serializes JSON payload to raw string)
  ▼
[Network Stack: TCP/IP packets generated]
  │ (Encrypted with TLS, routed over fiber optic lines)
  ▼
[Express Server OS: TCP socket buffer receives bytes]
  │ (Node HTTP module parses headers, passes to event loop)
  ▼
[JS Event Loop: Express Middleware stack runs]
  │ (JWT crypto signature validated, JSON parsed to memory object)
  ▼
[Prisma DB Connection: Executes SQL query]
  │ (Establishes connection to Postgres, issues UPDATE, waits for OK)
  ▼
[Redis client: Socket write]
  │ (Pushes command bytes down TCP socket connection to Redis)
  ▼
[Redis Server: Memory update]
  │ (Places bytes on Linked List, wakes up Engine blocked socket)
  ▼
[Engine RAM: AVL Tree update]
  │ (Compares floats, re-balances trees, creates Match object)
  ▼
[Postgres DB: ACID Settlement]
  │ (Engine Repository commits transaction, disk write blocks write thread)
  ▼
[Redis Pub/Sub: Channel notify]
  │ (Publishes matches to channel)
  ▼
[WebSocket Server: Socket iteration]
  │ (Iterates through array of client connections, writes TCP frame)
  ▼
[Browser client: Render loop]
  │ (WebGL chart and DOM update, painting new pixels on screen)
```

---

## Detailed Step Walkthrough

1. **Serialization**: In the browser, the JavaScript engine takes a native React state object and serializes it into a string of ASCII characters: `{"marketSymbol":"BTC/USDT", ...}`.
2. **Network Handshake**: The browser's operating system packages this string into TCP segments, adds a security envelope via TLS encryption, and sends it as electrical signals through copper/fiber-optic cables to the backend host.
3. **HTTP Parsing**: The Linux kernel on the backend server receives the TCP packets, reassembles them, and alerts the Node.js event loop. Node's HTTP parser reads the raw byte stream, decrypts the TLS envelope, and instantiates an Express request object.
4. **Middleware Validation**:
   * **Crypto Check**: The server takes the JWT token, executes a SHA-256 HMAC cryptographic check using the local environment secret, and verifies the token has not been tampered with.
   * **Schema Validation**: Zod iterates over every key in the body. It checks that string shapes conform to UUID format and numeric values are positive decimals.
5. **Database Transaction**: Prisma takes the database query, generates a standard SQL string (`BEGIN TRANSACTION; UPDATE balances SET free = free - 5000 WHERE ...`), and sends it over a TCP socket pool to the PostgreSQL server. The Postgres server locks the user's balance row to prevent concurrent updates, writes the change to its Write-Ahead Log (WAL) on disk, commits the transaction, and returns a success response.
6. **Command Queue Ingestion**: The backend Express application writes a Redis protocol command string (`*3\r\n$5\r\nLPUSH\r\n...`) to its Redis client socket. Redis receives the command and updates its internal hash-table.
7. **Engine Wake Up**: The Matching Engine's background thread is sitting idle inside a `poll()` syscall, waiting on the Redis socket file descriptor. The moment Redis writes to this socket, the Linux kernel wakes the Engine process and schedules it on the CPU.
8. **RAM Tree Restructuring**: The Engine parses the JSON command and accesses the AVL tree in RAM. It compares the buy order's price (`50000`) with the lowest price node in the Sell tree. It finds a match, decrements the quantities, updates pointers in memory, and generates a match fill structure.
9. **ACID Settlement**: The Engine commits a single, combined database transaction to PostgreSQL, updating balances and writing the trades to disk.
10. **Broadcast Stream**: The engine writes the results to a Redis Pub/Sub socket. The API Gateway receives the message, loops over all connected WebSocket clients subscribed to the BTC/USDT stream, writes the data frames to their active TCP sockets, and the browser receives the bytes, triggers a canvas render, and paints the new trade on the screen.

---

# 14. Debugging Guide

Debugging a distributed, event-driven system requires a different strategy than debugging a simple monolithic CRUD app. You cannot just inspect local variables—you must trace the data across service boundaries.

---

## 1. Breakpoint Placement Strategy
If orders are failing, place breakpoints in the following locations:
* **Breakpoint 1 (Ingestion Boundary)**: **[Backend/apps/backend/src/controllers/order.controller.ts](file:///home/lakshay-yadav/CEX/Backend/apps/backend/src/controllers/order.controller.ts)** inside `createOrder`. If this breakpoint is hit, the request has successfully passed CORS, JWT authentication, and schema validation.
* **Breakpoint 2 (Locking & Queueing)**: **[Backend/apps/backend/src/services/order.service.ts](file:///home/lakshay-yadav/CEX/Backend/apps/backend/src/services/order.service.ts)** right before `redis.lpush`. If this is hit, the database balance check succeeded and funds have been locked in Postgres.
* **Breakpoint 3 (Engine Intake)**: **[Backend/apps/engine/src/index.ts](file:///home/lakshay-yadav/CEX/Backend/apps/engine/src/index.ts)** inside the `startConsumer` loop immediately after `redis.brpop`. If this is hit, it proves Redis connectivity is working and the command was read by the engine.
* **Breakpoint 4 (Match Logic)**: **[Backend/apps/engine/src/engine.ts](file:///home/lakshay-yadav/CEX/Backend/apps/engine/src/engine.ts)** inside `processOrder`. Allows you to inspect the RAM trees and compare prices.

---

## 2. Inspecting Redis State (CLI Commands)
When data stops flowing, open your terminal and run these commands to inspect the state of Redis:

### Check Redis Health
```bash
redis-cli ping
# Expected response: PONG
```

### Inspect the Command Queue
If the Matching Engine crashes, incoming orders will pool up in the Redis list. To check the size of the queue:
```bash
redis-cli llen "engine:orders"
# If LLEN returns > 0 and is growing, it means the matching engine is NOT running or is blocked.
# If LLEN returns 0, the engine is successfully popping orders as they arrive.
```

### View Live Redis Command Streams
To see exactly what commands the backend and engine are sending in real-time, open a terminal window and run:
```bash
redis-cli monitor
# You should see LPUSH, BRPOP, and PUBLISH commands scrolling by as you place orders.
```

---

## 3. Tracing a Request
1. Every order placed receives a unique `id` (UUID) from the database before being pushed to Redis.
2. In your terminal logs, grep for this specific UUID to trace its progress across service borders:
   ```bash
   # Search backend logs for order ingestion
   grep "550e8400-e29b-41d4-a716-446655440000" backend.log
   
   # Search engine logs for matching and database settlement
   grep "550e8400-e29b-41d4-a716-446655440000" engine.log
   ```

---

# 15. Interview Preparation

This section outlines potential interview questions based on the architecture of this project, organized by seniority level.

---

### Junior-Level Questions

#### Q1: "What is a monorepo, and why did you use it?"
* **Expected Answer**: "A monorepo is a single Git repository containing multiple distinct projects (backend, engine, frontend). I used it to easily share static TypeScript interfaces (`packages/types`) and utility wrappers (`packages/common`) across different runtimes without having to manage multiple private npm registry packages."

#### Q2: "What is JWT, and is it stateful or stateless?"
* **Expected Answer**: "JWT stands for JSON Web Token. It is stateless because the server does not need to store the session data. The server validates the cryptographic signature of the token using a secret key to identify the user. This reduces database lookups."

---

### Mid-Level Questions

#### Q1: "What are the trade-offs of using Redis as a message queue?"
* **Expected Answer**: 
  * **Pros**: Incredibly fast in-memory operations, low configuration overhead, and built-in support for blocking list commands (`BRPOP`).
  * **Cons**: Redis stores data in RAM. If the Redis server crashes and is not configured with Append-Only File (AOF) persistence, queued messages can be lost. For higher durability guarantees, systems use disk-persisted brokers like RabbitMQ or Apache Kafka.

#### Q2: "Why did you implement the Repository Pattern?"
* **Expected Answer**: "The Repository Pattern isolates SQL database interactions from business services. It allows the service layer to remain database-agnostic. This keeps the business logic clean and makes it easier to mock the database layer for testing."

---

### Senior-Level Questions

#### Q1: "How do you handle engine state recovery if the Matching Engine server crashes?"
* **Expected Answer**: "The matching engine's state is ephemeral (stored in RAM). To ensure durability:
  1. No matches are considered official until written to PostgreSQL via atomic ACID transactions.
  2. If the engine crashes, upon boot it executes a re-hydration query fetching all database orders with status `OPEN` or `PARTIALLY_FILLED`.
  3. It reconstructs the memory order books from this database snapshot.
  4. Once memory is fully hydrated, it starts consuming new commands from the Redis queue.
  This guarantees that no order matches are lost, and the state remains consistent."

#### Q2: "How would you scale this system to handle millions of transactions across hundreds of markets?"
* **Expected Answer**: "A single Matching Engine process cannot handle all markets globally because matching is single-threaded per order book to preserve execution priority. To scale:
  1. **Partition by Market Symbol**: Run multiple matching engine worker instances.
  2. **Route Orders**: Use a hash of the market symbol (e.g. `BTC/USDT`) to route orders to dedicated Redis queues (e.g. `engine:orders:BTC_USDT`).
  3. **Dedicated Workers**: Assign matching engine workers to subscribe only to their designated market queues. This allows the system to scale horizontally."

---

# 16. Glossary

* **API Gateway**: A stateless proxy server that accepts external client HTTP/WebSocket connections, enforces authentication, rate-limiting, and routes payloads to internal queues or services.
* **AVL Tree**: A self-balancing binary search tree structure where the heights of the two child subtrees of any node differ by at most one. Used to store order prices to ensure lookups and insertions take logarithmic time ($O(\log n)$).
* **Double-Linked List (DLL)**: A sequence of data nodes where each node contains pointers to both the previous and next nodes. Used inside price levels of the order book to allow constant time ($O(1)$) insertions and deletions of orders, maintaining time priority.
* **ACID Transactions**: A set of database properties (Atomicity, Consistency, Isolation, Durability) that guarantee database transactions are processed reliably.
* **Redis Queue**: A first-in, first-out (FIFO) storage queue created using Redis Lists (`LPUSH` and `BRPOP`).
* **Pub/Sub (Publish/Subscribe)**: An event-driven message distribution pattern where publishers broadcast messages to channels without knowing who the subscribers are.
* **ORM (Object-Relational Mapping)**: A programming technique for converting data between relational databases (SQL tables) and object-oriented code objects (e.g. Prisma).
* **JWT (JSON Web Token)**: An open standard for securely transmitting information between parties as a JSON object, signed cryptographically.
* **Stateful Service**: A service that requires the current state of data to be held in memory/runtimes across execution loops (e.g. the Matching Engine).
* **Stateless Service**: A service that does not retain state in memory. Any instance can handle any incoming request by loading required data from external sources (e.g. the Express API Gateway).
* **WebSocket**: A persistent, bi-directional TCP communication protocol that runs over a single connection, allowing real-time data streaming.
* **Monorepo**: A software development strategy where code for multiple separate projects is stored in the same version control repository.






