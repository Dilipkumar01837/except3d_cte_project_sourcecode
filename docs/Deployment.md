# Deployment Guide

## Docker Compose (Development)

```bash
pnpm docker:up
```

Services started by `docker-compose.yml`:

| Service               | Role                                                          |
| --------------------- | ------------------------------------------------------------- |
| `postgres`            | PostgreSQL 16, published on `127.0.0.1:5432`                  |
| `redis`               | Redis 7 (queue + leaderboards), published on `127.0.0.1:6379` |
| `code-runner-sandbox` | One-shot build of the sandbox image                           |
| `code-runner`         | Sandbox execution service, published on `127.0.0.1:3002`      |
| `server`              | Express API + Socket.IO, published on `127.0.0.1:3000`        |
| `worker`              | Drains the execution queue                                    |

Data services and the runner are bound to loopback so they are not reachable from other
machines on the network. The code runner in particular must never be exposed publicly: it
executes untrusted code and is protected only by a shared bearer token.

### The worker is required

`server` enqueues submissions to Redis; `worker` is the only process that dequeues and
judges them. Running `server` without `worker` means submissions return `202` and then stay
`QUEUED` indefinitely. There is no in-process fallback by design.

```bash
docker compose up -d server worker      # both
pnpm dev:worker                         # worker only, against a locally run API
```

## Production Build

```bash
pnpm build
```

Dockerfiles are located in:

- `docker/server/Dockerfile` — API and worker. The worker runs the same image with
  `command: node dist/worker.js`; the API uses the image default.
- `docker/code-runner/Dockerfile` — the runner service
- `docker/code-runner/sandbox.Dockerfile` — the sandbox image the runner executes code in
- `docker/web/Dockerfile` — frontend bundles
- `docker/nginx/nginx.conf` — reverse proxy

Tests are excluded from the server build via `apps/server/tsconfig.build.json`, so `dist/`
ships no test files even though they remain typechecked and linted.

## Environment Variables

See `.env.example` for all required variables.

Two settings fail fast in production rather than starting insecurely:

- `JWT_SECRET`, `REFRESH_TOKEN_SECRET` and `CODE_RUNNER_TOKEN` must not still hold their
  development defaults, and must be at least 32 characters.
- `TRUST_PROXY_HOPS` must match the real number of reverse-proxy hops. Setting it too high
  lets a client spoof `X-Forwarded-For` and evade IP rate limits; leaving it at `0` behind a
  proxy makes every client share one rate-limit bucket.

## CI/CD

`.github/workflows/ci.yml` runs four jobs:

- `quality` — lint, typecheck, build
- `test` — unit and API tests against Postgres and Redis services
- `sandbox` — builds the sandbox image, starts the code runner, and runs `judging.test.ts`
  with `REQUIRE_SANDBOX=1` so a missing runner fails the job instead of silently skipping
- `docker` — validates the Compose file

The `sandbox` job exists because the judging tests self-skip when no runner answers
`/health`. Without it, the only tests that actually execute submitted code would never run
in CI and a broken judge would still look green.
