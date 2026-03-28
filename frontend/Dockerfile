# syntax=docker/dockerfile:1
# Build từ root repo: docker compose build frontend (context: .)

FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

FROM base AS development
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
RUN pnpm install --frozen-lockfile --filter frontend
COPY frontend/docker-entrypoint.dev.sh /usr/local/bin/docker-entrypoint.dev.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.dev.sh
COPY frontend ./frontend
WORKDIR /app/frontend
EXPOSE 7777
ENV NODE_ENV=development
ENTRYPOINT ["docker-entrypoint.dev.sh"]
CMD ["pnpm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "7777"]

FROM base AS build
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
RUN pnpm install --frozen-lockfile --filter frontend
COPY frontend ./frontend
WORKDIR /app/frontend
ARG VITE_API_URL=http://localhost:7770
ENV VITE_API_URL=${VITE_API_URL}
RUN pnpm run build

FROM nginx:1.27-alpine AS production
COPY --from=build /app/frontend/dist /usr/share/nginx/html
COPY frontend/nginx/default.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
