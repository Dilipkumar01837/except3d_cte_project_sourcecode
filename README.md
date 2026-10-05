# Code to Escape

> **Gamified programming learning platform** — a browser-based application where learners solve coding challenges, earn XP, progress through worlds, compare rankings, and compete in duel lobbies.

[![CI](https://github.com/Dilipkumar01837/except3d_cte_project_sourcecode/actions/workflows/ci.yml/badge.svg)](https://github.com/Dilipkumar01837/except3d_cte_project_sourcecode/actions)

---

## What is it?

Code to Escape turns programming practice into a game. Players write Python, JavaScript, TypeScript, Go, Rust, C++, or Java to solve published challenges. Accepted submissions award XP and coins, update progress, and feed daily streaks, achievements, and leaderboards. An isolated Docker sandbox executes code with per-request CPU, memory, and time limits.

---

## Monorepo Structure

```
apps/
  game-client/          React 19 + Vite — player-facing SPA (port 5173)
  admin-dashboard/      React 19 + Vite — admin SPA (port 5174)
  server/               Express API + Socket.IO (port 3000)
  code-runner/          Isolated code execution service (port 3002)
  e2e/                  Playwright end-to-end tests
packages/
  shared/               APP_NAME, API_BASE_PATH constants
  types/                Shared TypeScript types
  utils/                Pure utility functions
  ui/                   Shared React UI components
  config/               Shared ESLint + TypeScript configs
database/
  prisma/               Schema and database migrations
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

Open separate terminals for the API, worker, game client, and admin dashboard:

```bash
# Terminal 1 — API server
pnpm --filter @code-to-escape/server dev

# Terminal 2 — execution worker (required for submissions to be judged)
pnpm dev:worker

# Terminal 3 — Game client
pnpm --filter @code-to-escape/game-client dev

# Terminal 4 — Admin dashboard
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
| API             | http://localhost:3000/api/v1                  |
| Health check    | http://localhost:3000/api/v1/health           |
| Readiness       | http://localhost:3000/api/v1/health/readiness |

### 5 — Start the execution worker

Not optional. Without it, submissions are enqueued to Redis and stay `QUEUED` forever,
because the API process never executes player code itself:

```bash
pnpm dev:worker
```

The worker is already running if you started the stack with `docker compose up -d`, which
launches `server` and `worker` together.

---

## Scripts

| Script                                      | Description                        |
| ------------------------------------------- | ---------------------------------- |
| `pnpm dev`                                  | Start all apps in development mode |
| `pnpm dev:worker`                           | Start the execution worker         |
| `pnpm build`                                | Build all packages and apps        |
| `pnpm lint`                                 | Run ESLint across the monorepo     |
| `pnpm typecheck`                            | TypeScript type-check all packages |
| `pnpm test`                                 | Run all package tests              |
| `pnpm test:e2e`                             | Run the Playwright E2E suite       |
| `pnpm --filter @code-to-escape/server test` | Run server tests with Vitest       |
| `pnpm db:generate`                          | Generate Prisma client             |
| `pnpm db:migrate`                           | Apply pending migrations           |
| `pnpm docker:up`                            | Start PostgreSQL and Redis         |

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
GROQ_API_KEY=<optional-groq-api-key>
GROQ_MODEL=llama-3.3-70b-versatile
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

## Implemented Features

### Live Duels

Duel arenas use the authenticated Socket.IO `/duel` namespace. Each match has a
`duel:<id>` room with Redis-backed live state for ready status, current code,
language, progress, and spectator count. Players can ready up, receive a
3-2-1 countdown, synchronize editor changes, submit through the existing REST
submission endpoint, and receive judging progress and final results in real
time. Code is still executed only by the Docker sandbox worker; it is never
evaluated by the API process.

Authenticated non-participants can join a match with `{ duelId, spectator: true }`
and receive read-only code, progress, spectator-count, result, and chat events.
The worker publishes result events through Redis so separate API and worker
processes deliver the same live result to every arena. Code updates are capped
at 100,000 characters and rate-limited server-side; chat is capped at 500
characters and one message per 500ms.

The main client event contract is: `duel:join`, `duel:ready`,
`duel:code-update`, `duel:progress-update`, `duel:submit`, `duel:result`,
`duel:spectator-join`, `duel:spectator-leave`, and `duel:chat-message`.

### Core Platform

### Learning Measurement

Learning measurement is available on the web clients only. Admins can create
published `PRE` and `POST` assessments for a world or level through the admin
API, while players can take published assessments at `/assessments?worldId=...`
and retrieve their saved attempts through `/api/v1/learning/assessment-results`.
Answers are scored on the server; answer keys are never returned to players.

Admins can define active experiments with sticky per-user variants through
`/api/v1/admin/experiments`. Variant assignment is idempotent and can be
requested by an authenticated client at `/api/v1/learning/experiments/assign`.
The admin dashboard's **Learning Analytics** page (`/analytics`) reports paired
pre/post score improvement, median improvement, assessment time, and experiment
assignment coverage. Its CSV export contains only salted, short-lived anonymous
user identifiers, event type, metadata, and timestamp.

Research telemetry remains opt-in and off by default. The Settings privacy
control explains the collection boundary; withdrawing consent immediately
deletes both legacy telemetry and research `UserEvent` rows. The migration is
`20261005120000_learning_measurement` and is applied with:

```bash
pnpm db:migrate:deploy
```

### 3D Escape Rooms

The web game client includes a React Three Fiber proof-of-concept renderer for
escape rooms. It provides a procedural forest chamber with WASD movement,
orbit/look controls, lighting, shadows, particles, a clickable coding terminal,
and a gate that reflects server-computed level completion. The terminal opens
the existing challenge flow, so Docker execution and progression remain
unchanged.

Players can choose `Low`, `Medium`, or `High` quality, use **Skip 3D** or
**Use 2D room**, and automatically receive the 2D fallback when WebGL is
unavailable. Position and scene progress use
`/api/v1/player/levels/:levelId/scene/state`; Redis caches the live snapshot and
PostgreSQL persists it in `PlayerSceneState`.

Admins can publish scene definitions through `/api/v1/admin/scenes` with a
level ID, optional GLTF/GLB URL, object layout JSON, and settings JSON. The
schema and state migration is `20261005130000_3d_escape_rooms`.

### Social Features

The web client now includes `/friends` for player search, friend requests,
presence-aware friend lists, and blocked-user controls. Direct messages use the
authenticated Socket.IO connection with server-side friendship/block checks;
message history is available through `/api/v1/social/messages/:userId`.

The duel lobby's **Quick match** button uses the Redis ranked queue at
`/api/v1/social/matchmaking` and pairs nearby XP ratings for the selected
challenge. Matched players receive `social:match-found`; queued players can
cancel with `DELETE /api/v1/social/matchmaking`.

Social persistence is introduced by migration
`20261005140000_social_layer`. All social routes require authentication, public
profile responses omit email addresses, and block relationships prevent both
friend requests and direct messages.

### Web Push Notifications

Web push uses Firebase Cloud Messaging and is opt-in from the web Settings
page. Create or select a Firebase web app, enable Cloud Messaging, generate a
Web Push certificate key pair, and configure these values without committing
them:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_VAPID_KEY=
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

The browser registers `/firebase-messaging-sw.js`, stores tokens through
`/api/v1/notifications/register-token`, and removes them when push is disabled.
Online users receive the existing Socket.io notification event; offline users
with valid FCM tokens receive a push. Delivery is capped at ten messages per
user per hour and invalid FCM tokens are removed automatically. The token
migration is `20261005150000_fcm_tokens`; notification enum values are in
`20261005151000_notification_types`.

- **Auth** — email/password register & login, refresh token rotation with family revocation, forgot/reset password, Google + GitHub OAuth
- **Player profiles** — XP, level, coins, rank (BEGINNER → GRANDMASTER), coding streak, longestStreak
- **Leaderboard** — global + weekly Redis sorted sets, reconciled on startup
- **Daily rewards** — 7-day rotating streak rewards (XP + coins)
- **Notifications** — in-app real-time notifications via Socket.IO
- **Worlds and levels** — published world map, level progress, challenge assignment, and next-world unlocking
- **Escape-room gating** — worlds can hold room keys and key-locked levels; a player's reachable progress is computed from keys held (`resolveLevelAccess` / `reachablePercent`)
- **Duel lobby and arena** — create/join active matches, submit duel solutions; a duel completes once both players have an accepted submission, and the winner is decided by score then earliest finish
- **Consent-gated telemetry** — optional engagement events (off by default), aggregate-only admin summary, retention sweep

### Challenges & Execution

- **7 languages** — Python, Java, JavaScript, TypeScript, C++, Go, Rust
- **Isolated sandbox** — Docker container: `--network none`, `--read-only`, `--cap-drop ALL`, per-request CPU/memory/time limits
- **Execution pipeline** — HTTP API enqueues to Redis; worker dequeues, runs, saves results atomically
- **Scoring** — accuracy × speed bonus × retry penalty; hidden test cases never sent to client
- **AI hints** — optional Groq-powered hints based on the challenge, language, and current student code; authored hints remain available without Groq
- **Hint metering & feedback** — per-user daily AI-hint quota, and helpful/not-helpful voting on authored and AI hints; hints are marked resolved when the challenge is accepted
- **Adaptive hints** — each player has a PostgreSQL learning profile containing skill/error summaries and hint context. Hint depth and type are selected from recent performance, prior hints are supplied to Groq to avoid repetition, and a local rule-based hint is returned when Groq is unavailable.
- **Hint privacy and review** — `/api/v1/hints/preferences` controls personalization, `/api/v1/hints/history` lets players review their hints, and admins can view effectiveness at `/api/v1/admin/hints/analytics`. Only challenge/code context and anonymized learning signals are sent to Groq; no user identity is included.
- **Beginner content** — 6 problems seeded across all 7 languages (42 challenges) in the starter world

### Progression

- **Achievement engine** — 8 trigger types (FIRST_LOGIN, FIRST_CHALLENGE_SOLVED, CHALLENGES_SOLVED, XP_REACHED, LEVEL_REACHED, STREAK_REACHED, DAILY_REWARD_STREAK, PERFECT_SUBMISSION)
- **XP formula** — `level = floor(sqrt(xp / 100)) + 1`
- **Rank progression** — 7 ranks tied to level thresholds
- **Level progression** — accepted assigned challenges update level stars, attempts, best time, world completion, and unlock state

### Admin

- Full CRUD for challenges, test cases, hints, worlds, levels, achievements
- User management (role change, suspend, reactivate)
- Live system dashboard (DB + Redis + code runner health, queue depth, uptime)
- **Audit log** — every write action recorded to `AdminAuditLog`

### Infrastructure & Quality

- **Security** — Helmet CSP, explicit CORS, rate limiting (200/15 min general, 20/15 min auth, 10/1 min submissions), bcrypt passwords, hashed reset tokens
- **Session safety** — suspended accounts have live sockets disconnected and their access is revalidated on socket auth
- **Runner concurrency** — the code runner bounds in-flight executions; excess requests get `503` + `Retry-After`, and `/health` reports in-flight/queued counts
- **Background sweepers** — the worker expires stale duels and prunes telemetry past the retention window
- **Observability** — structured JSON request logger with `X-Request-ID`
- **Email** — SMTP provider (no SDK) + dev stdout preview; welcome + password reset templates
- **CI** — GitHub Actions: lint + typecheck + build + unit tests (with PostgreSQL + Redis services)
- **E2E** — Playwright player journey + admin RBAC tests

---

## Testing

```bash
# Server tests (includes auth, RBAC, challenges, runner contracts, and duel coverage)
pnpm --filter @code-to-escape/server test

# E2E tests (requires running stack)
pnpm test:e2e
```

---

## Tech Stack

| Layer         | Technology                                                                     |
| ------------- | ------------------------------------------------------------------------------ |
| Frontend      | React 19, Vite, TypeScript, Tailwind CSS, Framer Motion, Zustand, React Router |
| Code editor   | Monaco Editor (npm, lazy-loaded)                                               |
| Backend       | Node.js, Express, TypeScript, Socket.IO                                        |
| Worker        | Separate Node process draining the Redis execution queue                       |
| Database      | PostgreSQL 16, Prisma ORM                                                      |
| Cache / Queue | Redis 7, ioredis                                                               |
| Auth          | JWT (access + refresh rotation), bcrypt, OAuth 2.0                             |
| AI hints      | Groq chat completions API (optional)                                           |
| Code runner   | Docker, custom sandbox image                                                   |
| Monorepo      | pnpm workspaces, Turborepo                                                     |
| Testing       | Vitest (unit), Playwright (E2E)                                                |
| CI            | GitHub Actions                                                                 |

---

## License

Private — graduation project.

## Project Scope

Code to Escape is a web-only, responsive platform. The implemented scope includes
gamified worlds and escape rooms, real-time duels, adaptive AI hints, 3D scenes with
2D fallback, social features, Firebase Cloud Messaging notifications, and learning
measurement and analytics. A mobile application is outside this project.

## User Evaluation Study

The evaluation protocol asks whether Code to Escape improves motivation, problem-solving
speed, retention, hint effectiveness, and duel engagement. The planned design is a
randomized between-subjects comparison of traditional coding exercises and Code to Escape,
with pre-test, post-test, delayed post-test, motivation surveys, and consent-gated telemetry.
The target is at least 30 participants per condition; a larger sample is required for a
well-powered confirmatory study.

No analyzed participant dataset or verified statistical results are currently checked into
this repository. Therefore, the synopsis claim remains an evidence-safe design claim rather
than a demonstrated result. See [`docs/EvaluationStudyProtocol.md`](docs/EvaluationStudyProtocol.md),
[`docs/StudyResultsTemplate.md`](docs/StudyResultsTemplate.md), and
[`docs/SynopsisClaim.md`](docs/SynopsisClaim.md).

## How to Run

1. Install Node.js 20+, pnpm 9+, and Docker.
2. Run `pnpm install` and copy `.env.example` to `.env`.
3. Start PostgreSQL and Redis with `docker compose up postgres redis -d`.
4. Apply migrations with `pnpm db:migrate`.
5. Start the API, worker, game client, and admin dashboard using the commands in
   [Quick Start](#quick-start), or run `pnpm dev`.

Configure `DATABASE_URL`, `REDIS_URL`, JWT secrets, code-runner settings, and optional
Groq/Firebase variables in `.env`. The worker must run for submitted code to be judged.

## Technology Stack

- React 19, Vite, TypeScript, Tailwind CSS, Framer Motion, Zustand, React Router, Monaco Editor
- Node.js, Express, Socket.IO, Prisma, PostgreSQL, Redis, Docker
- React Three Fiber and Three.js for web 3D scenes
- Groq API for optional adaptive hints and Firebase Cloud Messaging for web notifications
- Vitest, Supertest, and Playwright for testing

## Frontend Design

The web client uses a dense developer-tool visual language: near-black charcoal surfaces,
one amber action accent, mono typography for code and metrics, 6-8px radii, thin borders,
and short transitions. Shared shell navigation includes a responsive sidebar and `Cmd/Ctrl+K`
command palette. Review the component showcase at `/design-system` while running the game
client. The redesign intentionally avoids purple branding, decorative blobs, heavy shadows,
and large marketing-card treatments.

## Contributors

- Dilip Kumar C — project engineering, platform implementation, infrastructure, and documentation
