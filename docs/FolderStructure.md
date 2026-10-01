# Folder Structure

```
code-to-escape/
├── apps/
│   ├── game-client/          # Main game React app
│   ├── admin-dashboard/      # Admin React shell
│   ├── server/               # Express API server + execution worker entrypoint
│   ├── code-runner/          # Sandbox runner HTTP service
│   └── e2e/                  # Playwright E2E suite
├── packages/
│   ├── config/               # ESLint + TypeScript configs
│   ├── types/                # Shared types
│   ├── utils/                # Shared utilities
│   ├── shared/               # Shared constants
│   └── ui/                   # Shared UI components
├── database/
│   └── prisma/               # Prisma schema
├── docker/                   # Docker configs
├── docs/                     # Documentation
└── .github/workflows/        # CI/CD
```

## Feature-Based Frontend

```
apps/game-client/src/
├── app/           # App shell, router
├── features/      # Feature modules (home, not-found, ...)
├── shared/        # Shared components, hooks, lib
└── styles/        # Global styles
```

## Modular Backend

```
apps/server/src/
├── app/           # Server bootstrap
├── config/        # Environment config
├── modules/       # Feature modules (health, ...)
└── shared/        # Middleware, lib
```
