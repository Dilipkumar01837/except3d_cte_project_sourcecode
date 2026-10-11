# Decision Log

Decisions made during the Phase 1–6 clean-up pass that were ambiguous or had alternatives worth recording.
Each entry follows the format: **ID · Date · Title · Decision · Rationale · Alternatives considered**.

---

## DL-001 · 2025 · GROQ_MODEL default changed to `llama-3.3-70b-versatile`

**Decision**: Replace the `GROQ_MODEL` default `qwen/qwen3.8-27b` with `llama-3.3-70b-versatile`.

**Rationale**: `qwen/qwen3.8-27b` is not a valid Groq model identifier as of 2025 — submitting it
to the Groq API returns a 400 error, which silently disables all AI hint generation for every user.
`llama-3.3-70b-versatile` is a documented, generally-available Groq model that is suitable for
structured-output hint generation.

**Alternatives considered**:

- Keep the placeholder and rely on operators to set a real model. Rejected because the dev default
  must work out of the box for developers who have a `GROQ_API_KEY` set.
- Use `llama3-8b-8192` (smaller, faster). Rejected — hint quality matters; the 70B model gives
  more accurate code hints.

---

## DL-002 · 2025 · Phantom CODE_RUNNER_TIMEOUT_MS / MEMORY_MB / CPU_LIMIT removed from .env.example

**Decision**: Remove `CODE_RUNNER_TIMEOUT_MS`, `CODE_RUNNER_MEMORY_MB`, and `CODE_RUNNER_CPU_LIMIT`
from `.env.example`. Add explanatory comments in their place.

**Rationale**: None of these three variables are read anywhere in the codebase:

- `CODE_RUNNER_TIMEOUT_MS` — the sandbox watchdog is computed from `request.timeLimitMs`
  (a per-challenge value passed at submission time) plus a fixed startup/compile allowance
  in `apps/code-runner/src/sandbox.ts:containerWatchdogMs()`.
- `CODE_RUNNER_MEMORY_MB` — the `--memory` Docker flag uses `request.memoryLimitMb` (a
  per-challenge value stored in the `Challenge` table).
- `CODE_RUNNER_CPU_LIMIT` — the `--cpus 0.5` Docker flag is hardcoded in `sandbox.ts`.

Listing variables in `.env.example` that have no effect misleads operators into believing
that editing them changes sandbox behaviour.

**Alternatives considered**:

- Wire the variables as global caps (e.g., reject any request whose `timeLimitMs` exceeds
  `CODE_RUNNER_TIMEOUT_MS`). Deferred: this is a new feature, not a bug fix, and is out of
  scope for the Phase 1 defect pass.

---

## DL-003 · 2025 · seed-worlds.ts extended with 4 missing worlds

**Decision**: Add `javascript-jungle`, `typescript-tundra`, `rust-realm`, and `go-galaxy` to
`apps/server/scripts/seed-worlds.ts`. Each world seeds 3 levels, 1 key, and 1 lock.

**Rationale**: `apps/game-client/src/features/escape-room/lib/room-config.ts` declares bespoke
2D room configurations for exactly these 4 worlds, but the seed script only created
`python-forest` and `java-lake`. A fresh database therefore had no game worlds mapped to the
4 existing room configs, so players could never reach those rooms via normal world progression.

**Challenge slugs used**: The beginner challenge seed generates slugs with the pattern
`${language.toLowerCase()}-${problem-key}` (C++ becomes `cpp`). The 3 challenge slugs per world
(`*-sum-two-numbers`, `*-even-or-odd`, `*-largest-of-three`) mirror the python-forest and
java-lake pattern exactly.

**Alternatives considered**:

- Add a 5th world `cpp-caverns` to match the C++ language. Deferred: `room-config.ts` has no
  bespoke config for a C++ world, so adding it would create an unrendered world. Can be added
  when room configs for it are authored.

---

## DL-004 · 2025 · duel.service.ts: mark submissions INTERNAL_ERROR on enqueue failure

**Decision**: When `executionQueue.enqueue()` throws, immediately update the submission to
`status: 'INTERNAL_ERROR'` with a user-facing message instead of only logging to stderr.

**Rationale**: A submission left in `QUEUED` status indefinitely blocks the player from
retrying — the UI polls until a terminal status arrives. With Redis unavailable the queue
fails but the submission row was never updated, causing an infinite spinner.

**Alternatives considered**:

- Retry the enqueue. Rejected: the queue layer (`execution.queue.ts`) already handles Redis
  reconnection; a service-layer retry would duplicate that logic and delay the user feedback.

---

## DL-005 · 2025 · java-lake room configs added to room-config.ts

**Decision**: Add `JAVA_SHALLOWS`, `JAVA_REEF`, `JAVA_DEEP` themes and three `RoomConfig`
entries (`java-lake:1`, `java-lake:2`, `java-lake:3`) to `room-config.ts`.

**Rationale**: `seed-worlds.ts` seeded a `java-lake` world, but `room-config.ts` had no bespoke
configs for it. The `generatedConfig()` fallback applied a `galaxy-dock` theme, which the
test `room-config.test.ts` hardcoded — causing a test failure (`expected 'java-lake',
received 'galaxy-dock'`).

**Alternatives considered**:

- Update the test to expect `galaxy-dock`. Rejected: the test was documenting intended
  behaviour (java-lake should have a distinct theme); fixing the test to match broken
  behaviour would mask the real gap.
