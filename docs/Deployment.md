# Code to Escape — Production Deployment Guide

## Architecture

```
Internet
  │
  ▼
[Cloudflare / DNS]
  │
  ▼
[Linux VM]
  ├── nginx (port 443/80, HTTPS termination, TLS via Certbot)
  │     ├── /api/v1/* → cte-server:3000
  │     ├── /socket.io/* → cte-server:3000
  │     └── /* → cte-web:80 (built SPA, or redirect to Vercel)
  ├── cte-server (Express + Socket.IO, port 127.0.0.1:3000)
  ├── cte-worker (same image, drains Redis queue)
  ├── cte-code-runner (port 127.0.0.1:3002, internal only)
  ├── cte-docker-proxy (Tecnativa socket proxy, port 2375 internal)
  ├── cte-postgres (port 127.0.0.1:5432)
  └── cte-redis (port 127.0.0.1:6379)

Vercel (optional, recommended for frontends):
  ├── game-client SPA — root dir: apps/game-client
  └── admin-dashboard SPA — root dir: apps/admin-dashboard
```

All backend services communicate over the Docker bridge network.
No backend ports (5432, 6379, 3002, 3000) are exposed to the public internet.

---

## Service Names and Paths

| Service             | Docker name                     | Package                       | Dockerfile                              |
| ------------------- | ------------------------------- | ----------------------------- | --------------------------------------- |
| API server          | `cte-server`                    | `@code-to-escape/server`      | `docker/server/Dockerfile`              |
| Background worker   | `cte-worker`                    | `@code-to-escape/server`      | `docker/server/Dockerfile`              |
| Code runner         | `cte-code-runner`               | `@code-to-escape/code-runner` | `docker/code-runner/Dockerfile`         |
| Sandbox image       | `code-to-escape/sandbox:latest` | —                             | `docker/code-runner/sandbox.Dockerfile` |
| Game client         | `cte-web`                       | `@code-to-escape/game-client` | `docker/web/Dockerfile`                 |
| Docker socket proxy | `cte-docker-proxy`              | —                             | tecnativa/docker-socket-proxy:0.3       |
| PostgreSQL          | `cte-postgres`                  | —                             | postgres:16-alpine                      |
| Redis               | `cte-redis`                     | —                             | redis:7-alpine                          |
| Nginx               | `cte-nginx`                     | —                             | nginx:1.27-alpine                       |

---

## Environment Variables

### Required for server and worker

| Variable                      | Service        | Required | Notes                                                                                                     |
| ----------------------------- | -------------- | -------- | --------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`                    | server, worker | yes      | Set to `production`                                                                                       |
| `PORT`                        | server         | yes      | `3000` (fixed, matches docker-compose)                                                                    |
| `DATABASE_URL`                | server, worker | yes      | `postgresql://USER:PASS@postgres:5432/code_to_escape`                                                     |
| `REDIS_URL`                   | server, worker | yes      | `redis://redis:6379`                                                                                      |
| `JWT_SECRET`                  | server         | yes      | Min 32 chars, unique. Generate: `openssl rand -hex 32`                                                    |
| `REFRESH_TOKEN_SECRET`        | server         | yes      | Min 32 chars, unique. Generate: `openssl rand -hex 32`                                                    |
| `JWT_EXPIRES_IN`              | server         | no       | Default `15m`                                                                                             |
| `REFRESH_TOKEN_EXPIRES_IN`    | server         | no       | Default `30d`                                                                                             |
| `CODE_RUNNER_URL`             | server, worker | yes      | `http://code-runner:3002` (in Docker)                                                                     |
| `CODE_RUNNER_TOKEN`           | server, worker | yes      | Min 32 chars. Generate: `openssl rand -hex 32`                                                            |
| `CORS_ORIGIN`                 | server         | yes      | Comma-separated list of frontend origins, e.g. `https://game.yourdomain.com,https://admin.yourdomain.com` |
| `TRUST_PROXY_HOPS`            | server         | yes      | `1` when behind nginx; `0` for direct access                                                              |
| `APP_URL`                     | server         | no       | Game client URL                                                                                           |
| `GROQ_API_KEY`                | server         | no       | AI hints; leave empty to use authored hints only                                                          |
| `GROQ_MODEL`                  | server         | no       | Default `llama-3.3-70b-versatile`                                                                         |
| `GOOGLE_CLIENT_ID`            | server         | no       | OAuth; leave empty to disable                                                                             |
| `GOOGLE_CLIENT_SECRET`        | server         | no       | OAuth                                                                                                     |
| `GITHUB_CLIENT_ID`            | server         | no       | OAuth                                                                                                     |
| `GITHUB_CLIENT_SECRET`        | server         | no       | OAuth                                                                                                     |
| `FIREBASE_ADMIN_PROJECT_ID`   | server         | no       | FCM push notifications                                                                                    |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | server         | no       | FCM                                                                                                       |
| `FIREBASE_ADMIN_PRIVATE_KEY`  | server         | no       | FCM (use `\n` for newlines)                                                                               |
| `TELEMETRY_RETENTION_DAYS`    | worker         | no       | Default `90`                                                                                              |
| `TELEMETRY_MAX_BATCH`         | server         | no       | Default `50`                                                                                              |
| `TELEMETRY_SWEEP_INTERVAL_MS` | worker         | no       | Default `21600000` (6h)                                                                                   |
| `POSTGRES_PASSWORD`           | postgres       | yes      | Set in docker-compose env or `.env`                                                                       |

