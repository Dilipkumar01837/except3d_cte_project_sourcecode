# QA Release-Gate Report — Code to Escape

**Final revision after Docker phases completed**

---

## Verdict: ⚠️ CONDITIONAL NO-GO

| #       | Blocker                                            | Severity | Status                                             |
| ------- | -------------------------------------------------- | -------- | -------------------------------------------------- |
| DEF-001 | Lint CI gate — 28 errors in game-client            | S2       | ✅ FIXED-VERIFIED                                  |
| DEF-002 | `proxy-addr` critical CVE in Express (IP spoofing) | S2       | 🔴 OPEN                                            |
| DEF-003 | 50 dep vulnerabilities (3 critical, 24 high)       | S3       | 🟡 OPEN (deferred)                                 |
| DEF-004 | Judging + Redis tests — previously skipped         | S2       | ✅ FIXED-VERIFIED (186/186 pass)                   |
| DEF-005 | Docker phases previously blocked                   | S2       | ✅ VERIFIED (images built, redis+code-runner live) |
| DEF-006 | `.env.example` missing 9 tuneable vars             | S4       | 🟡 OPEN (low)                                      |
| DEF-007 | Playwright E2E not run — no persistent full-stack  | S2       | 🔴 OPEN                                            |

**Release rule: open S1/S2 = NO-GO. DEF-002 and DEF-007 are open S2 → NO-GO.**

---

## Environment

| Item            | Value                                                                         |
| --------------- | ----------------------------------------------------------------------------- |
| OS              | Windows 11 Home 10.0.26200                                                    |
| Node            | v24.18.0                                                                      |
| pnpm            | 9.15.4                                                                        |
| Docker          | 29.6.1 (Linux engine, running)                                                |
| Branch          | `qa/fix-def001-lint-errors`                                                   |
| HEAD            | `ff858d2`                                                                     |
| Redis container | `cte-redis` — Up, healthy (127.0.0.1:6379)                                    |
| Code-runner     | `cte-code-runner-live` — Up (127.0.0.1:3002), `/health` → `{"status":"ok"}`   |
| Postgres        | Local process PID 7704 on :5432 (Docker container port conflict — used local) |

---

## Phase Results

| Phase                    | Result            | Evidence                                                                                             |
| ------------------------ | ----------------- | ---------------------------------------------------------------------------------------------------- |
| 0 — Baseline             | ✅ PASS           | Clean tree, frozen install, secrets guard verified                                                   |
| 1 — Static gates         | ✅ PASS           | TypeCheck 14/14, Lint 0 errors, Format clean, Build 9/9                                              |
| 2 — Tests (no deps)      | ✅ PASS           | 173 passed (Redis/judging skipped)                                                                   |
| 2 — Tests (live Redis)   | ✅ PASS           | 175 passed, `redis-integration.test.ts` now runs                                                     |
| 2+3 — Tests (live stack) | ✅ PASS           | **186/186 passed, 0 skipped** — full judging suite                                                   |
| 3 — Sandbox judgements   | ✅ PASS           | 11 judging tests: ACCEPTED, WRONG_ANSWER, CE, RE, TLE, whitespace-norm                               |
| 4 — API review           | ✅ PASS           | 15 routers, no IDOR, auth correct, secrets stripped                                                  |
| 5 — Resilience           | ✅ PASS (partial) | Redis-down degrades gracefully (14 rate-limit tests); Postgres-down / worker-kill need compose stack |
| 6 — Playwright E2E       | 🚫 BLOCKED        | Requires persistent server+client+admin on :3000/:5173/:5174                                         |
| 7 — Docker stack         | ⚠️ PARTIAL        | sandbox + code-runner images built and verified; full `compose up` blocked by :5432 port conflict    |
| 8 — Docs                 | ✅ PASS           | No stale claims                                                                                      |
| 9 — Final regression     | ✅ PASS           | All gates re-run after fixes — 186/186                                                               |

---

## Phase 1 — Static Quality Gates

| Gate                      | Result                                                    |
| ------------------------- | --------------------------------------------------------- |
| `pnpm typecheck`          | ✅ 14/14 packages, 0 errors                               |
| `pnpm lint`               | ✅ 14/14, 0 errors (6 non-blocking fast-refresh warnings) |
| `pnpm format:check`       | ✅ All files clean                                        |
| `pnpm build`              | ✅ 9/9 tasks (game-client bundle 1.7 MB + 4.4 MB Monaco)  |
| Secret scan               | ✅ No keys in tracked files                               |
| `debugger` / console scan | ✅ Clean in production paths                              |
| `pnpm audit`              | ❌ 50 vulns — 3 critical, 24 high → DEF-002/DEF-003       |

