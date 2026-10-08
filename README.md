# Code to Escape

> **Gamified programming learning platform** — a browser-based application where learners solve coding challenges, earn XP, progress through escape-room worlds, compete in real-time duels, and receive adaptive AI hints.

[![CI](https://github.com/Dilipkumar01837/except3d_cte_project_sourcecode/actions/workflows/ci.yml/badge.svg)](https://github.com/Dilipkumar01837/except3d_cte_project_sourcecode/actions)

---

## Table of Contents

1. [What is it?](#what-is-it)
2. [Monorepo Structure](#monorepo-structure)
3. [Prerequisites](#prerequisites)
4. [Full Setup — Step by Step](#full-setup--step-by-step)
5. [All Commands Reference](#all-commands-reference)
6. [Service URLs](#service-urls)
7. [Admin Account](#admin-account)
8. [Environment Variables](#environment-variables)
9. [Database — PostgreSQL & pgAdmin](#database--postgresql--pgadmin)
10. [Architecture](#architecture)
11. [Features](#features)
12. [Tech Stack](#tech-stack)
13. [Testing](#testing)
14. [Contributors](#contributors)

---

## What is it?

Code to Escape turns programming practice into a game. Players write Python, JavaScript, TypeScript, Go, Rust, C++, or Java to solve published challenges. Accepted submissions award XP and coins, update world progress, and feed daily streaks, achievements, and leaderboards. An isolated Docker sandbox executes every submission with per-request CPU, memory, and time limits. An AI tutor (Groq) provides adaptive, personalized hints that avoid giving away the answer.

---

## Monorepo Structure

```
apps/
  game-client/          React 19 + Vite — player-facing SPA        (port 5173)
  admin-dashboard/      React 19 + Vite — admin SPA                (port 5174)
  server/               Express API + Socket.IO                     (port 3000)
  code-runner/          Isolated Docker code execution service      (port 3002)
  e2e/                  Playwright end-to-end tests

packages/
  shared/               APP_NAME, API_BASE_PATH constants
  types/                Shared TypeScript types
  utils/                Pure utility functions
  ui/                   Shared React UI components
  config/               Shared ESLint + TypeScript configs

database/
  prisma/               Prisma schema + all migrations

docker/
  code-runner/          Sandbox + runner Dockerfiles
  server/               Production server Dockerfile

docs/
  API.md                Full REST API reference
  Architecture.md       System architecture diagram and notes
```

---

## Prerequisites

Install all three before running anything.

| Tool               | Version      | Download                                       |
| ------------------ | ------------ | ---------------------------------------------- |
| **Node.js**        | 20 or higher | https://nodejs.org                             |
| **pnpm**           | 9 or higher  | `npm install -g pnpm`                          |
| **Docker Desktop** | latest       | https://www.docker.com/products/docker-desktop |

Verify your versions:

```bash
node --version      # v20.x.x or higher
pnpm --version      # 9.x.x or higher
docker --version    # Docker version 24+ or higher
```

---

## Full Setup — Step by Step

Follow these steps **in order** the first time you set up the project.

### Step 1 — Clone the repository

```bash
git clone https://github.com/Dilipkumar01837/except3d_cte_project_sourcecode.git
cd except3d_cte_project_sourcecode
```

### Step 2 — Install dependencies

```bash
pnpm install
```

### Step 3 — Configure environment variables

```bash
cp .env.example .env
```

The default `.env` values work for local development out of the box. The only things you may want to change:

| Variable                  | What to set                              | Required?           |
| ------------------------- | ---------------------------------------- | ------------------- |
| `JWT_SECRET`              | Any long random string (32+ chars)       | **Yes**             |
| `REFRESH_TOKEN_SECRET`    | Different long random string (32+ chars) | **Yes**             |
| `GROQ_API_KEY`            | Your Groq API key from console.groq.com  | Optional (AI hints) |
| `GOOGLE_CLIENT_ID/SECRET` | From Google Cloud Console                | Optional (OAuth)    |
| `GITHUB_CLIENT_ID/SECRET` | From GitHub OAuth App                    | Optional (OAuth)    |

### Step 4 — Start infrastructure (PostgreSQL + Redis)

```bash
docker compose up postgres redis -d
```

Wait until both containers are healthy:

```bash
docker ps
# cte-postgres   Up X minutes (healthy)
# cte-redis      Up X minutes (healthy)
```

### Step 5 — Run database migrations

```bash
pnpm db:migrate
```

This applies all Prisma migrations and creates every table in PostgreSQL.

### Step 6 — Build the code-runner sandbox image

```bash
docker compose build code-runner-sandbox
docker compose up code-runner-sandbox -d
docker compose up code-runner -d
```

This builds the isolated Docker sandbox used to execute player code.

### Step 7 — Seed the database

```bash
# Seed all content (challenges, worlds, achievements) in one command:
pnpm db:seed
```

Or seed each category separately:

```bash
pnpm db:seed:worlds        # world map + levels
pnpm db:seed:beginner      # 42 starter challenges (6 per language × 7 languages)
pnpm db:seed:variety       # additional challenge variety
pnpm db:seed:achievements  # achievement definitions
```

### Step 8 — Create the admin account

```bash
cd apps/server
pnpm exec tsx scripts/create-superuser.ts admin@test.com admin "Qwerty@123" SUPER_ADMIN
```

This creates (or promotes) a `SUPER_ADMIN` account:

| Field    | Value            |
| -------- | ---------------- |
| Email    | `admin@test.com` |
| Username | `admin`          |
| Password | `Qwerty@123`     |
| Role     | `SUPER_ADMIN`    |

> Run this command again at any time to reset the admin password. It is fully idempotent.

### Step 9 — Start all development servers

Open **4 separate terminals** and run one command in each:

```bash
# Terminal 1 — API server (port 3000)
pnpm --filter @code-to-escape/server dev

# Terminal 2 — Execution worker (REQUIRED — judges submitted code)
pnpm dev:worker

# Terminal 3 — Game client / player app (port 5173)
pnpm --filter @code-to-escape/game-client dev

# Terminal 4 — Admin dashboard (port 5174)
pnpm --filter @code-to-escape/admin-dashboard dev
```

**Or start everything in one command from the root** (uses Turborepo, all output in one terminal):

```bash
pnpm dev
```

> ⚠️ The **execution worker** (Terminal 2) is mandatory. Without it, submitted code is queued in Redis but never judged — submissions stay in `QUEUED` state forever.

---

## All Commands Reference

### Development

| Command                                             | Description                                       |
| --------------------------------------------------- | ------------------------------------------------- |
| `pnpm dev`                                          | Start all apps and worker in parallel (Turborepo) |
| `pnpm dev:worker`                                   | Start the execution worker only                   |
| `pnpm --filter @code-to-escape/server dev`          | Start API server only                             |
| `pnpm --filter @code-to-escape/game-client dev`     | Start game client only                            |
| `pnpm --filter @code-to-escape/admin-dashboard dev` | Start admin dashboard only                        |

### Build & Quality

| Command             | Description                                |
| ------------------- | ------------------------------------------ |
| `pnpm build`        | Build all packages and apps for production |
| `pnpm lint`         | Run ESLint across the entire monorepo      |
| `pnpm typecheck`    | TypeScript type-check all packages         |
| `pnpm format`       | Auto-format all files with Prettier        |
| `pnpm format:check` | Check formatting without changing files    |

### Database

| Command                     | Description                                           |
| --------------------------- | ----------------------------------------------------- |
| `pnpm db:migrate`           | Apply all pending Prisma migrations                   |
| `pnpm db:migrate:deploy`    | Apply migrations (production safe, no prompts)        |
| `pnpm db:migrate:reset`     | ⚠️ Drop and recreate the entire database              |
| `pnpm db:generate`          | Regenerate the Prisma client after schema changes     |
| `pnpm db:studio`            | Open Prisma Studio (visual DB browser) at port 5555   |
| `pnpm db:seed`              | Seed all content (worlds + challenges + achievements) |
| `pnpm db:seed:worlds`       | Seed world map and levels only                        |
| `pnpm db:seed:beginner`     | Seed 42 beginner challenges (6 × 7 languages)         |
| `pnpm db:seed:variety`      | Seed additional challenge variety                     |
| `pnpm db:seed:achievements` | Seed achievement definitions                          |

### Docker

| Command                               | Description                                                 |
| ------------------------------------- | ----------------------------------------------------------- |
| `docker compose up postgres redis -d` | Start PostgreSQL + Redis only                               |
| `docker compose up -d`                | Start entire Docker stack (all services)                    |
| `docker compose down`                 | Stop and remove all containers                              |
| `docker compose down -v`              | Stop containers and delete all volumes (⚠️ deletes DB data) |
| `docker ps`                           | Check which containers are running                          |
| `pnpm docker:up`                      | Alias for `docker compose up -d`                            |
| `pnpm docker:down`                    | Alias for `docker compose down`                             |

### Admin Account

| Command                                                                                            | Description                        |
| -------------------------------------------------------------------------------------------------- | ---------------------------------- |
| `cd apps/server && pnpm exec tsx scripts/create-superuser.ts <email> <username> <password> [role]` | Create or promote an admin account |

Example:

```bash
cd apps/server
pnpm exec tsx scripts/create-superuser.ts admin@test.com admin "Qwerty@123" SUPER_ADMIN
```

Valid roles: `ADMIN`, `SUPER_ADMIN` (default: `SUPER_ADMIN`)

### Testing

| Command                                     | Description                                            |
| ------------------------------------------- | ------------------------------------------------------ |
| `pnpm test`                                 | Run all unit + integration tests (Vitest)              |
| `pnpm --filter @code-to-escape/server test` | Run server tests only                                  |
| `pnpm test:e2e`                             | Run Playwright E2E tests (requires full stack running) |

### Validation

| Command                  | Description                      |
| ------------------------ | -------------------------------- |
| `pnpm validate:beginner` | Validate beginner challenge data |
| `pnpm validate:variety`  | Validate variety challenge data  |

---

## Service URLs

Once all servers are running:

| Service             | URL                                           | Description                                           |
| ------------------- | --------------------------------------------- | ----------------------------------------------------- |
| **Game client**     | http://localhost:5173                         | Player-facing app (register, solve challenges, duels) |
| **Admin dashboard** | http://localhost:5174                         | Admin app (manage challenges, users, worlds)          |
| **API**             | http://localhost:3000/api/v1                  | REST API base                                         |
| **Health check**    | http://localhost:3000/api/v1/health           | Quick health ping                                     |
| **Readiness check** | http://localhost:3000/api/v1/health/readiness | DB + Redis + runner status                            |
| **Prisma Studio**   | http://localhost:5555                         | Visual DB browser (run `pnpm db:studio`)              |

---

## Admin Account

The default admin account created in Step 8:

| Field         | Value                 |
| ------------- | --------------------- |
| **Login URL** | http://localhost:5174 |
| **Email**     | `admin@test.com`      |
| **Password**  | `Qwerty@123`          |
| **Role**      | `SUPER_ADMIN`         |

To reset the admin password or create a new admin, re-run the `create-superuser` script with new credentials. It is fully idempotent — running it on an existing account updates it.

---

## Environment Variables

Copy `.env.example` to `.env`. Minimum required set for local development:

```env
# Infrastructure
DATABASE_URL=postgresql://cte:cte_dev_password@localhost:5432/code_to_escape
REDIS_URL=redis://localhost:6379

# Auth — change these to any long random strings (32+ characters)
JWT_SECRET=change-me-to-a-long-random-secret-in-production
REFRESH_TOKEN_SECRET=change-me-to-another-long-random-secret-in-production

# Code runner
CODE_RUNNER_URL=http://localhost:3002
CODE_RUNNER_TOKEN=code-to-escape-dev-runner-token

# AI hints (optional — static hints still work without this)
GROQ_API_KEY=
GROQ_MODEL=llama-3.3-70b-versatile
```

All other variables have sensible defaults for development. See `.env.example` for the full reference including OAuth, Firebase, and telemetry settings.

---

## Database — PostgreSQL & pgAdmin

### Where is the database stored?

The PostgreSQL database runs inside the Docker container `cte-postgres`. Its data is persisted in a **Docker named volume** (`code-to-escape_postgres_data`) inside the WSL2 virtual disk on Windows. You never need to touch the raw storage path — connect through pgAdmin or Prisma Studio instead.

### Connection credentials

| Field    | Value              |
| -------- | ------------------ |
| Host     | `localhost`        |
| Port     | `5432`             |
| Database | `code_to_escape`   |
| Username | `cte`              |
| Password | `cte_dev_password` |

### Connect with pgAdmin

1. Download and install pgAdmin from **https://www.pgadmin.org/download/**
2. Open pgAdmin → right-click **Servers** → **Register** → **Server…**
3. Fill in the two tabs:

**General tab**

| Field | Value            |
| ----- | ---------------- |
| Name  | `Code to Escape` |

**Connection tab**

| Field                | Value              |
| -------------------- | ------------------ |
| Host name/address    | `localhost`        |
| Port                 | `5432`             |
| Maintenance database | `code_to_escape`   |
| Username             | `cte`              |
| Password             | `cte_dev_password` |
| Save password        | ✅ Yes             |

4. Click **Save**. Expand the tree:

```
Servers
  └── Code to Escape
        └── Databases
              └── code_to_escape
                    └── Schemas
                          └── public
                                └── Tables   ← all tables here
```

5. Right-click any table → **View/Edit Data** → **All Rows** to browse records.

### Connect with Prisma Studio (built-in, no install needed)

```bash
pnpm db:studio
# Opens http://localhost:5555 in your browser automatically
```

### Quick SQL reference (run in pgAdmin Query Tool)

```sql
-- List all users
SELECT id, email, username, role, "isActive", "createdAt"
FROM "User"
ORDER BY "createdAt" DESC;

-- List all challenges
SELECT id, slug, title, difficulty, "isPublished"
FROM "Challenge"
ORDER BY "createdAt" DESC;

-- View leaderboard (top 10 by XP)
SELECT u.username, p.xp, p.level, p.rank
FROM "Profile" p
JOIN "User" u ON u.id = p."userId"
ORDER BY p.xp DESC
LIMIT 10;

-- Check submission history
SELECT s.id, u.username, c.title, s.status, s.score, s."createdAt"
FROM "Submission" s
JOIN "User" u ON u.id = s."userId"
JOIN "Challenge" c ON c.id = s."challengeId"
ORDER BY s."createdAt" DESC
LIMIT 20;
```

---

## Architecture

```
Browser ──▶ game-client (React 19, port 5173)
                │
                ├── REST  ──▶ server (Express, port 3000)
                │                   │
                └── WS   ──────────┤                  ├──▶ PostgreSQL (Prisma ORM)
                                    │                  ├──▶ Redis (queue + leaderboard + duel state)
Browser ──▶ admin-dashboard         │                  └──▶ code-runner (Docker sandbox, port 3002)
            (React 19, port 5174)   │
                │                   │
                └── REST ───────────┘

                        ↕ Redis execution queue

            execution worker (separate Node process)
                └── dequeues submissions → runs sandbox → saves results → emits Socket.IO events
```

Full details: [`docs/Architecture.md`](docs/Architecture.md)  
Full API reference: [`docs/API.md`](docs/API.md)

---

## Features

### Core Game Loop

- **7 programming languages** — Python, JavaScript, TypeScript, Java, C++, Go, Rust
- **Isolated sandbox execution** — Docker: `--network none`, `--read-only`, `--cap-drop ALL`, per-request CPU/memory/time limits
- **XP & levelling** — `level = floor(sqrt(xp / 100)) + 1`; 7 ranks (BEGINNER → GRANDMASTER)
- **Daily rewards** — 7-day rotating streak (XP + coins)
- **Achievement engine** — 8 trigger types (FIRST_LOGIN, FIRST_CHALLENGE_SOLVED, CHALLENGES_SOLVED, XP_REACHED, LEVEL_REACHED, STREAK_REACHED, DAILY_REWARD_STREAK, PERFECT_SUBMISSION)
- **Leaderboard** — global + weekly Redis sorted sets, auto-reconciled from DB on startup

### Live Duels

- Real-time 1v1 arena via authenticated Socket.IO `/duel` namespace
- Redis-backed live state per match (code, language, progress, spectator count)
- 3-2-1 countdown, synchronized code editor, real-time judging results
- Spectator mode — join with `{ duelId, spectator: true }` for read-only view
- Chat with rate limiting (1 message per 500ms, 500-character cap)
- Score-based winner resolution; loser + winner notified in real time

### 3D Escape Rooms

- React Three Fiber renderer — procedural forest chamber with WASD movement
- Orbit/look controls, lighting, shadows, particles, clickable coding terminal
- Server-computed level gating — the gate reflects actual completion
- `Low` / `Medium` / `High` quality selector; automatic 2D fallback when WebGL unavailable
- Scene state persisted via `PUT /api/v1/player/levels/:levelId/scene/state`
- Admins publish scene definitions (GLTF/GLB URL + layout JSON) via `/api/v1/admin/scenes`

### Adaptive AI Hints

- Groq-powered hints tailored to the challenge, language, and student code
- Personalized: skill level, error patterns, previous hint types, and preferred learning style
- Daily quota metering (default 20 hints per 24h) tracked via durable DB rows
- Helpful/not-helpful voting; hints marked resolved when challenge is accepted
- Rule-based fallback hint returned when Groq is unavailable or unconfigured
- Privacy: no user identity sent to Groq — only challenge context and anonymized signals

### Social Features

- Friend search, friend requests, presence-aware friend list, blocking
- Direct messaging via Socket.IO (friendship + block checks enforced server-side)
- Activity feed for friend network
- Quick-match matchmaking queue (XP-rating based pairing)

### Learning Measurement

- Pre/post assessments per world or level (answer keys never returned to players)
- A/B experiment framework with sticky per-user variant assignment
- Admin analytics: paired pre/post score improvement, median improvement, assessment time
- CSV export with short-lived anonymous identifiers (no PII)
- Consent-gated telemetry — opt-in, off by default; withdrawing consent immediately deletes all raw data

### Admin Capabilities

- Full CRUD: challenges, test cases, hints, worlds, levels, room keys/locks, achievements
- User management: role change, suspend (disconnects live sockets instantly), reactivate
- Live system dashboard: DB, Redis, code-runner health, queue depth, uptime
- Immutable audit log for all admin write actions
- Hint analytics and telemetry summary

### Security & Infrastructure

- JWT access token (15m) + refresh token (30d) with family revocation
- bcrypt password hashing (12 rounds); hashed reset tokens
- OAuth 2.0 (Google, GitHub) with email-link account merging
- Rate limiting: 100/15min general, 20/15min auth, 10/1min submissions, 20/1hr AI hints
- Helmet CSP, explicit CORS, trust-proxy hop configuration
- Suspended users disconnected from all sockets immediately
- `/duel` namespace registered in server-wide suspension sweep (60s interval)
- Email: SMTP provider (no SDK) + dev stdout preview; welcome + password reset templates
- Firebase Cloud Messaging web push (opt-in from Settings)

---

## Tech Stack

| Layer         | Technology                                                                     |
| ------------- | ------------------------------------------------------------------------------ |
| Frontend      | React 19, Vite, TypeScript, Tailwind CSS, Framer Motion, Zustand, React Router |
| Code editor   | Monaco Editor (npm, lazy-loaded, separate chunk)                               |
| 3D graphics   | React Three Fiber, Three.js                                                    |
| Backend       | Node.js, Express, TypeScript, Socket.IO                                        |
| Worker        | Separate Node process draining Redis execution queue                           |
| Database      | PostgreSQL 16, Prisma ORM                                                      |
| Cache / Queue | Redis 7, ioredis                                                               |
| Auth          | JWT (access + refresh rotation), bcrypt, OAuth 2.0                             |
| AI hints      | Groq chat completions API (optional)                                           |
| Notifications | Firebase Cloud Messaging (opt-in)                                              |
| Code runner   | Docker, custom sandbox image                                                   |
| Monorepo      | pnpm workspaces, Turborepo                                                     |
| Testing       | Vitest (unit + integration), Supertest (HTTP), Playwright (E2E)                |
| CI            | GitHub Actions (lint, typecheck, build, test)                                  |

---

## Testing

```bash
# All server unit + integration tests (170 tests)
pnpm --filter @code-to-escape/server test

# All tests across the monorepo (excluding E2E)
pnpm test

# E2E tests — requires the full stack running (all 4 services)
pnpm test:e2e
```

The server test suite covers: auth flows, RBAC, challenge CRUD, submission judging, duel system, escape-room gating, telemetry consent, rate-limit store, and adaptive hints.

---

## Project Scope

Code to Escape is a web-only, responsive platform. The implemented scope includes gamified worlds and escape rooms, real-time duels, adaptive AI hints, 3D scenes with 2D fallback, social features, Firebase Cloud Messaging notifications, and learning measurement and analytics. A mobile application is outside this project.

---

## Contributors

- **Dilip Kumar C** — project engineering, platform implementation, infrastructure, and documentation

---

## License

Private — graduation project.