### Code runner service

| Variable                      | Required   | Notes                                             |
| ----------------------------- | ---------- | ------------------------------------------------- |
| `PORT`                        | no         | Default `3002`                                    |
| `CODE_RUNNER_TOKEN`           | yes        | Must match server's `CODE_RUNNER_TOKEN`           |
| `CODE_RUNNER_IMAGE`           | no         | Default `code-to-escape/sandbox:latest`           |
| `CODE_RUNNER_BIND_HOST`       | no         | Default `127.0.0.1`; set `0.0.0.0` inside Docker  |
| `CODE_RUNNER_MAX_CONCURRENCY` | no         | Default `4`                                       |
| `CODE_RUNNER_MAX_QUEUE`       | no         | Default `16`                                      |
| `DOCKER_HOST`                 | yes (prod) | `tcp://docker-proxy:2375` when using prod compose |

### Browser-exposed variables (Vite)

The game client and admin dashboard use **relative API paths** (`/api/v1`) and rely on the nginx proxy or Vercel rewrites to reach the backend. No `VITE_` variables containing secrets are needed. Firebase client variables (`VITE_FIREBASE_*`) are optional and only required if Firebase auth is configured.

| Variable                            | App         | Notes                        |
| ----------------------------------- | ----------- | ---------------------------- |
| `VITE_FIREBASE_API_KEY`             | game-client | Optional; Firebase auth only |
| `VITE_FIREBASE_AUTH_DOMAIN`         | game-client | Optional                     |
| `VITE_FIREBASE_PROJECT_ID`          | game-client | Optional                     |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | game-client | Optional                     |
| `VITE_FIREBASE_APP_ID`              | game-client | Optional                     |
| `VITE_FIREBASE_VAPID_KEY`           | game-client | Optional; push notifications |

---

## Vercel Frontend Deployment

Both frontends use relative `/api/v1` paths. In production they must be served from the **same origin** as the API, or the API's `CORS_ORIGIN` must include the Vercel domain.

### Recommended: same-origin via nginx

Serve both SPAs from nginx (see docker-compose.yml `web` and `nginx` services). The game client is bundled into `docker/web/Dockerfile` and served at `/`.

### Alternative: Vercel (separate origins)

If you deploy frontends to Vercel, the API base URL must be set via a build-time env var or hardcoded. Since both clients currently use `baseURL: '/api/v1'` (relative), you must add `VITE_API_URL` handling, or configure Vercel rewrites to proxy `/api/v1/*` to your backend.

**Simpler approach**: configure each Vercel project to rewrite `/api/v1/*` to your backend URL using `vercel.json` rewrites.

#### Game client — Vercel settings

| Setting          | Value                                             |
| ---------------- | ------------------------------------------------- |
| Root directory   | `apps/game-client`                                |
| Build command    | `pnpm --filter @code-to-escape/game-client build` |
| Install command  | `pnpm install --frozen-lockfile`                  |
| Output directory | `apps/game-client/dist`                           |
| Framework        | Vite                                              |

`apps/game-client/vercel.json` (already created):

```json
{
  "rewrites": [{ "source": "/((?!api/).*)", "destination": "/index.html" }]
}
```

Add a `/api/v1` rewrite to your backend if serving API from Vercel:

