# API Reference

## Base URL

```
http://localhost:3000/api/v1
```

All responses follow this envelope:

```json
{ "success": true, "data": { ... }, "meta": { "timestamp": "2026-..." } }
```

Errors:

```json
{
  "success": false,
  "error": { "code": "VALIDATION_ERROR", "message": "..." },
  "meta": { "timestamp": "..." }
}
```

---

## Authentication

> All protected routes require `Authorization: Bearer <access_token>`.

| Method | Endpoint                | Auth | Purpose                                  |
| ------ | ----------------------- | ---- | ---------------------------------------- |
| POST   | `/auth/register`        | —    | Create account + profile, returns tokens |
| POST   | `/auth/login`           | —    | Email/password login, returns tokens     |
| POST   | `/auth/refresh`         | —    | Rotate refresh token                     |
| POST   | `/auth/logout`          | —    | Revoke refresh token family              |
| POST   | `/auth/forgot-password` | —    | Send reset link                          |
| POST   | `/auth/reset-password`  | —    | Apply new password with valid token      |
| GET    | `/auth/google`          | —    | Initiate Google OAuth flow               |
| GET    | `/auth/google/callback` | —    | Google OAuth callback                    |
| GET    | `/auth/github`          | —    | Initiate GitHub OAuth flow               |
| GET    | `/auth/github/callback` | —    | GitHub OAuth callback                    |

---

## Health

| Method | Endpoint            | Auth | Purpose                                                 |
| ------ | ------------------- | ---- | ------------------------------------------------------- |
| GET    | `/health`           | —    | Liveness check — `{ "status": "ok" }`                   |
| GET    | `/health/readiness` | —    | Readiness — checks DB + Redis + code runner; 200 or 503 |

---

## Player

> All routes require authentication.

| Method | Endpoint                         | Purpose                                             |
| ------ | -------------------------------- | --------------------------------------------------- |
| GET    | `/player/dashboard`              | Profile summary, recent activity                    |
| GET    | `/player/worlds`                 | Published worlds with progress                      |
| GET    | `/player/worlds/:worldId/levels` | World levels with per-level progress                |
| GET    | `/player/achievements`           | Published achievements with unlock state            |
| GET    | `/player/inventory`              | Player inventory                                    |
| GET    | `/player/notifications`          | Latest 50 notifications                             |
| PATCH  | `/player/notifications/:id/read` | Mark notification as read                           |
| GET    | `/player/leaderboard`            | Global/weekly leaderboard (`?type=weekly&limit=50`) |

---

## Challenges

> All routes require authentication. Hidden test inputs/outputs are never sent to clients.

| Method | Endpoint                                   | Purpose                                              |
| ------ | ------------------------------------------ | ---------------------------------------------------- |
| GET    | `/challenges`                              | List published challenges (pagination, filters)      |
| GET    | `/challenges/:slug`                        | Challenge details + visible examples + hint metadata |
| GET    | `/challenges/:slug/hints/:level`           | Reveal a paid hint (costs XP penalty)                |
| POST   | `/challenges/:slug/submissions`            | Queue code for isolated execution (10 req/min)       |
| GET    | `/challenges/:slug/submissions`            | Caller's submission history                          |
| GET    | `/challenges/:slug/submissions/:id/status` | Poll status without leaking code/logs                |
| GET    | `/challenges/:slug/submissions/:id`        | Full result (no hidden test I/O)                     |

**POST body:** `{ "language": "PYTHON", "sourceCode": "..." }`  
Supported languages: `JAVA`, `PYTHON`, `JAVASCRIPT`, `TYPESCRIPT`, `CPP`, `GO`, `RUST`

---

## Daily Reward

> Requires authentication.

| Method | Endpoint                      | Purpose                                       |
| ------ | ----------------------------- | --------------------------------------------- |
| GET    | `/player/daily-reward/status` | Current streak, claim status, next reward     |
| POST   | `/player/daily-reward/claim`  | Claim today's reward (409 if already claimed) |

---

## Telemetry

> Consent-gated and **off by default**. Events are only stored once the player opts in. The event vocabulary is a fixed allow-list shared by the client and server; no IP address or user agent is stored, and the signals are engagement-only (never presented as evidence of learning).

| Method | Endpoint             | Purpose                                                                    |
| ------ | -------------------- | -------------------------------------------------------------------------- |
| GET    | `/telemetry/consent` | Current opt-in state with consent timestamp and policy version             |
| PATCH  | `/telemetry/consent` | Set opt-in (`{ "optIn": true }`) with an audit timestamp                   |
| POST   | `/telemetry/events`  | Submit a batch (`{ sessionId, events: [{ name, payload? }] }`); always 202 |

