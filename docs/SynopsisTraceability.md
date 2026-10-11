# Synopsis Traceability

Maps every claim in the project synopsis to the specific source file, route, or test that
provides evidence for it. Each claim is rated **Implemented**, **Partial**, or **Not built**.

> **Hard rule**: A claim is only marked Implemented if the evidence can be found by reading
> the cited file in this repository. No inference, no extrapolation.

---

## Core claims

### 1. "A web-based escape-room game built in React"

**Status: Implemented**

| Evidence          | Location                                                                |
| ----------------- | ----------------------------------------------------------------------- |
| React SPA entry   | `apps/game-client/src/main.tsx`                                         |
| All client routes | `apps/game-client/src/app/router/AppRouter.tsx`                         |
| 2D room renderer  | `apps/game-client/src/features/escape-room/components/EscapeRoom2D.tsx` |
| 3D room renderer  | `apps/game-client/src/features/escape-room/components/EscapeRoom3D.tsx` |

---

### 2. "Players solve coding challenges to progress through rooms"

**Status: Implemented**

| Evidence                  | Location                                                                         |
| ------------------------- | -------------------------------------------------------------------------------- |
| Submission API            | `apps/server/src/modules/challenges/challenge.routes.ts`                         |
| Worker judges submissions | `apps/server/src/modules/challenges/execution.worker.ts`                         |
| Room gating logic         | `apps/server/src/modules/challenges/challenge.service.ts`                        |
| Room lock enforcement     | `apps/server/src/modules/player/player.routes.ts` — `POST /levels/:id/discovery` |
| Integration test          | `apps/server/src/tests/escape-room-flow.test.ts`                                 |

---

### 3. "Code is executed in an isolated Docker sandbox"

**Status: Implemented**

| Evidence           | Location                                                            |
| ------------------ | ------------------------------------------------------------------- |
| Sandbox spawn      | `apps/code-runner/src/sandbox.ts` — `executeInSandbox()`            |
| Security flags     | `sandbox.ts` lines 41–69 (`--cap-drop ALL`, `--network none`, etc.) |
| Python executor    | `docker/code-runner/execute.py`                                     |
| Sandbox Dockerfile | `docker/code-runner/sandbox.Dockerfile`                             |

---

### 4. "Supports 7 programming languages: Python, Java, JavaScript, TypeScript, C++, Go, Rust"

**Status: Implemented**

| Evidence                     | Location                                                                  |
| ---------------------------- | ------------------------------------------------------------------------- |
| Language definitions         | `docker/code-runner/execute.py` — `definitions` dict (7 entries)          |
| Beginner challenges in all 7 | `apps/server/scripts/seed-beginner-challenges.ts` — 7 × 6 = 42 challenges |
| Supported languages enum     | `database/prisma/schema.prisma` — `ProgrammingLanguage` enum              |

---

### 5. "Multiple worlds, each with 3 levels"

**Status: Implemented**

| Evidence                                                                                      | Location                                                       |
| --------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Seed: 6 worlds × 3 levels                                                                     | `apps/server/scripts/seed-worlds.ts`                           |
| Worlds: python-forest, java-lake, javascript-jungle, typescript-tundra, rust-realm, go-galaxy | `seed-worlds.ts` — `worlds` array                              |
| Room configs for 5 worlds                                                                     | `apps/game-client/src/features/escape-room/lib/room-config.ts` |

---

### 6. "Key-and-lock progression mechanic"

**Status: Implemented**

| Evidence                      | Location                                                                    |
| ----------------------------- | --------------------------------------------------------------------------- |
| RoomKey / RoomLock models     | `database/prisma/schema.prisma`                                             |
| Key awarded on level complete | `apps/server/src/modules/challenges/challenge.service.ts`                   |
| Lock check before access      | `escape-room-flow.test.ts` — "rejects a direct submission to a locked room" |

---

### 7. "Real-time duel system"

**Status: Implemented**

