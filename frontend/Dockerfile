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
EXPOSE 7777
ENV NODE_ENV=development
ENTRYPOINT ["docker-entrypoint.dev.sh"]
CMD ["pnpm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "7777"]

FROM base AS build
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
ARG VITE_API_URL=http://localhost:7770
ENV VITE_API_URL=${VITE_API_URL}
RUN pnpm run build

FROM nginx:1.27-alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
