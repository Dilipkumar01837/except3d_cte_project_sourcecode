FROM node:20-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/server/package.json ./apps/server/
COPY packages ./packages
COPY database ./database
RUN pnpm install --frozen-lockfile

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm --filter @code-to-escape/server build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/apps/server/dist ./dist
COPY --from=build /app/apps/server/package.json ./
COPY --from=build /app/node_modules ./node_modules
# Include the Prisma schema so `prisma migrate deploy` can run inside the container
COPY --from=build /app/database/prisma ./database/prisma
EXPOSE 3000
# Default runs the API. The worker uses the same image with
# `command: node dist/worker.js`; both are required for judging to happen.
CMD ["node", "dist/index.js"]