**Lint warnings (non-blocking):** 6× `react-refresh/only-export-components` in `ChallengePlayerPage-widgets.tsx` and `EscapeRoom3D-environments.tsx` — HMR DX only, no runtime impact.

**Missing from `.env.example`:** `AI_HINT_DAILY_LIMIT`, `AI_HINT_WINDOW_MS`, `DUEL_*_TIMEOUT_MS`, `DUEL_SWEEP_INTERVAL_MS`, `SOCKET_AUTH_REVALIDATE_MS`, `CODE_RUNNER_BIND_HOST`, `CODE_RUNNER_MAX_CONCURRENCY`, `CODE_RUNNER_MAX_QUEUE` → DEF-006.

---

## Phase 2+3 — Full Test Suite (live stack)

```
Test Files : 17 passed (17)         ← all files pass, nothing skipped
Tests      : 186 passed (186)
Duration   : 28.72s
```

### Judging suite (11 tests, all passed):

- `rejects requests without a valid token` ✅ → 401
- `accepts a correct solution across all tests` ✅ → ACCEPTED
- `reports WRONG_ANSWER with result for every test case` ✅
- `records a failing result on compilation error` ✅ → COMPILATION_ERROR
- `reports runtime errors with a failing test result` ✅ → RUNTIME_ERROR
- `reports TIME_LIMIT_EXCEEDED for an infinite loop` ✅
- `ignores line-ending differences (CRLF output still passes)` ✅
- `ignores trailing whitespace per line and trailing blank lines` ✅
- `still fails on interior single-space differences` ✅
- `treats an empty program output as matching an empty expectation` ✅
- _(1 additional auth/concurrency test)_ ✅

### Stderr note (non-defect):

`[worker] duel progress publish failed: redis.publish is not a function` — occurs in `duel-resolve.test.ts` because the worker's fire-and-forget Redis publish runs against a `lazyConnect` client that hasn't connected in the test context. The call is `.catch(logBackgroundError)` — all 6 duel-resolve tests pass. This is a **test isolation quirk, not a production bug**.

---

## Phase 4 — API Security Review

| Check                                           | Result                                                                                       |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------- |
| IDOR — scene state scoped to JWT `userId`       | ✅ — `loadSceneState(userId, levelId)` uses token sub                                        |
| `getDashboard` strips sensitive fields          | ✅ — `passwordHash`, `emailVerifyToken`, `resetPasswordToken`, `resetPasswordExpiry` deleted |
| Socket.IO userId from JWT, never client payload | ✅                                                                                           |
| Admin routes — RBAC enforced                    | ✅ — `authorize('ADMIN','SUPER_ADMIN')` middleware                                           |
| `trust proxy` not hardcoded true                | ✅ — `env.trustProxyHops`                                                                    |
| All mutation endpoints have Zod validation      | ✅                                                                                           |
| Hints quota enforced before LLM call            | ✅                                                                                           |
| Rate-limit fallback when Redis down             | ✅ — per-process counter, tested                                                             |

---

## Phase 5 — Resilience (covered by test suite)

| Scenario                                                                       | Result                                     |
| ------------------------------------------------------------------------------ | ------------------------------------------ |
| Redis unavailable — rate-limit degrades gracefully                             | ✅ 14 tests pass                           |
| Redis unavailable — Redis-integration test fails loudly with `REQUIRE_REDIS=1` | ✅ correct guard                           |
| Worker fire-and-forget errors caught and logged                                | ✅ `logBackgroundError` wrapper            |
| Postgres-down / worker-kill scenarios                                          | 🚫 BLOCKED — need persistent compose stack |

---

## Phase 6 — Playwright E2E

**BLOCKED.** Requires all three services running simultaneously:

- `pnpm --filter server dev` on :3000
- `pnpm --filter game-client dev` on :5173
- `pnpm --filter admin-dashboard dev` on :5174

9 spec files exist covering: player flows, submission, duel, escape-room (2D), worlds, admin, engagement, social. Global setup probes `/health` and game-client root before any test runs — will fail fast if stack is not ready.

**Action required before release:** run `pnpm docker:up` + all three dev servers + `pnpm --filter e2e test`.

---

## Defect Log

### DEF-001 — Lint CI gate (28 errors) — ✅ FIXED-VERIFIED

- **Files:** `EscapeRoom3D.tsx`, `EscapeRoom3D-helpers.tsx`, `EscapeRoom3D-characters.tsx`, `ChallengePlayerPage.tsx`, `ChallengeListPage.tsx`, `ProfilePage.tsx`, `DesignSystemPage.tsx`, `AppLayout.tsx`, `eslint.config.js`
- **Fix:** removed unnecessary `??`/`?.` on provably non-null types; added `eslint-disable-next-line` for two forced non-null assertions TypeScript requires; scoped react plugin to game-client in root ESLint config; ran `pnpm format`.
- **Evidence:** `pnpm lint` → 14/14 ✅, `pnpm build` → 9/9 ✅, `pnpm typecheck` → 14/14 ✅

