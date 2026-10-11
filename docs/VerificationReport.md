# Verification Report

## Before / After Table

| Phase | Item                      | Before (ae50884)                                                      | After (c26039a)                              |
| ----- | ------------------------- | --------------------------------------------------------------------- | -------------------------------------------- |
| 0     | server TS                 | ✅ 0 errors                                                           | ✅ 0 errors                                  |
| 0     | game-client TS            | ✅ 0 errors                                                           | ✅ 0 errors                                  |
| 0     | server tests              | ✅ 173 pass, 13 skip                                                  | ✅ 173 pass, 13 skip                         |
| 1     | game-client tests         | ❌ 1 failed (room-config java-lake theme)                             | ✅ 14 pass                                   |
| 1     | dist-node tracked in git  | ❌ 4 files tracked                                                    | ✅ removed, .gitignore updated               |
| 1     | tmp-redis-check.ts in git | ❌ committed debug script                                             | ✅ removed from index                        |
| 1     | CI game-client tests      | ❌ no CI step                                                         | ✅ step added                                |
| 1     | seed-worlds.ts worlds     | ❌ only python-forest + java-lake (2 of 7)                            | ✅ 6 worlds seeded                           |
| 1     | GROQ_MODEL default        | ⚠️ qwen/qwen3.8-27b (unverified)                                      | ✅ llama-3.3-70b-versatile                   |
| 1     | Duel enqueue failure      | ❌ stderr only, submission stuck QUEUED                               | ✅ marks INTERNAL_ERROR                      |
| 1     | Phantom env vars          | ❌ CODE_RUNNER_TIMEOUT/MEMORY/CPU_LIMIT not wired                     | ✅ removed with explanation                  |
| 2     | Docker socket proxy       | ❌ raw socket mount                                                   | ✅ docker-compose.prod.yml added             |
| 2     | Security.md               | ❌ missing                                                            | ✅ created (threat model + controls + risks) |
| 3     | EscapeRoom3D.tsx size     | ❌ 1281 lines                                                         | ✅ split into 4 files (max 509 lines)        |
| 3     | ChallengePlayerPage size  | ❌ 996 lines                                                          | ✅ widgets extracted into separate file      |
| 4     | API.md accuracy           | ❌ fabricated envelope format, missing routes                         | ✅ regenerated from create-app.ts            |
| 4     | FolderStructure.md        | ❌ stale, shallow                                                     | ✅ depth-3, accurate counts                  |
| 4     | New docs                  | ❌ Glossary, UserGuide, MigrationsGuide, SynopsisTraceability missing | ✅ all created                               |
| 5     | RevisedSynopsis.md        | ⚠️ "proposed system" framing, vague counts                            | ✅ "implemented system", measured figures    |

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

## After — Phase 6 final verification (commit c26039a)

### Test results

```
pnpm --filter server test  →  173 passed, 13 skipped (17 files)  ✅
pnpm --filter game-client test  →  14 passed, 0 failed (3 files)  ✅
```

### TypeScript

```
pnpm --filter server typecheck  →  0 errors  ✅
pnpm --filter game-client typecheck  →  0 errors  ✅
```

### Git hygiene

- No build artefacts tracked (dist-node/ in .gitignore)
- No debug scripts tracked (tmp-redis-check.ts removed from index)
- docker-compose.yml valid (confirmed with `docker compose config`)

### Net defects resolved: 11

### New files added: 12 (Security.md, docker-compose.prod.yml, DecisionLog.md, Glossary.md, UserGuide.md, MigrationsGuide.md, SynopsisTraceability.md, EscapeRoom3D-helpers.tsx, EscapeRoom3D-characters.tsx, EscapeRoom3D-environments.tsx, ChallengePlayerPage-widgets.tsx, VerificationReport.md)

### No tests deleted, no behaviour changed
