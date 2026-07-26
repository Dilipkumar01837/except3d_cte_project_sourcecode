# Code to Escape

Gamified real-time programming learning platform — browser-based 3D adventure where programming is integrated into gameplay.

## Monorepo Structure

```
apps/
  game-client/       React 19 + Vite + React Three Fiber
  admin-dashboard/   Admin shell (Day 9)
  server/            Express API + Socket.io
packages/
  config/            Shared ESLint + TypeScript configs
  types/             Shared TypeScript types
  utils/             Shared utilities
  shared/            Shared constants
  ui/                Shared UI components
  game-engine/       Game engine shell (Day 3+)
database/            Prisma schema and migrations
docker/              Dockerfiles and Nginx config
docs/                Project documentation
```

## Prerequisites

- Node.js 20+
- pnpm 9+
- Docker (optional, for PostgreSQL and Redis)

## Quick Start

```bash
pnpm install
cp .env.example .env
pnpm docker:up
pnpm db:generate
pnpm dev
```

## Scripts

| Script             | Description                        |
| ------------------ | ---------------------------------- |
| `pnpm dev`         | Start all apps in development mode |
| `pnpm build`       | Build all packages and apps        |
| `pnpm lint`        | Run ESLint across the monorepo     |
| `pnpm typecheck`   | Run TypeScript checks              |
| `pnpm db:generate` | Generate Prisma client             |
| `pnpm docker:up`   | Start PostgreSQL and Redis         |

## Day 1 Status

- Monorepo foundation with Turborepo and pnpm workspaces
- Express server with health endpoint at `GET /api/v1/health`
- React game client with landing page, 404 page, and basic 3D scene
- Prisma configured (schema only, no models yet)
- Docker Compose for PostgreSQL and Redis
- GitHub Actions CI pipeline

## License

Private — graduation project.