| Evidence                                    | Location                                                                                         |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Duel API routes                             | `apps/server/src/modules/duels/duel.routes.ts`                                                   |
| Duel service                                | `apps/server/src/modules/duels/duel.service.ts`                                                  |
| Score-based resolution (not first-accepted) | `apps/server/src/tests/duel-resolve.test.ts`                                                     |
| Socket.IO broadcast                         | `apps/server/src/modules/challenges/execution.worker.ts` — `redis.publish('duel:progress', ...)` |

---

### 8. "AI-powered contextual hints using a large language model"

**Status: Implemented (requires GROQ_API_KEY)**

| Evidence            | Location                                                                                                        |
| ------------------- | --------------------------------------------------------------------------------------------------------------- |
| AI hint route       | `apps/server/src/modules/hints/hints.routes.ts`                                                                 |
| Groq client call    | `apps/server/src/modules/hints/hints.service.ts`                                                                |
| Model config        | `apps/server/src/config/env.ts` — `groqModel` (default: `llama-3.3-70b-versatile`)                              |
| Rate limit (20/24h) | `env.ts` — `aiHintDailyLimit`                                                                                   |
| Test                | `apps/server/src/tests/challenge-system.test.ts` — "rejects AI hint generation once the allowance is exhausted" |

---

### 9. "Leaderboard and XP progression"

**Status: Implemented**

| Evidence                 | Location                                                               |
| ------------------------ | ---------------------------------------------------------------------- |
| XP awarded on acceptance | `execution.worker.ts`                                                  |
| Leaderboard route        | `apps/server/src/modules/player/player.routes.ts` — `GET /leaderboard` |
| Profile + XP model       | `database/prisma/schema.prisma` — `Profile.xp`                         |

---

### 10. "Admin dashboard to manage challenges and worlds"

**Status: Implemented**

| Evidence   | Location                                                        |
| ---------- | --------------------------------------------------------------- |
| Admin SPA  | `apps/admin-dashboard/`                                         |
| Admin API  | `apps/server/src/modules/admin/`                                |
| Role guard | `apps/server/src/modules/auth/middleware/require-admin.ts`      |
| Admin test | `apps/server/src/tests/challenge-system.test.ts` — "admin CRUD" |

---

### 11. "Consent-gated engagement telemetry"

**Status: Implemented**

| Evidence         | Location                                                |
| ---------------- | ------------------------------------------------------- |
| Telemetry routes | `apps/server/src/modules/telemetry/telemetry.routes.ts` |
| Consent check    | telemetry service — events dropped if `optedIn = false` |
| Tests            | `apps/server/src/tests/telemetry.test.ts` — 11 tests    |

---

### 12. "Redis-backed execution queue with resilience"

**Status: Implemented**

| Evidence                  | Location                                                               |
| ------------------------- | ---------------------------------------------------------------------- |
| Queue                     | `apps/server/src/modules/challenges/execution.queue.ts`                |
| `isRedisReady` guard      | `apps/server/src/shared/lib/redis.ts`                                  |
| Fallback on queue failure | `apps/server/src/modules/duels/duel.service.ts` — marks INTERNAL_ERROR |
| Tests                     | `apps/server/src/tests/execution-queue.test.ts`, `redis.test.ts`       |

---

## Claims NOT in the codebase

The following items are sometimes mentioned in AI-generated project descriptions for this type
of system but are **not present** in this repository:

| Claim                            | Status            | Notes                                           |
| -------------------------------- | ----------------- | ----------------------------------------------- |
| Mobile app (React Native / Expo) | **Not built**     | Web only                                        |
| User study / evaluation data     | **Not collected** | Study protocol exists in docs but no data files |
| A/B experiment results           | **Not available** | `Experiment` model exists; no populated results |
| Performance benchmark numbers    | **Not measured**  | No benchmark scripts in the repo                |
| Accessibility audit score (WCAG) | **Not measured**  | PerformanceAccessibilityAudit.md is a template  |
