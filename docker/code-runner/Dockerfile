FROM node:20-bookworm-slim AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/code-runner ./apps/code-runner
COPY packages/config ./packages/config
RUN pnpm install --filter @code-to-escape/code-runner... --no-frozen-lockfile
RUN pnpm --filter @code-to-escape/code-runner build

FROM node:20-bookworm-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends docker.io && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/apps/code-runner/dist ./dist
EXPOSE 3002
CMD ["node", "dist/index.js"]
