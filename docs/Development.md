# Development Guide

## Setup

1. Install dependencies: `pnpm install`
2. Copy environment: `cp .env.example .env`
3. Start infrastructure: `pnpm docker:up`
4. Generate Prisma client: `pnpm db:generate`

## Running Apps

```bash
# All apps
pnpm dev

# Individual apps
pnpm --filter @code-to-escape/server dev
pnpm --filter @code-to-escape/game-client dev
pnpm --filter @code-to-escape/admin-dashboard dev
```

## Health Check

```bash
curl http://localhost:3001/api/v1/health
```

Expected response:

```json
{ "status": "ok" }
```

## Code Quality

```bash
pnpm lint
pnpm typecheck
pnpm format:check
```

## Branch Strategy

- `main` — production
- `develop` — integration
- `feature/day-N-*` — daily feature branches
