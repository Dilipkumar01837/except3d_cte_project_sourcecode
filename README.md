# Code to Escape

> **Gamified real-time programming learning platform** — a browser-based adventure where you write real code to solve puzzles, earn XP, and escape through five themed worlds.

[![CI](https://github.com/dilipkumardilip/code-to-escape/actions/workflows/ci.yml/badge.svg)](https://github.com/dilipkumardilip/code-to-escape/actions)

---

## What is it?

Code to Escape turns programming practice into a game. Players write Python, JavaScript, TypeScript, Go, Rust, C++, or Java to unlock pathways, outsmart puzzles, and progress through worlds. Every solved challenge earns XP and coins; every daily login extends a streak. An isolated Docker sandbox executes code safely with per-request CPU, memory, and time limits.

---

## Monorepo Structure

```
apps/
  game-client/          React 19 + Vite — player-facing SPA (port 5173)
  admin-dashboard/      React 19 + Vite — admin SPA (port 5174)
  server/               Express API + Socket.IO (port 3001)
  code-runner/          Isolated code execution service (port 3002)
  e2e/                  Playwright end-to-end tests
packages/
  shared/               APP_NAME, API_BASE_PATH constants
  types/                Shared TypeScript types
  utils/                Pure utility functions
  ui/                   Shared React UI components
  game-engine/          Game logic (XP, levelling)
  config/               Shared ESLint + TypeScript configs
database/
  prisma/               Schema (17 models) + 6 migrations
docker/
  code-runner/          Sandbox + runner Dockerfiles
docs/
  API.md                Full API reference
  Architecture.md       System architecture
```

---

## Quick Start

### Prerequisites

- **Node.js** 20+
- **pnpm** 9+
- **Docker** (for PostgreSQL, Redis, and the code runner sandbox)

### 1 — Install & configure

```bash
git clone <repo-url>
cd code-to-escape
pnpm install
cp .env.example .env          # review and edit as needed
```

### 2 — Start infrastructure

```bash
docker compose up postgres redis -d
```

### 3 — Apply database migrations

```bash
pnpm db:migrate
```

### 4 — Start all dev servers

Open **three terminals**:

```bash
# Terminal 1 — API server
pnpm --filter @code-to-escape/server dev

# Terminal 2 — Game client
pnpm --filter @code-to-escape/game-client dev

# Terminal 3 — Admin dashboard
pnpm --filter @code-to-escape/admin-dashboard dev
```

Or from the root (starts everything in parallel):

```bash
pnpm dev
```

| Service         | URL                                           |
| --------------- | --------------------------------------------- |
| Game client     | http://localhost:5173                         |
| Admin dashboard | http://localhost:5174                         |
| API             | http://localhost:3001/api/v1                  |
| Health check    | http://localhost:3001/api/v1/health           |
| Readiness       | http://localhost:3001/api/v1/health/readiness |

### 5 — (Optional) Start execution worker

Required to actually run submitted code:

```bash
pnpm --filter @code-to-escape/server worker
```

---

## Scripts

| Script             | Description                              |
| ------------------ | ---------------------------------------- |
| `pnpm dev`         | Start all apps in development mode       |
| `pnpm build`       | Build all packages and apps              |
| `pnpm lint`        | Run ESLint across the monorepo           |
| `pnpm typecheck`   | TypeScript type-check all packages       |
| `pnpm test`        | Run server unit tests (Vitest, 57 tests) |
| `pnpm db:generate` | Generate Prisma client                   |
| `pnpm db:migrate`  | Apply pending migrations                 |
| `pnpm docker:up`   | Start PostgreSQL and Redis               |

---

## Environment Variables

Copy `.env.example` to `.env`. The minimum required set:

```env
DATABASE_URL=postgresql://cte:cte_dev_password@localhost:5432/code_to_escape
REDIS_URL=redis://localhost:6379
JWT_SECRET=<any-long-random-string>
REFRESH_TOKEN_SECRET=<different-long-random-string>
CODE_RUNNER_URL=http://localhost:3002
CODE_RUNNER_TOKEN=code-to-escape-dev-runner-token
```

All other variables have sensible defaults for development.

---

## Architecture

```
Browser → game-client (React) ──┐
Browser → admin-dashboard ──────┤──▶ server (Express + Socket.IO)
                                 │        │
                                 │        ├──▶ PostgreSQL (Prisma)
                                 │        ├──▶ Redis (leaderboard + queue)
                                 │        └──▶ code-runner (Docker sandbox)
                                 │                  └──▶ sandbox container
                                 └── execution worker (separate process)
```

Full details: [`docs/Architecture.md`](docs/Architecture.md)  
Full API reference: [`docs/API.md`](docs/API.md)

---

## Features Implemented (Days 1–10)

### Core Platform

- **Auth** — email/password register & login, refresh token rotation with family revocation, forgot/reset password, Google + GitHub OAuth
- **Player profiles** — XP, level, coins, rank (BEGINNER → GRANDMASTER), coding streak, longestStreak
- **Leaderboard** — global + weekly Redis sorted sets, reconciled on startup
- **Daily rewards** — 7-day rotating streak rewards (XP + coins)
- **Notifications** — in-app real-time notifications via Socket.IO

### Challenges & Execution

- **7 languages** — Python, Java, JavaScript, TypeScript, C++, Go, Rust
- **Isolated sandbox** — Docker container: `--network none`, `--read-only`, `--cap-drop ALL`, per-request CPU/memory/time limits
- **Execution pipeline** — HTTP API enqueues to Redis; worker dequeues, runs, saves results atomically
- **Scoring** — accuracy × speed bonus × retry penalty; hidden test cases never sent to client

### Progression

- **Achievement engine** — 8 trigger types (FIRST_LOGIN, FIRST_CHALLENGE_SOLVED, CHALLENGES_SOLVED, XP_REACHED, LEVEL_REACHED, STREAK_REACHED, DAILY_REWARD_STREAK, PERFECT_SUBMISSION)
- **XP formula** — `level = floor(sqrt(xp / 100)) + 1`
- **Rank progression** — 7 ranks tied to level thresholds

### Admin

- Full CRUD for challenges, test cases, hints, worlds, levels, achievements
- User management (role change, suspend, reactivate)
- Live system dashboard (DB + Redis + code runner health, queue depth, uptime)
- **Audit log** — every write action recorded to `AdminAuditLog`

### Infrastructure & Quality

- **Security** — Helmet CSP, explicit CORS, rate limiting (200/15 min general, 20/15 min auth, 10/1 min submissions), bcrypt passwords, hashed reset tokens
- **Observability** — structured JSON request logger with `X-Request-ID`
- **Email** — SMTP provider (no SDK) + dev stdout preview; welcome + password reset templates
- **CI** — GitHub Actions: lint + typecheck + build + unit tests (with PostgreSQL + Redis services)
- **E2E** — Playwright player journey + admin RBAC tests

---

## Testing

```bash
# Unit tests (57 tests — register, login, RBAC, challenges, submissions, password reset)
pnpm test

# E2E tests (requires running stack)
pnpm test:e2e
```

---

## Tech Stack

| Layer         | Technology                                                                          |
| ------------- | ----------------------------------------------------------------------------------- |
| Frontend      | React 19, Vite, TypeScript, Tailwind CSS, Framer Motion, Zustand, React Three Fiber |
| Code editor   | Monaco Editor (npm, lazy-loaded)                                                    |
| Backend       | Node.js, Express, TypeScript, Socket.IO                                             |
| Database      | PostgreSQL 16, Prisma ORM                                                           |
| Cache / Queue | Redis 7, ioredis                                                                    |
| Auth          | JWT (access + refresh rotation), bcrypt, OAuth 2.0                                  |
| Code runner   | Docker, custom sandbox image                                                        |
| Monorepo      | pnpm workspaces, Turborepo                                                          |
| Testing       | Vitest (unit), Playwright (E2E)                                                     |
| CI            | GitHub Actions                                                                      |

---

## License

Private — graduation project.

# except3d_cte_project_sourcecode
