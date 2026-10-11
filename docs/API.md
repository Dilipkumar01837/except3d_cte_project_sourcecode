# API Reference

All endpoints are prefixed `/api/v1`. Authentication uses `Authorization: Bearer <access_token>` (JWT, 15 min expiry) unless marked **public**.

---

## Health

### `GET /api/v1/health`

**Public.** Returns service status.

```json
{ "status": "ok" }
```

---

## Auth — `/api/v1/auth`

| Method  | Path               | Auth   | Description                                           |
| ------- | ------------------ | ------ | ----------------------------------------------------- |
| `POST`  | `/register`        | public | Create account. Body: `{ username, email, password }` |
| `POST`  | `/login`           | public | Returns `{ accessToken, refreshToken }`               |
| `POST`  | `/refresh`         | public | Rotate refresh token. Body: `{ refreshToken }`        |
| `POST`  | `/logout`          | public | Invalidate refresh token                              |
| `GET`   | `/me`              | ✅     | Current user profile                                  |
| `PATCH` | `/profile`         | ✅     | Update display name / avatar                          |
| `POST`  | `/forgot-password` | public | Send reset email (always 200)                         |
| `POST`  | `/reset-password`  | public | Body: `{ token, password }`                           |

---

## Player — `/api/v1/player`

| Method | Path                         | Auth | Description                                    |
| ------ | ---------------------------- | ---- | ---------------------------------------------- |
| `GET`  | `/dashboard`                 | ✅   | Dashboard summary (XP, level, recent activity) |
| `GET`  | `/leaderboard`               | ✅   | Global XP leaderboard                          |
| `GET`  | `/worlds`                    | ✅   | List published game worlds                     |
| `GET`  | `/worlds/:worldId/levels`    | ✅   | Levels for a world (with player progress)      |
| `GET`  | `/achievements`              | ✅   | All achievements + which the player has earned |
| `GET`  | `/notifications`             | ✅   | Unread notifications                           |
| `POST` | `/levels/:levelId/discovery` | ✅   | Mark level discovered                          |

### Daily Reward — `/api/v1/player/daily-reward`

| Method | Path     | Auth | Description                       |
| ------ | -------- | ---- | --------------------------------- |
| `GET`  | `/`      | ✅   | Current daily reward status       |
| `POST` | `/claim` | ✅   | Claim today's reward (idempotent) |

---

## Challenges — `/api/v1/challenges`

| Method | Path                            | Auth | Description                                         |
| ------ | ------------------------------- | ---- | --------------------------------------------------- |
| `GET`  | `/`                             | ✅   | List published challenges                           |
| `GET`  | `/:slug`                        | ✅   | Challenge detail (statement, starter code, hints)   |
| `POST` | `/:slug/runs`                   | ✅   | Run code against visible test cases (not persisted) |
| `POST` | `/:slug/submissions`            | ✅   | Submit code for full judging (async, returns 202)   |
| `GET`  | `/:slug/submissions`            | ✅   | Player's submission history for this challenge      |
| `GET`  | `/:slug/submissions/:id`        | ✅   | Own submission detail                               |
| `GET`  | `/:slug/submissions/:id/status` | ✅   | Lightweight status poll                             |

### Hints — `/api/v1/hints`

| Method | Path                                 | Auth | Description                              |
| ------ | ------------------------------------ | ---- | ---------------------------------------- |
| `GET`  | `/:slug/hints/:level`                | ✅   | Reveal a numbered hint (costs XP)        |
| `POST` | `/:slug/hints/:level/feedback`       | ✅   | Submit helpful/not-helpful vote          |
| `POST` | `/:slug/hints/ai`                    | ✅   | Request AI-generated hint (rate-limited) |
| `POST` | `/:slug/hints/ai/:aiHintId/feedback` | ✅   | Vote on AI hint                          |

---

## Duels — `/api/v1/duels`

| Method | Path                   | Auth             | Description                            |
| ------ | ---------------------- | ---------------- | -------------------------------------- |
| `GET`  | `/`                    | ✅               | List open duels joinable by the player |
| `POST` | `/`                    | ✅               | Create a new duel lobby                |
| `GET`  | `/:duelId`             | ✅ (participant) | Duel state                             |
| `POST` | `/:duelId/join`        | ✅               | Join an open lobby                     |
| `POST` | `/:duelId/submissions` | ✅ (participant) | Submit code in a live duel             |

---

## Social — `/api/v1/social`

