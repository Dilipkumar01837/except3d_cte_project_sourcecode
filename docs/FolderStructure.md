# Folder Structure

Generated from the repository. Depth 3, directories only (files omitted for brevity).

```
code-to-escape/
├── apps/
│   ├── admin-dashboard/        React + Vite admin UI (port 5174)
│   │   ├── dist-node/          [git-ignored] Vite node build artefact
│   │   ├── public/
│   │   └── src/
│   │       ├── components/
│   │       ├── features/
│   │       ├── lib/
│   │       └── pages/
│   ├── code-runner/            Node HTTP service — spawns Docker sandboxes (port 3002)
│   │   └── src/
│   ├── e2e/                    Playwright end-to-end tests
│   │   └── tests/
│   ├── game-client/            React + Vite game SPA (port 5173)
│   │   ├── public/
│   │   └── src/
│   │       ├── app/            Router, providers
│   │       ├── features/       Feature modules (see below)
│   │       │   ├── auth/
│   │       │   ├── challenges/
│   │       │   ├── duels/
│   │       │   ├── escape-room/
│   │       │   ├── friends/
│   │       │   ├── leaderboard/
│   │       │   ├── notifications/
│   │       │   ├── player/
│   │       │   └── worlds/
│   │       └── shared/
│   └── server/                 Express + Prisma API + worker (port 3000)
│       ├── scripts/            Seed scripts and admin utilities
│       └── src/
│           ├── app/            Express app factory
│           ├── config/         Env + secrets validation
│           ├── modules/        Domain modules (see below)
│           │   ├── admin/
│           │   ├── auth/
│           │   ├── challenges/
│           │   ├── daily-reward/
│           │   ├── duels/
│           │   ├── health/
│           │   ├── hints/
│           │   ├── learning/
│           │   ├── notifications/
│           │   ├── player/
│           │   ├── scenes/
│           │   ├── social/
│           │   └── telemetry/
│           ├── shared/         Cross-module utilities (redis, rate-limit, socket)
│           └── tests/          Vitest integration tests
├── database/
│   └── prisma/
│       ├── migrations/
│       └── schema.prisma       48 models
├── docker/
│   ├── code-runner/            Sandbox Dockerfile + execute.py
│   ├── nginx/                  nginx.conf (reverse proxy)
│   ├── server/                 API/worker Dockerfile
│   └── web/                    SPA static-file Dockerfile
├── docs/                       Project documentation
├── packages/                   Shared internal packages
│   ├── config/                 ESLint / tsconfig shared configs
│   ├── shared/
│   ├── types/
│   ├── ui/
│   └── utils/
└── scripts/                    Root-level utility scripts
```

## Key files

| File                                              | Purpose                                                 |
| ------------------------------------------------- | ------------------------------------------------------- |
| `pnpm-workspace.yaml`                             | Defines the monorepo workspace                          |
| `turbo.json`                                      | Turborepo pipeline (build, test, lint)                  |
| `docker-compose.yml`                              | Development / production container stack                |
| `docker-compose.prod.yml`                         | Production override (docker-socket-proxy)               |
| `.env.example`                                    | Environment variable reference                          |
| `database/prisma/schema.prisma`                   | Single source of truth for all 48 DB models             |
| `apps/server/src/app/create-app.ts`               | Express app factory — mounts 15 routers                 |
| `apps/game-client/src/app/router/AppRouter.tsx`   | Client-side routes (22 routes)                          |
| `apps/server/scripts/seed-worlds.ts`              | Seeds 6 game worlds on a fresh DB                       |
| `apps/server/scripts/seed-beginner-challenges.ts` | Seeds 42 beginner challenges (7 languages × 6 problems) |

## Module naming conventions

- `*.routes.ts` — Express router definition
- `*.service.ts` — Business logic, database queries
- `*.schema.ts` — Zod validation schemas
- `*.test.ts` — Vitest unit or integration test
- `*-widgets.tsx` — Stateless React sub-components (UI only)
- `*-characters.tsx` / `*-environments.tsx` — 3D scene sub-components
