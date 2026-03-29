# GoodJob — Employee Recognition & Rewards Platform

An internal platform for peer-to-peer kudos, point-based rewards, and team recognition.
Built with **NestJS** (backend) · **React 18 + Vite** (frontend) · **PostgreSQL** · **Redis** · **Docker**.

---

## Features

| Area | Details |
|---|---|
| **Auth** | Email/OTP registration & login, JWT access + refresh tokens, Google OAuth |
| **Kudos** | Send kudos tied to core values, point ledger (double-entry), real-time feed via Socket.IO + MQTT |
| **Rewards** | Point redemption catalog, stock management |
| **AI** | Monthly achievement summary (GPT-4o), semantic kudo search (text-embedding-3-small) |
| **Admin** | CRUD for reward catalog and core values, role-based access (admin / staff) |
| **Avatar** | Upload to MinIO (S3-compatible) |

---

## Tech Stack

```
monorepo (pnpm workspaces)
├── backend/    NestJS · TypeORM · PostgreSQL · Redis (ioredis) · Socket.IO · Passport JWT
└── frontend/   React 18 · Vite · Ant Design · TanStack Query · React Router v6
```

Infrastructure (Docker Compose): `postgres:16` · `redis:7` · `eclipse-mosquitto:2` · `minio/minio`

---

## Quick Start (Docker — recommended)

### 1. Clone & configure

```bash
git clone https://github.com/<your-org>/amanotes-case-study.git
cd amanotes-case-study
cp .env.example .env
```

Edit `.env` — the defaults work out of the box for local development.
Set `OPENAI_API_KEY` if you want AI features enabled.

### 2. Start everything

```bash
docker compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:7777 |
| Backend API | http://localhost:7770 |
| MinIO console | http://localhost:9001 (user: `minioadmin` / pass: `minioadmin`) |

### 3. Run migrations

```bash
pnpm migration:run
# or set TYPEORM_MIGRATIONS_RUN=true in .env to run automatically on startup
```

A default admin account is seeded by migration:

| Field | Value |
|---|---|
| Email | `admin@goodjob.local` |
| Password | `Admin@123456` |

---

## Local Development (without Docker)

### Prerequisites

- Node.js ≥ 20
- pnpm ≥ 9
- Docker (for infra services only)

### Setup

```bash
# Install dependencies
pnpm install

# Start only infrastructure containers (postgres, redis, minio, mosquitto)
pnpm infra:up
# or: node scripts/setup-infra.mjs

# Copy and configure env
cp backend/.env.example backend/.env

# Run both frontend and backend in watch mode
pnpm dev
```

Individual commands:

```bash
pnpm dev:web      # Vite dev server  → http://localhost:7777
pnpm dev:api      # NestJS watch     → http://localhost:7770
```

---

## Environment Variables

Copy `.env.example` → `.env`. Key variables:

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://goodjob:goodjob@postgres:5432/goodjob` |
| `REDIS_URL` | Redis connection URL | `redis://redis:6379` |
| `JWT_SECRET` | Access token signing secret (**change in prod**) | dev placeholder |
| `JWT_REFRESH_SECRET` | Refresh token signing secret (**change in prod**) | dev placeholder |
| `TYPEORM_MIGRATIONS_RUN` | Auto-run migrations on startup | `false` |
| `VITE_API_URL` | API base URL used by the browser | `http://localhost:7770` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID (optional) | empty |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret (optional) | empty |
| `SMTP_HOST` | SMTP host for OTP emails (optional, logs to console if empty) | empty |
| `OPENAI_API_KEY` | OpenAI key for AI summary & semantic search (optional) | empty |
| `OTP_MASTER_CODE` | Master OTP that bypasses all verification — **dev/test only** | empty |
| `S3_ENDPOINT` | MinIO/S3 internal endpoint | `http://minio:9000` |
| `S3_PUBLIC_BASE_URL` | Public URL for browser to load images | `http://localhost:9000` |

See `.env.example` for the full list with comments.

---

## Scripts

Run from the repo root (`pnpm <script>`):

| Script | Description |
|---|---|
| `dev` | Start frontend + backend in watch mode concurrently |
| `build` | Production build for both packages |
| `test` | Run backend unit tests |
| `test:e2e` | Run backend e2e integration tests |
| `lint` | ESLint for both packages |
| `migration:run` | Run pending TypeORM migrations |
| `migration:revert` | Revert the last migration |
| `migration:show` | List migration status |
| `infra:up` | Start infra containers (postgres, redis, minio, mosquitto) |
| `infra:down` | Stop infra containers |
| `docker:up` | `docker compose up` |
| `docker:up:build` | `docker compose up --build` |
| `docker:down` | `docker compose down` |

