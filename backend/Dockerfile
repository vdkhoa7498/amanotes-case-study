# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

FROM base AS development
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY docker-entrypoint.dev.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.dev.sh
COPY . .
EXPOSE 7770
ENV NODE_ENV=development
ENTRYPOINT ["docker-entrypoint.dev.sh"]
CMD ["pnpm", "run", "start:dev"]

FROM base AS production
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build && pnpm prune --prod
EXPOSE 7770
ENV NODE_ENV=production
CMD ["node", "dist/main.js"]
