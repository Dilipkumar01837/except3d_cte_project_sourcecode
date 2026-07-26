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
EXPOSE 3001
CMD ["node", "dist/index.js"]
