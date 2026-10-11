# User Guide

How to install, run, and use Code to Escape as a developer or player.

---

## Prerequisites

- **Node.js 20+** and **pnpm 9+**
- **Docker Desktop** (required for the code-runner sandbox)
- **PostgreSQL 16** and **Redis 7** (or use `docker compose up postgres redis`)

---

## Quick start (development)

```bash
# 1. Clone and install
git clone <repo>
cd code-to-escape
pnpm install

# 2. Copy environment template
cp .env.example .env
# Edit .env — at minimum set DATABASE_URL and REDIS_URL if not using docker-compose

# 3. Start backing services
docker compose up postgres redis -d

# 4. Build the sandbox image (required once, or after changes to docker/code-runner)
docker compose build code-runner-sandbox

# 5. Run database migrations
pnpm --filter server db:migrate

# 6. Seed content
pnpm --filter server seed:worlds       # 6 worlds
pnpm --filter server seed:beginner     # 42 challenges (7 languages × 6 problems)

# 7. Start all apps in parallel
pnpm dev
```

The game client starts at **http://localhost:5173**, the API at **http://localhost:3000**.

---

## Running individual apps

```bash
pnpm --filter game-client dev        # Game SPA only
pnpm --filter server dev             # API server only
pnpm --filter @code-to-escape/code-runner dev  # Code-runner only
pnpm --filter admin-dashboard dev    # Admin dashboard only
```

---

## Creating your first account

1. Open http://localhost:5173/register
2. Fill in username, email, password
3. You are automatically logged in and redirected to the dashboard

To create a superuser (admin) account:

```bash
pnpm --filter server tsx scripts/create-superuser.ts
```

---

## Playing the game

1. Go to **Worlds** in the navigation bar
2. Select **Python Forest** (no XP required)
3. You will enter the 2D escape room. Walk to the **terminal** and press **E**
4. A coding challenge appears in a modal. Write your solution, press **Run** to test, then **Submit**
5. On acceptance, the exit door opens — press **E** on the door to complete the room
6. Complete all 3 levels in a world to move to the next

### Keyboard controls (2D room)

| Key               | Action                      |
| ----------------- | --------------------------- |
| Arrow keys / WASD | Move player                 |
| `E`               | Interact with nearby object |

### Keyboard controls (3D room)

| Key  | Action                    |
| ---- | ------------------------- |
| WASD | Walk                      |
| Drag | Orbit camera              |
| `E`  | Interact with NPC or door |

---

## Hints

Each challenge has up to 3 manual hints (visible in the Hints panel). Revealing a hint deducts XP.

An **AI hint** button is available when a submission fails. This requests an AI-generated
explanation using the Groq API. You need a valid `GROQ_API_KEY` in `.env` for this to work.
Without a key, the button is disabled.

---

## Duels

1. Go to **Duels** in the navigation bar
2. Create a new duel lobby (choose a challenge)
3. Share the duel link with a friend
4. Both players solve the same challenge — the player with the better score wins

---

## Running tests

```bash
# All apps
pnpm test

# Individual apps
pnpm --filter server test
pnpm --filter game-client test
pnpm --filter @code-to-escape/code-runner test

# End-to-end (requires running stack)
pnpm --filter e2e test
```

---

## Production deployment

See `docs/Deployment.md` and `docs/Security.md` for full instructions.

The short version:

```bash
# Build and start the full stack
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# Run migrations against the production DB
docker compose exec server node dist/index.js db:migrate

# Seed content
docker compose exec server node dist/index.js seed
```

---

## Troubleshooting

| Symptom                         | Likely cause                   | Fix                                    |
| ------------------------------- | ------------------------------ | -------------------------------------- |
| "No published worlds available" | Worlds not seeded              | Run `pnpm --filter server seed:worlds` |
| Submit button spins forever     | Redis not running / queue down | Start Redis: `docker compose up redis` |
| AI hint button disabled         | `GROQ_API_KEY` not set         | Add key to `.env`                      |
| "Sandbox runtime unavailable"   | Docker Desktop not running     | Start Docker Desktop                   |
| TypeScript errors on start      | deps not installed             | `pnpm install`                         |
