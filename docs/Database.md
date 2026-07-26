# Database

## Prisma

Schema location: `database/prisma/schema.prisma`

Day 1 configures the generator and PostgreSQL datasource only. Models will be added in future days.

## Connection

```
DATABASE_URL=postgresql://cte:cte_dev_password@localhost:5432/code_to_escape
```

## Commands

```bash
pnpm db:generate   # Generate Prisma client
pnpm db:migrate    # Run migrations (Day 2+)
pnpm db:studio     # Open Prisma Studio
```

## Planned Entities

Users, Profiles, Worlds, Rooms, Challenges, Submissions, Inventory, Achievements, PlayerProgress, Leaderboards, Friends, Notifications, DuelMatches, Bosses, Quests, AIHintHistory, AdminUsers, GameSettings.
