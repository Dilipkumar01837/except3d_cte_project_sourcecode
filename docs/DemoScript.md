# Code to Escape Demo Script

## Preparation

Start PostgreSQL, Redis, code runner, API, worker, game client, and admin dashboard. Use seeded non-production accounts and avoid real personal data. Confirm the migration and Groq/Firebase configuration states before the demo.

## Sequence

1. Open the game client and show responsive navigation, worlds, XP, streaks, and challenge selection.
2. Enter a 3D escape room, interact with the coding terminal, and show the 2D fallback control.
3. Submit a small challenge and show the queued worker result, diagnostics, and progression update.
4. Request an adaptive hint. Point out its type, personalization indicator, rating controls, different-type action, example action, and quota.
5. Open the profile and show hint history and the personalization opt-out.
6. Open the duel lobby, join a seeded match, synchronize code, submit, and show the result event.
7. Open friends/social features and notification settings without displaying personal data.
8. Open admin analytics and show assessments, experiment assignment coverage, and hint-effectiveness panels.
9. Close with the study status: methodology is prepared; results are shown only when backed by approved participant data.

## Failure Fallbacks

If Groq is unavailable, demonstrate the local hint fallback. If WebGL is unavailable, use the 2D room. If the runner is unavailable, show the health/readiness state rather than inventing a result.