```json
{
  "rewrites": [
    { "source": "/api/v1/(.*)", "destination": "https://api.yourdomain.com/api/v1/$1" },
    { "source": "/((?!api/).*)", "destination": "/index.html" }
  ]
}
```

#### Admin dashboard — Vercel settings

| Setting          | Value                                                 |
| ---------------- | ----------------------------------------------------- |
| Root directory   | `apps/admin-dashboard`                                |
| Build command    | `pnpm --filter @code-to-escape/admin-dashboard build` |
| Install command  | `pnpm install --frozen-lockfile`                      |
| Output directory | `apps/admin-dashboard/dist`                           |
| Framework        | Vite                                                  |

`apps/admin-dashboard/vercel.json` (already created):

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

#### Vercel environment variables

For each frontend project add in the Vercel dashboard (Settings → Environment Variables):

```
VITE_FIREBASE_API_KEY=<your-value>         # only if Firebase auth is used
VITE_FIREBASE_AUTH_DOMAIN=<your-value>
VITE_FIREBASE_PROJECT_ID=<your-value>
VITE_FIREBASE_MESSAGING_SENDER_ID=<your-value>
VITE_FIREBASE_APP_ID=<your-value>
VITE_FIREBASE_VAPID_KEY=<your-value>
```

---

## Backend Deployment (Docker-capable Linux VM)

### 1. Server preparation

Tested on Ubuntu 24.04 LTS. Minimum: 2 vCPU, 4 GB RAM, 40 GB disk.

```bash
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y git curl ufw nginx certbot python3-certbot-nginx
```

### 2. Docker installation

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Log out and back in, then verify:
docker info
```

### 3. Repository setup

```bash
git clone https://github.com/Dilipkumar01837/except3d_cte_project_sourcecode code-to-escape
cd code-to-escape
```

### 4. Environment file creation

```bash
cp .env.example .env
```

Edit `.env` with production values:

```bash
# Generate secrets — run on the server, never share output
openssl rand -hex 32   # JWT_SECRET
openssl rand -hex 32   # REFRESH_TOKEN_SECRET
openssl rand -hex 32   # CODE_RUNNER_TOKEN
openssl rand -hex 32   # POSTGRES_PASSWORD
```

Minimum `.env` for production:

```
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://cte:POSTGRES_PASSWORD@postgres:5432/code_to_escape
REDIS_URL=redis://redis:6379
JWT_SECRET=<generated-32+-char-secret>
REFRESH_TOKEN_SECRET=<generated-32+-char-secret>
CODE_RUNNER_URL=http://code-runner:3002
CODE_RUNNER_TOKEN=<generated-32+-char-secret>
CORS_ORIGIN=https://game.yourdomain.com,https://admin.yourdomain.com
TRUST_PROXY_HOPS=1
APP_URL=https://game.yourdomain.com
POSTGRES_PASSWORD=<generated-32+-char-secret>
```

### 5. Build the sandbox image

```bash
docker compose build code-runner-sandbox
```

This must run before starting the code runner. The sandbox image contains Python, Java, Node.js/TypeScript, C++, Go, and Rust runtimes.

### 6. Build all services

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml build
```

### 7. Database migration

The server image includes the Prisma schema at `/app/database/prisma/schema.prisma`.

```bash
# Start postgres first, then run migrations inside the server container
docker compose up -d postgres
docker compose run --rm server npx prisma migrate deploy \
  --schema /app/database/prisma/schema.prisma
```

Or from the host (requires pnpm + Prisma CLI, DATABASE_URL pointing at the exposed port):

```bash
DATABASE_URL="postgresql://cte:PASS@localhost:5432/code_to_escape" \
  pnpm db:migrate:deploy
```

**Never run `prisma migrate reset` on production data.**

### 8. Seed initial data

Seeds are idempotent (upsert-based) and safe to run on a fresh database:

```bash
docker compose exec server node dist/scripts/seed-worlds.js
# Or run seed scripts from host (requires DATABASE_URL to point at postgres):
pnpm db:seed
```

### 9. Start all services

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

Check status:

```bash
docker compose ps
```

### 10. Create admin account

```bash
# Usage: <email> <username> <password> [role]
# Role defaults to SUPER_ADMIN when omitted. Script is idempotent.
pnpm --filter @code-to-escape/server exec tsx scripts/create-superuser.ts \
  admin@yourdomain.com adminuser "YourStrongPassword123!"
```

