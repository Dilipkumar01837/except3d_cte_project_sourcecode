# Deployment Guide

## Docker Compose (Development)

```bash
pnpm docker:up
```

Services:

- PostgreSQL on port 5432
- Redis on port 6379

## Production Build

```bash
pnpm build
```

Dockerfiles are located in:

- `docker/server/Dockerfile`
- `docker/web/Dockerfile`
- `docker/nginx/nginx.conf`

## Environment Variables

See `.env.example` for all required variables.

## CI/CD

GitHub Actions workflow at `.github/workflows/ci.yml` runs lint, typecheck, and build on every push.