---

## API Overview

Base path: `/` (or `/api/` when behind nginx reverse proxy)

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/register` | — | Start registration (sends OTP) |
| `POST` | `/auth/verify-register` | — | Verify OTP & create account |
| `POST` | `/auth/login` | — | Request login OTP |
| `POST` | `/auth/login/verify` | — | Verify OTP & get tokens |
| `POST` | `/auth/refresh` | — | Refresh access token |
| `POST` | `/auth/forgot-password` | — | Send password-reset OTP |
| `POST` | `/auth/reset-password` | — | Reset password with OTP |
| `GET` | `/auth/google` | — | Redirect to Google OAuth |
| `GET` | `/kudos` | JWT | Paginated kudo feed |
| `POST` | `/kudos` | JWT | Send a kudo |
| `GET` | `/kudos/ai-summary` | JWT | AI monthly achievement summary |
| `GET` | `/kudos/ai-search?q=` | JWT | Semantic kudo search |
| `GET` | `/rewards/catalog` | JWT | List reward catalog |
| `POST` | `/rewards/redeem` | JWT | Redeem points for a reward |
| `GET` | `/admin/rewards` | JWT + Admin | List reward catalog (admin) |
| `POST` | `/admin/rewards` | JWT + Admin | Create reward item |
| `PATCH` | `/admin/rewards/:id` | JWT + Admin | Update reward item |
| `DELETE` | `/admin/rewards/:id` | JWT + Admin | Delete reward item |
| `GET` | `/admin/core-values` | JWT + Admin | List core values |
| `POST` | `/admin/core-values` | JWT + Admin | Create core value |
| `PATCH` | `/admin/core-values/:id` | JWT + Admin | Update core value |
| `DELETE` | `/admin/core-values/:id` | JWT + Admin | Delete core value |

WebSocket namespace: `/` — event `kudo:created` broadcast on new kudo.

---

## Project Structure

```
.
├── backend/
│   ├── src/
│   │   ├── admin/          CRUD controllers for rewards & core values
│   │   ├── ai/             OpenAI summary & semantic search service
│   │   ├── auth/           Registration, login, OTP, JWT, Google OAuth
│   │   ├── common/         Guards (AdminGuard), interceptors
│   │   ├── config/         Joi env validation schema
│   │   ├── database/       TypeORM data-source + migrations
│   │   ├── email/          SMTP / console email service
│   │   ├── kudos/          Kudo creation, feed, points ledger
│   │   ├── redis/          ioredis wrapper
│   │   ├── rewards/        Catalog listing & point redemption
│   │   └── users/          User entity & service
│   └── test/               Jest e2e specs
└── frontend/
    └── src/
        ├── app/            BrowserRouter, route tree, lazy imports
        ├── features/
        │   ├── admin/      Admin pages (rewards, core values)
        │   ├── auth/       Login, register, OAuth callback pages
        │   ├── dashboard/  User dashboard with AI summary
        │   ├── kudos/      Feed, create modal, search modal
        │   └── rewards/    Catalog & redemption page
        └── shared/
            ├── components/ AppLayout, AuthLayout, ErrorBoundary, NotificationBell
            └── lib/        axios client, query keys
```

---

## Deployment

The repo includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that SSH-deploys to a VPS on every push to `master`.

**Required GitHub Secrets:**

| Secret | Description |
|---|---|
| `SSH_HOST` | Server IP or hostname |
| `SSH_USERNAME` | SSH user (e.g. `root`) |
| `SSH_PRIVATE_KEY` | Private key matching the server's `authorized_keys` |

**On the server**, create `/root/sources/amanotes-case-study/.env` from `.env.example` with production values, then the workflow will `git pull` and `docker compose up --build -d`.

Production nginx config (`frontend/nginx/default.conf`) proxies `/api/` → `http://backend:7770/` and `/socket.io/` for WebSocket upgrades.

---

## Testing

```bash
# Unit tests
pnpm test

# e2e integration tests (requires running postgres + redis)
pnpm test:e2e
```

E2e tests spin up a full NestJS application with a real database and cover:
- Full registration → OTP verify → login flow
- Give kudo happy path (201, DB row, point ledger double-entry)
- Self-kudo rejection (400)