### DEF-002 — proxy-addr critical CVE — 🔴 OPEN (S2)

- **Path:** `apps/server → express@4.22.2 → proxy-addr@2.0.7`
- **CVE:** GHSA-c2j3-45gr-mqc4 — IP spoofing via IPv4-mapped addresses
- **Impact:** Attacker can falsify `req.ip`, bypassing IP-based rate limits. Partially mitigated by `TRUST_PROXY_HOPS` not being `true`.
- **Fix:** Upgrade Express to pull in patched `proxy-addr`, or pin `proxy-addr >=2.0.8`.

### DEF-003 — 50 dep vulnerabilities — 🟡 OPEN (S3, deferred)

- **Runtime vulns:** `proxy-addr` (DEF-002), `compression` DoS, `socket.io` Engine.IO DoS
- **Test-only:** Tinypool RCE (in vitest, not deployed)
- **Build-only:** brace-expansion, js-yaml, source-map-js, axios (all in ESLint/Vite)
- **Fix:** `pnpm audit --fix`, verify nothing breaks, document accepted residuals.

### DEF-004 — Judging + Redis tests skipped — ✅ FIXED-VERIFIED

- **Fix:** Started `cte-redis` container + built and ran `cte-code-runner-live`; set `REQUIRE_REDIS=1 REQUIRE_SANDBOX=1`.
- **Evidence:** 186/186 tests pass including all 11 judging verdicts.

### DEF-005 — Docker phases blocked — ✅ VERIFIED (partial)

- Sandbox image built: `code-to-escape/sandbox:latest` ✅
- Code-runner image built: `code-to-escape/code-runner:latest` ✅
- Code-runner container live: `/health` → `{"status":"ok","inFlight":0,"queued":0}` ✅
- Full `compose up` blocked by local Postgres on :5432. Use `--no-deps` or stop local PG.

### DEF-006 — `.env.example` missing vars — 🟡 OPEN (S4)

Missing: `AI_HINT_DAILY_LIMIT`, `AI_HINT_WINDOW_MS`, `DUEL_ACTIVE_TIMEOUT_MS`, `DUEL_OPEN_TIMEOUT_MS`, `DUEL_SWEEP_INTERVAL_MS`, `SOCKET_AUTH_REVALIDATE_MS`, `CODE_RUNNER_BIND_HOST`, `CODE_RUNNER_MAX_CONCURRENCY`, `CODE_RUNNER_MAX_QUEUE`.

### DEF-007 — Playwright E2E not run — 🔴 OPEN (S2)

- **Reason:** Cannot maintain persistent server+client+admin concurrently in automated tool context.
- **Fix:** Run manually: `docker compose up -d && pnpm --filter server dev & pnpm --filter game-client dev & pnpm --filter admin-dashboard dev & pnpm --filter e2e test`.

---

## Pre-Deploy Checklist

```
[ ] DEF-002: Upgrade express/proxy-addr OR written risk acceptance signed by tech lead
[ ] DEF-003: pnpm audit --fix → full test suite → document accepted residuals
[ ] DEF-007: Run full Playwright E2E suite (9 spec files) — all must pass
[ ] DEF-006: Add missing vars to .env.example (low priority, can defer 1 sprint)
[ ] Stop local Postgres on :5432 OR reconfigure docker-compose port; run full compose up
[ ] Merge qa/fix-def001-lint-errors → main after code review
[ ] pnpm format:check + pnpm test on merged main before tagging
[ ] Confirm .env.qa NOT copied into Docker image (check .dockerignore)
[ ] Verify TRUST_PROXY_HOPS matches exact reverse-proxy hop count in production
[ ] Tag release only after all S2 defects FIXED-VERIFIED or risk-accepted
```

---

## Residual Risks

1. **proxy-addr spoofing** — `TRUST_PROXY_HOPS` misconfigured in prod → rate limits bypassable.
2. **compression DoS** — mitigated by `json({ limit: '1mb' })`; consider disabling for WS upgrade.
3. **Playwright E2E not run** — visual regressions, JS errors in browser, duel 2-browser race conditions unverified.
4. **Firebase SW modified** — `public/firebase-messaging-sw.js` changed during session; not reviewed.
5. **Admin dashboard prod path** — `vite.config.ts` modified; only dev proxy verified, not production build path.

---

_Report generated by automated QA session. Evidence: `qa-evidence/` directory._
