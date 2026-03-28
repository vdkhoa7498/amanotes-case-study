/**
 * Minimum env vars so AppModule can bootstrap in e2e tests.
 * E2E still needs real Postgres + Redis (or module overrides).
 */
process.env.NODE_ENV ??= 'test';
process.env.DATABASE_URL ??=
  'postgresql://goodjob:goodjob@127.0.0.1:5432/goodjob';
process.env.REDIS_URL ??= 'redis://127.0.0.1:6379';
process.env.JWT_SECRET ??= 'e2e-jwt-secret-min-16-chars!!';
process.env.JWT_REFRESH_SECRET ??= 'e2e-refresh-secret-min-16!';
process.env.FRONTEND_URL ??= 'http://localhost:7777';