If running directly against a live database from the VM (with DATABASE_URL in env):

```bash
DATABASE_URL="postgresql://cte:PASS@localhost:5432/code_to_escape" \
  pnpm --filter @code-to-escape/server exec tsx scripts/create-superuser.ts \
  admin@yourdomain.com adminuser "YourStrongPassword123!" SUPER_ADMIN
```

---

## Reverse Proxy and HTTPS (nginx + Certbot)

### nginx site config

Create `/etc/nginx/sites-available/cte`:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    add_header Strict-Transport-Security "max-age=63072000" always;

    # API
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSockets
    location /socket.io/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }

    # SPA (served by Docker web container on port 8080)
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/cte /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### TLS certificate

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
# Auto-renew is configured by certbot — verify:
sudo certbot renew --dry-run
```

### Firewall

```bash
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

## Health Checks

| Endpoint                           | Expected response                                             |
| ---------------------------------- | ------------------------------------------------------------- |
| `GET /api/v1/health`               | `{"status":"ok"}` 200                                         |
| `GET /api/v1/health/readiness`     | `{"status":"ready",...}` 200 when all dependencies healthy    |
| `GET http://localhost:3002/health` | `{"status":"ok","inFlight":0,"queued":0}` 200 (internal only) |

Readiness check verifies PostgreSQL, Redis, and code runner are reachable.

---

## Docker Code Runner Security

The code runner executes untrusted user submissions in isolated Docker containers. Security controls:

### Development (`docker-compose.yml`)

- Direct Docker socket mount: `/var/run/docker.sock`
- `no-new-privileges:true` on the code-runner container
- `read_only: true` filesystem for code-runner
- tmpfs `/tmp` (16 MB, noexec, nosuid)
- Code runner never exposed publicly (bound to `127.0.0.1:3002`)

### Production (`docker-compose.prod.yml` override)

- **Docker socket proxy**: replaces raw socket with `tecnativa/docker-socket-proxy:0.3`
  - Only `POST /containers/*` and `DELETE /containers/*` permitted
  - All other Docker API endpoints denied by default
  - Code runner uses `DOCKER_HOST=tcp://docker-proxy:2375`
- Proxy container has `privileged: true` (required to bind the socket) but the code-runner does not

### Sandbox container controls (in `apps/code-runner/src/sandbox.ts`)

- CPU limit: `--cpus 0.5` (hardcoded)
- Memory limit: per-challenge `memoryLimitMb` passed at request time
- Execution timeout: per-challenge `timeLimitMs`
- No network: `--network none`
- Per-submission container created and deleted immediately after execution
- All output captured and truncated before returning to caller

### What must never happen

- Do not expose port 3002 to the internet
- Do not remove `no-new-privileges` from the code-runner
- Do not use `docker-compose.yml` alone in production (use the prod override)
- Do not set `CODE_RUNNER_TOKEN` to the development default in production

---

## Database Migrations

```bash
# Deploy committed migrations (safe, no data loss) — from host with DATABASE_URL set
pnpm db:migrate:deploy

# From inside the server container (schema is at /app/database/prisma/schema.prisma)
docker compose run --rm server npx prisma migrate deploy \
  --schema /app/database/prisma/schema.prisma

# Check migration status
docker compose run --rm server npx prisma migrate status \
  --schema /app/database/prisma/schema.prisma
```

Migration files are in `database/prisma/migrations/`. Applied migrations are recorded in `_prisma_migrations` table and are never re-run.

**Never run in production:**

```bash
# DESTRUCTIVE — drops and recreates entire database
pnpm db:migrate:reset
```

---

## Logs and Troubleshooting

```bash
# All services
docker compose logs -f

# Specific service, last 100 lines
docker compose logs --tail=100 -f server
docker compose logs --tail=100 -f worker
docker compose logs --tail=100 -f code-runner

# Check running containers
docker compose ps

# Check server readiness
curl http://localhost:3000/api/v1/health/readiness | jq .

# Check code runner
curl http://localhost:3002/health
```

### Common issues

