# Security Model

This document describes the threat model, existing controls, and known residual risks for
Code to Escape. It is intended for operators deploying the system and for security reviewers.

---

## Threat model

| Actor                 | Goal                           | Trust level                   |
| --------------------- | ------------------------------ | ----------------------------- |
| Anonymous visitor     | Read public pages              | Untrusted                     |
| Registered player     | Submit code, play levels, duel | Low trust                     |
| Admin / super-admin   | Manage challenges, users       | Elevated trust; separate role |
| Code-runner container | Execute untrusted user code    | Zero-trust sandbox            |
| Docker host           | Runs all containers            | Trusted infrastructure        |

---

## Existing controls

### Authentication

- All private API routes require a short-lived JWT access token (default: 15 min expiry).
- Refresh tokens are stored as bcrypt hashes in the database; a stolen plaintext token cannot
  be replayed after it is rotated.
- Password resets use a single-use HMAC token stored in the database and expire after 1 hour.
- `JWT_SECRET` and `REFRESH_TOKEN_SECRET` are validated by `getSecret()` in `env.ts`:
  - Throw at startup in production if still set to the default placeholder.
  - Throw at startup if shorter than 32 characters.
- OAuth providers (Google, GitHub, Firebase) are optional and gated by non-empty env vars.

### Authorisation

- Role-based: `PLAYER`, `ADMIN`, `SUPER_ADMIN`.
- Admin routes are protected by `requireAdmin` middleware; SUPER_ADMIN-only routes by a
  separate guard.
- Duel submissions are validated against `duel.participantIds` so a non-participant cannot
  submit to another player's duel.

### Rate limiting

- Per-IP limits on auth (`/register`, `/login`, `/forgot-password`), submission, AI hints,
  and general API endpoints via `RedisRateLimitStore`.
- Falls back to per-process counters if Redis is unavailable (resilience over denial-of-service).
- `TRUST_PROXY_HOPS=1` ensures the real client IP is keyed from `X-Forwarded-For[0]` behind
  the nginx reverse proxy, not the proxy's IP.

### Sandbox isolation (code execution)

Every user submission runs in an ephemeral Docker container with the following flags enforced
by `apps/code-runner/src/sandbox.ts`:

| Flag                                                     | Effect                                                                  |
| -------------------------------------------------------- | ----------------------------------------------------------------------- |
| `--network none`                                         | No network access from inside the sandbox                               |
| `--read-only`                                            | Root filesystem is immutable                                            |
| `--cap-drop ALL`                                         | All Linux capabilities dropped                                          |
| `--security-opt no-new-privileges`                       | `setuid` / `setgid` binaries cannot escalate                            |
| `--pids-limit 64`                                        | Fork bombs are bounded                                                  |
| `--memory` / `--memory-swap`                             | Set to per-challenge `memoryLimitMb`; swap equals RAM so no swap escape |
| `--cpus 0.5`                                             | Bounded CPU allocation                                                  |
| `--user 65534:65534`                                     | Runs as `nobody:nogroup`                                                |
| `--tmpfs /work:rw,exec,mode=1777,size=64m`               | Writable, executable scratch dir (needed for compiled binaries)         |
| `--tmpfs /tmp:rw,noexec,nosuid,nodev,mode=1777,size=16m` | Temp dir, not executable                                                |
| `--rm`                                                   | Container is deleted after execution                                    |

The container is also given a watchdog timer in `sandbox.ts`; if the `docker run` process does
not exit within `containerWatchdogMs(timeLimitMs)` the outer process kills it and a
`TIME_LIMIT_EXCEEDED` status is returned.

### Code-runner service

- Bound to `127.0.0.1:3002` (localhost only in docker-compose).
- All `/execute` requests require `Authorization: Bearer <CODE_RUNNER_TOKEN>` validated with
  `timingSafeEqual` to prevent timing attacks.
