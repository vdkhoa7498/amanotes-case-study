# syntax=docker/dockerfile:1
# Build từ root repo: docker compose build backend (context: .)

FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

FROM base AS development
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
RUN pnpm install --frozen-lockfile --filter backend
COPY backend/docker-entrypoint.dev.sh /usr/local/bin/docker-entrypoint.dev.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.dev.sh
COPY backend ./backend
WORKDIR /app/backend
EXPOSE 7770
ENV NODE_ENV=development
ENTRYPOINT ["docker-entrypoint.dev.sh"]
CMD ["pnpm", "run", "start:dev"]

FROM base AS production
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
RUN pnpm install --frozen-lockfile --filter backend
COPY backend ./backend
WORKDIR /app/backend
RUN pnpm run build
EXPOSE 7770
ENV NODE_ENV=production
CMD ["node", "dist/main.js"]
