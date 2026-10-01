# Database

## Prisma

Schema location: `database/prisma/schema.prisma`

The generator intentionally declares no custom `output`. With pnpm's isolated store a
hard-coded path writes the client somewhere `apps/server` never resolves, leaving it
typechecked against a stale schema.

## Connection

```
DATABASE_URL=postgresql://cte:cte_dev_password@localhost:5432/code_to_escape
```

## Commands

```bash
pnpm db:generate     # Generate Prisma client
pnpm db:migrate      # Run migrations (dev)
pnpm db:migrate:deploy  # Apply migrations (CI/production)
pnpm db:studio       # Open Prisma Studio
```

## Models

These are the models that exist in the schema today:

| Group          | Models                                                                                           |
| -------------- | ------------------------------------------------------------------------------------------------ |
| Identity       | `User`, `Session`, `RefreshToken`, `LoginHistory`                                                |
| Player profile | `Profile`                                                                                        |
| Content        | `GameWorld`, `GameLevel`, `Challenge`, `ChallengeTestCase`, `ChallengeHint`, `ChallengeSolution` |
| Progress       | `PlayerWorldProgress`, `PlayerLevelProgress`, `PlayerHintReveal`                                 |
| Execution      | `Submission`, `SubmissionTestResult`                                                             |
| Economy        | `PlayerInventory`, `InventoryItem`, `DailyReward`, `PlayerDailyReward`                           |
| Achievements   | `Achievement`, `PlayerAchievement`                                                               |
| Social         | `DuelMatch`, `PlayerNotification`                                                                |
| AI             | `AiHintHistory`                                                                                  |
| Admin          | `AdminAuditLog`                                                                                  |

There is no `Room`, `Friend`, `Boss`, `Quest`, `Leaderboard`, `AdminUser`, or
`GameSettings` model. Leaderboards are Redis sorted sets, not a table; administration uses
the `User.role` enum plus `AdminAuditLog`.

### Concurrency-sensitive constraints

Two invariants are enforced by the database rather than by an application-level read,
because a read-then-write under READ COMMITTED cannot see a concurrent uncommitted insert:

- `@@unique([userId, claimDate])` on `PlayerDailyReward` — one daily reward per user per
  UTC day. See `20260930120000_daily_reward_claim_date_unique`.
- `@@unique([userId, achievementId])` on `PlayerAchievement` — the achievement unlock is
  claimed by inserting the row inside the reward transaction.
