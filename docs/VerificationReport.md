# Verification Report

## Before / After Table

| Phase | Item                      | Before (ae50884)                           | After |
| ----- | ------------------------- | ------------------------------------------ | ----- |
| 0     | server TS                 | ✅ 0 errors                                | —     |
| 0     | game-client TS            | ✅ 0 errors                                | —     |
| 0     | server tests              | ✅ 173 pass, 13 skip                       | —     |
| 0     | game-client tests         | ❌ 1 failed (room-config java-lake theme)  | —     |
| 0     | dist-node tracked in git  | ❌ 4 files tracked                         | —     |
| 0     | tmp-redis-check.ts in git | ❌ committed debug script                  | —     |
| 0     | CI game-client tests      | ❌ no CI step                              | —     |
| 0     | seed-worlds.ts worlds     | ❌ only python-forest + java-lake (2 of 7) | —     |
| 0     | GROQ_MODEL default        | ⚠️ qwen/qwen3.8-27b (unverified)           | —     |
| 0     | Duel enqueue failure      | ❌ stderr only, submission stuck QUEUED    | —     |

## Baseline — commit ae50884 (recorded $(Get-Date -Format 'yyyy-MM-dd'))

### Commands run

```
pnpm --filter @code-to-escape/server exec tsc --noEmit
```

Result: **0 errors** (no output)

```
pnpm --filter @code-to-escape/game-client exec tsc --noEmit
```

Result: **0 errors** (no output)

```
pnpm --filter @code-to-escape/server test
```

Result: **15 test files passed** (2 skipped), **173 tests passed** (13 skipped, 186 total)

- `judging.test.ts` — 11 tests skipped (requires live sandbox, REQUIRE_SANDBOX=1)
- `redis-integration.test.ts` — 2 tests skipped (requires REQUIRE_REDIS=1 + live Redis)

```
pnpm --filter @code-to-escape/game-client test
```

Result: **1 failed**, 12 passed (3 test files, 13 total)

- FAILED: `room-config.test.ts` line 16 — `expect(room.theme.id).toBe('java-lake')` received `'galaxy-dock'`
- Root cause: `generatedConfig()` falls back to `GALAXY_DOCK` theme for `java-lake` slug (no `java`/`lake` keyword match), but the test expects a `java-lake` themed fallback.

### Files tracked in git that should not be

```
git ls-files | grep dist-node
```

Result:

- `apps/admin-dashboard/dist-node/vite.config.d.ts`
- `apps/admin-dashboard/dist-node/vite.config.js`
- `apps/game-client/dist-node/vite.config.d.ts`
- `apps/game-client/dist-node/vite.config.js`

### Debug scripts committed

- `apps/server/scripts/tmp-redis-check.ts` — ad-hoc Redis check, superseded by `redis-integration.test.ts`

### Seed coverage

`seed-worlds.ts` seeds 2 worlds:

- `python-forest` (3 levels, 1 key, 1 lock)
- `java-lake` (3 levels, 1 key, 1 lock)

Missing worlds with bespoke room configs in `room-config.ts`:

- `javascript-jungle`, `typescript-tundra`, `rust-realm`, `go-galaxy`

---

## After — updated after Phase 1–6 completion

_(filled in during Phase 6)_