Allowed event names: `session_start`, `world_enter`, `level_start`, `level_complete`, `challenge_open`, `hint_reveal`, `duel_join`, `daily_reward_claim`.

---

## Admin

> Requires `ADMIN` or `SUPER_ADMIN` role.

### Overview & System

| Method | Endpoint                   | Purpose                                              |
| ------ | -------------------------- | ---------------------------------------------------- |
| GET    | `/admin/overview`          | Aggregate platform stats                             |
| GET    | `/admin/system`            | Live service health + queue depth + uptime           |
| GET    | `/admin/audit`             | Paginated admin action audit log                     |
| GET    | `/admin/telemetry/summary` | Aggregate engagement counts (no per-user drill-down) |

### User Management

| Method | Endpoint                      | Purpose                                             |
| ------ | ----------------------------- | --------------------------------------------------- |
| GET    | `/admin/users`                | Paginated user list (`?search=&role=&page=&limit=`) |
| GET    | `/admin/users/:id`            | User detail + recent sessions/login history         |
| PATCH  | `/admin/users/:id/role`       | Change role — logged to audit                       |
| POST   | `/admin/users/:id/suspend`    | Suspend + revoke tokens — logged to audit           |
| POST   | `/admin/users/:id/reactivate` | Reactivate — logged to audit                        |

### Challenge Management

| Method | Endpoint                                 | Purpose                                    |
| ------ | ---------------------------------------- | ------------------------------------------ |
| GET    | `/admin/challenges`                      | Paginated challenge list                   |
| POST   | `/admin/challenges`                      | Create challenge                           |
| GET    | `/admin/challenges/:id`                  | Challenge detail + test cases + hints      |
| PATCH  | `/admin/challenges/:id`                  | Update challenge                           |
| DELETE | `/admin/challenges/:id`                  | Delete (soft-archive if submissions exist) |
| POST   | `/admin/challenges/:id/publish`          | Publish — logged to audit                  |
| POST   | `/admin/challenges/:id/unpublish`        | Unpublish — logged to audit                |
| POST   | `/admin/challenges/:id/test-cases`       | Add test case                              |
| PATCH  | `/admin/challenges/:id/test-cases/:tcId` | Update test case                           |
| DELETE | `/admin/challenges/:id/test-cases/:tcId` | Delete test case                           |
| POST   | `/admin/challenges/:id/hints`            | Add hint                                   |
| PATCH  | `/admin/challenges/:id/hints/:hintId`    | Update hint                                |
| DELETE | `/admin/challenges/:id/hints/:hintId`    | Delete hint                                |

### Worlds & Levels

| Method | Endpoint                            | Purpose                                    |
| ------ | ----------------------------------- | ------------------------------------------ |
| GET    | `/admin/worlds`                     | All worlds with levels                     |
| POST   | `/admin/worlds`                     | Create world                               |
| PATCH  | `/admin/worlds/:id`                 | Update world                               |
| DELETE | `/admin/worlds/:id`                 | Delete (blocked if player progress exists) |
| POST   | `/admin/worlds/:id/levels`          | Create level                               |
| PATCH  | `/admin/worlds/:id/levels/:levelId` | Update level                               |
| DELETE | `/admin/worlds/:id/levels/:levelId` | Delete level                               |

### Achievements

| Method | Endpoint                            | Purpose                     |
| ------ | ----------------------------------- | --------------------------- |
| GET    | `/admin/achievements`               | All achievements            |
| POST   | `/admin/achievements`               | Create achievement          |
| PATCH  | `/admin/achievements/:id`           | Update achievement          |
| POST   | `/admin/achievements/:id/publish`   | Publish — logged to audit   |
| POST   | `/admin/achievements/:id/unpublish` | Unpublish — logged to audit |

---

## Real-Time (Socket.IO)

Connect to `ws://localhost:3000` with `{ auth: { token: "<access_token>" } }`.

| Event (server→client)  | Payload                                                  | When                       |
| ---------------------- | -------------------------------------------------------- | -------------------------- |
| `submission:completed` | `{ submissionId, status, score, xpEarned, coinsEarned }` | Worker finishes execution  |
| `achievement:unlocked` | `{ achievementId, name, xpReward }`                      | Achievement engine unlocks |

---

## Rate Limits

| Scope          | Limit                   |
| -------------- | ----------------------- |
| General API    | 200 req / 15 min per IP |
| Auth endpoints | 20 req / 15 min per IP  |
| Submissions    | 10 req / 1 min per user |