| Symptom                                       | Cause                                   | Fix                                                             |
| --------------------------------------------- | --------------------------------------- | --------------------------------------------------------------- |
| Submissions stay `QUEUED` forever             | Worker not running                      | `docker compose up -d worker`                                   |
| `SECURITY: JWT_SECRET must be set`            | Secret not changed from default in prod | Set unique 32+ char value in `.env`                             |
| Redis connection refused                      | Redis service not healthy               | `docker compose up -d redis`; check `docker compose logs redis` |
| `EPERM rename query_engine*.dll`              | Windows: Node holding DLL lock          | Stop all node processes: `Stop-Process -Name node -Force`       |
| 502 from nginx                                | Server container not started or crashed | `docker compose logs server`; check env vars                    |
| Code execution fails with container not found | Sandbox image not built                 | `docker compose build code-runner-sandbox`                      |

---

## Redeployment and Rollback

### Safe update procedure

```bash
git pull origin main
docker compose -f docker-compose.yml -f docker-compose.prod.yml build
docker compose exec server npx prisma migrate deploy \
  --schema ../../database/prisma/schema.prisma
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --no-deps server worker
```

### Rollback

```bash
git checkout <previous-tag-or-commit>
docker compose -f docker-compose.yml -f docker-compose.prod.yml build server worker
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --no-deps server worker
```

Database migrations cannot be automatically rolled back. Keep a database snapshot before each major migration.

---

## Backup and Restoration

### PostgreSQL backup

```bash
# Snapshot
docker compose exec postgres pg_dump -U cte code_to_escape | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz

# Restore (will overwrite current data)
gunzip -c backup_YYYYMMDD_HHMMSS.sql.gz | docker compose exec -T postgres psql -U cte code_to_escape
```

### Automated daily backup (cron)

```bash
# Add to crontab: crontab -e
0 2 * * * cd /path/to/code-to-escape && docker compose exec postgres pg_dump -U cte code_to_escape | gzip > /backups/cte_$(date +\%Y\%m\%d).sql.gz && find /backups -name "cte_*.sql.gz" -mtime +30 -delete
```

---

## Free-Tier Limitations and Potential Costs

| Resource   | Free option                                                         | Limit                                              | After limit              |
| ---------- | ------------------------------------------------------------------- | -------------------------------------------------- | ------------------------ |
| VM compute | Oracle Cloud Always Free (2 ARM cores, 1 GB RAM each — may run out) | Perpetual if eligible                              | Pay-as-you-go or upgrade |
| VM compute | Hetzner CX22                                                        | €3.92/month, no free tier                          | Billed monthly           |
| VM compute | DigitalOcean Droplet                                                | $4/month, 60-day $200 credit for new accounts      | Billed monthly           |
| PostgreSQL | Neon free tier                                                      | 0.5 GB storage, 1 compute unit, branches           | Paid plan                |
| PostgreSQL | Supabase free                                                       | 500 MB, 2 projects, paused after 1 week inactivity | Paid plan                |
| Redis      | Upstash free                                                        | 10,000 commands/day, 256 MB                        | Paid plan                |
| Redis      | Redis Cloud free                                                    | 30 MB                                              | Paid plan                |
| Vercel     | Hobby (free)                                                        | 100 GB bandwidth/month, 1 concurrent build         | Pro plan $20/month       |
| Domain     | Namecheap/Cloudflare                                                | ~$10/year                                          | Annual renewal           |
| TLS        | Let's Encrypt                                                       | Free, auto-renew every 90 days                     | N/A                      |

**Important**: Free tiers change without notice. Verify current limits at the provider's pricing page before relying on them. This document does not guarantee availability of free resources.

---

## Final Verification Checklist

After deployment, verify each item:

```
[ ] GET /api/v1/health returns {"status":"ok"} 200
[ ] GET /api/v1/health/readiness returns {"status":"ready"} 200
[ ] Game client loads in browser at configured domain
[ ] Admin dashboard loads and login page appears
[ ] User registration works (email+password)
[ ] User login returns JWT and sets refresh cookie
[ ] Challenge list loads
[ ] Code submission returns 202 and eventually transitions to ACCEPTED or WRONG_ANSWER
[ ] Worker logs show submission being processed
[ ] XP and profile update after accepted submission
[ ] Socket.IO connects (check browser network tab for ws:// or wss:// connection)
[ ] Admin login works with SUPER_ADMIN account
[ ] Admin can list users, challenges, and submissions
[ ] HTTPS works and HTTP redirects to HTTPS
[ ] Let's Encrypt certificate is valid
[ ] Docker code-runner returns 200 on /health (internal)
[ ] Sandbox image is present: docker images | grep sandbox
[ ] All containers show healthy/running: docker compose ps
```