- Body is capped at 256 KB; request timeout is 30 s.
- Concurrency is bounded by a semaphore (default: 4 parallel containers, max queue 16).
- `CODE_RUNNER_TOKEN` is validated by `getSecret()` in server's `env.ts` and will throw in
  production if still set to the default value.

### Network

- PostgreSQL: bound to `127.0.0.1:5432` — not reachable outside the host.
- Redis: bound to `127.0.0.1:6379` — not reachable outside the host.
- Code-runner: bound to `127.0.0.1:3002` — not reachable outside the host.
- nginx: listens on `0.0.0.0:8080` — the only intended public port.

---

## Known residual risks

### RISK-01 · Docker socket mounted directly (HIGH)

**Description**: The `code-runner` service mounts `/var/run/docker.sock` directly:

```yaml
volumes:
  - /var/run/docker.sock:/var/run/docker.sock
```

The Docker socket grants full Docker daemon access — a compromised `code-runner` process
could spawn privileged containers, read host filesystems, or escape the host.

**Recommended mitigation**: Replace the direct mount with a
[Tecnativa docker-socket-proxy](https://github.com/Tecnativa/docker-socket-proxy) that
exposes only the `POST /containers/*` and `DELETE /containers/*` endpoints needed to spawn
and kill sandbox containers. A reference override is provided in `docker-compose.prod.yml`.

**Current status**: Accepted for development. Must be addressed before public deployment.

---

### RISK-02 · `/health` endpoint on code-runner is unauthenticated (LOW)

**Description**: `GET /health` on the code-runner returns the current in-flight and queued
counts without requiring a token. This leaks load information.

**Impact**: Low — the endpoint is only reachable on `127.0.0.1:3002`, which is not publicly
exposed. An attacker would need host-level access first.

**Recommended mitigation**: Add token auth to `/health` if the service is ever exposed beyond
localhost. No action required in the current topology.

---

### RISK-03 · No seccomp profile on sandbox containers (MEDIUM)

**Description**: The sandbox Docker run command does not pass `--security-opt seccomp=...`.
Without a custom seccomp profile the default Docker seccomp policy is applied, which still
allows ~300 syscalls.

**Recommended mitigation**: Author a minimal seccomp allowlist and pass it via
`--security-opt seccomp=/path/to/profile.json`. This further reduces the kernel attack surface.

**Current status**: The default Docker seccomp policy provides reasonable protection.
A custom profile is a hardening improvement, not a required fix.

---

### RISK-04 · sandbox.Dockerfile runs compiler toolchain as root during build (INFO)

**Description**: `apt-get install` and `npm install -g` in the sandbox Dockerfile run as root.
The installed binaries (python3, javac, g++, go, rustc, tsc) are then executed at runtime by
a `nobody` (65534) user, so the runtime surface is correctly restricted.

**Impact**: None at runtime. The build-time root is standard practice for Dockerfiles.

---

## Secrets checklist for production deployment

Before any public deployment, verify:

- [ ] `JWT_SECRET` — unique, ≥ 32 chars, not the default placeholder
- [ ] `REFRESH_TOKEN_SECRET` — unique, ≥ 32 chars, not the default placeholder
- [ ] `CODE_RUNNER_TOKEN` — unique, ≥ 32 chars, not the default placeholder
- [ ] `POSTGRES_PASSWORD` — changed from `cte_dev_password`
- [ ] `GROQ_API_KEY` — set if AI hints are required
- [ ] HTTPS termination configured upstream of nginx
- [ ] Docker socket proxy deployed (see `docker-compose.prod.yml`)

---

## docker-compose.prod.yml — socket proxy override

A `docker-compose.prod.yml` file is provided in the repository root. It overrides the
`code-runner` volume to use a Tecnativa docker-socket-proxy instead of the raw socket.

Usage:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

The proxy allows only the Docker API calls the code-runner needs:

- `POST /containers/create`
- `POST /containers/{id}/start`
- `POST /containers/{id}/kill`
- `DELETE /containers/{id}`