| Method   | Path               | Auth | Description         |
| -------- | ------------------ | ---- | ------------------- |
| `GET`    | `/friends`         | ✅   | Friend list         |
| `POST`   | `/friends/request` | ✅   | Send friend request |
| `POST`   | `/friends/accept`  | ✅   | Accept a request    |
| `DELETE` | `/friends/:userId` | ✅   | Remove friend       |
| `POST`   | `/block/:userId`   | ✅   | Block user          |

---

## Notifications — `/api/v1/notifications`

| Method  | Path        | Auth | Description        |
| ------- | ----------- | ---- | ------------------ |
| `GET`   | `/`         | ✅   | List notifications |
| `PATCH` | `/:id/read` | ✅   | Mark as read       |

---

## Learning — `/api/v1/learning`

| Method | Path               | Auth | Description                                     |
| ------ | ------------------ | ---- | ----------------------------------------------- |
| `GET`  | `/profile`         | ✅   | Player learning profile (strengths, weaknesses) |
| `GET`  | `/recommendations` | ✅   | AI-recommended next challenges                  |

---

## Scenes — `/api/v1/player/scenes`

| Method | Path              | Auth | Description                           |
| ------ | ----------------- | ---- | ------------------------------------- |
| `GET`  | `/:levelId/scene` | ✅   | Load saved 3D scene state for a level |
| `PUT`  | `/:levelId/scene` | ✅   | Save 3D scene state                   |

---

## Telemetry — `/api/v1/telemetry`

| Method  | Path       | Auth | Description                                   |
| ------- | ---------- | ---- | --------------------------------------------- |
| `GET`   | `/consent` | ✅   | Current consent status                        |
| `PATCH` | `/consent` | ✅   | Update consent (opt in / opt out)             |
| `POST`  | `/events`  | ✅   | Batch-send telemetry events (max 50 per call) |

---

## Admin — `/api/v1/admin`

All admin routes require role `ADMIN` or `SUPER_ADMIN`.

### Challenges

| Method   | Path                               | Description                    |
| -------- | ---------------------------------- | ------------------------------ |
| `GET`    | `/challenges`                      | List all challenges            |
| `POST`   | `/challenges`                      | Create challenge               |
| `PATCH`  | `/challenges/:id`                  | Update challenge               |
| `POST`   | `/challenges/:id/publish`          | Publish / unpublish            |
| `POST`   | `/challenges/:id/test-cases`       | Add test case                  |
| `PATCH`  | `/challenges/:id/test-cases/:tcId` | Update test case               |
| `DELETE` | `/challenges/:id/test-cases/:tcId` | Delete test case               |
| `POST`   | `/challenges/:id/hints`            | Add hint                       |
| `DELETE` | `/challenges/:id/hints/:hintId`    | Delete hint                    |
| `GET`    | `/challenges/:id`                  | Get challenge with full detail |

### Worlds

| Method  | Path          | Description     |
| ------- | ------------- | --------------- |
| `GET`   | `/worlds`     | List all worlds |
| `POST`  | `/worlds`     | Create world    |
| `PATCH` | `/worlds/:id` | Update world    |

### Users

| Method  | Path                 | Description            |
| ------- | -------------------- | ---------------------- |
| `GET`   | `/users`             | List users (paginated) |
| `PATCH` | `/users/:id/role`    | Change user role       |
| `POST`  | `/users/:id/suspend` | Suspend account        |

### Telemetry

| Method | Path                 | Description                                    |
| ------ | -------------------- | ---------------------------------------------- |
| `GET`  | `/telemetry/summary` | Aggregate telemetry summary (SUPER_ADMIN only) |

---

## WebSocket events

The server uses Socket.IO at `/socket.io`. Authenticate by passing `{ auth: { token } }` on connect.

| Event (server → client) | Payload                             | Description                      |
| ----------------------- | ----------------------------------- | -------------------------------- |
| `submission:completed`  | `{ submissionId, status, score }`   | Judging result                   |
| `duel:progress`         | `{ duelId, userId, score }`         | Opponent made progress in a duel |
| `duel:completed`        | `{ duelId, winnerId }`              | Duel resolved                    |
| `notification:new`      | `{ notificationId, type, message }` | New notification                 |

---

## Response conventions

- **200** — success with body
- **201** — resource created
- **202** — accepted (async work queued, e.g. submission)
- **400** — validation error, body `{ error: string, issues?: ZodIssue[] }`
- **401** — missing / expired token
- **403** — authenticated but not authorised (role too low)
- **404** — resource not found
- **409** — conflict (e.g. duplicate email)
- **422** — semantic validation failure
- **429** — rate limit exceeded, header `Retry-After: <seconds>`
- **503** — code-runner at capacity, header `Retry-After: 2`
