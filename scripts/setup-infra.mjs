#!/usr/bin/env node
/**
 * Local infra setup: copy env templates, start Postgres/Redis/MinIO (Docker), run TypeORM migrations.
 * Run from repo root: pnpm setup:infra
 */
import { spawnSync } from 'node:child_process'
import { copyFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function run(cmd, args) {
  const r = spawnSync(cmd, args, {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  })
  if (r.error) {
    console.error(r.error)
    process.exit(1)
  }
  if (r.status !== 0) process.exit(r.status ?? 1)
}

function copyIfMissing(relFrom, relTo) {
  const from = join(root, relFrom)
  const to = join(root, relTo)
  if (existsSync(to)) {
    console.log(`[setup-infra] Unchanged: ${relTo}`)
    return
  }
  if (!existsSync(from)) {
    console.warn(`[setup-infra] Skip: missing template ${relFrom}`)
    return
  }
  copyFileSync(from, to)
  console.log(`[setup-infra] Created ${relTo} from ${relFrom}`)
}

const skipMigration = process.argv.includes('--skip-migration')

console.log('[setup-infra] (1/3) Environment files…')
copyIfMissing('.env.example', '.env')
copyIfMissing('backend/.env.example', 'backend/.env')

console.log(
  '[setup-infra] (2/3) Docker: postgres + redis + minio (--wait healthcheck)…',
)
run('docker', ['compose', 'up', '-d', '--wait', 'postgres', 'redis', 'minio'])

if (skipMigration) {
  console.log('[setup-infra] Skipping migrations (--skip-migration).')
  console.log('[setup-infra] Done. Run: pnpm migration:run')
  process.exit(0)
}

console.log('[setup-infra] (3/3) TypeORM migration:run…')
run('pnpm', ['--filter', 'backend', 'run', 'migration:run'])

console.log('[setup-infra] Done. Run `pnpm dev` to start API + web.')
