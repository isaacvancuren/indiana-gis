import { captureMessage } from '@sentry/cloudflare'
import type { Env } from '../env'

// ─── Defensive limits ────────────────────────────────────────────────────────
// These caps protect against runaway billing if D1 unexpectedly grows huge or
// if the prune logic misbehaves. Numbers chosen well above realistic usage so
// they don't trigger under normal conditions.
//
// At Cloudflare R2 rates ($0.015/GB/month above 10GB free), even a worst-case
// scenario where all caps are simultaneously hit costs <$1/month. These caps
// exist to bound the failure mode, not for typical operation.

/** Hard cap on a single backup's compressed size. ~100MB. If the gzipped dump
 *  exceeds this, skip the upload and alert via Sentry. Real backups are KBs. */
const MAX_BACKUP_BYTES = 100 * 1024 * 1024

/** Hard cap on total objects in the backup prefix. Prune retains 30 days, so
 *  this should never exceed ~31 in steady state. If we ever see >100, the
 *  prune logic has misbehaved and we abort writes until investigated. */
const MAX_BACKUP_OBJECTS = 100

/**
 * Daily D1 backup → R2.
 *
 * Triggered by cron in wrangler.toml (currently 03:00 UTC daily).
 * Dumps every non-system table as INSERT statements, gzips the result,
 * and writes to R2 under `d1/mapnova/<YYYY-MM-DD>.sql.gz`.
 *
 * Retention: 30 days. Older objects pruned in the same run.
 *
 * Defensive limits (see constants above):
 *  - Aborts if a single dump exceeds MAX_BACKUP_BYTES (caps blast radius
 *    if D1 unexpectedly grows huge).
 *  - Aborts writes (but still attempts prune) if R2 already holds more
 *    than MAX_BACKUP_OBJECTS in the prefix (caps blast radius if prune
 *    misbehaved).
 *
 * No-ops gracefully if env.BACKUPS or env.DB is unbound, so a misconfig
 * doesn't throw at deploy time.
 */
export async function handleBackup(env: Env): Promise<void> {
  if (!env.BACKUPS || !env.DB) {
    console.warn('[backup] BACKUPS or DB binding missing; skipping')
    return
  }

  // Defense: count current objects before writing. If something has gone
  // pathologically wrong and there are already >100 objects, skip the write
  // (but still run prune so we eventually recover).
  const currentCount = await countBackupObjects(env)
  if (currentCount >= MAX_BACKUP_OBJECTS) {
    captureMessage(
      `[backup] aborting write — bucket holds ${currentCount} objects (cap=${MAX_BACKUP_OBJECTS}). Investigate prune logic.`,
      'error',
    )
    await pruneOldBackups(env)
    return
  }

  const date = new Date().toISOString().slice(0, 10)
  const key = `d1/mapnova/${date}.sql.gz`

  const sql = await dumpD1ToSQL(env)
  const compressed = await gzip(new TextEncoder().encode(sql))

  // Defense: cap individual dump size.
  if (compressed.byteLength > MAX_BACKUP_BYTES) {
    captureMessage(
      `[backup] aborting write — dump size ${compressed.byteLength} bytes exceeds cap ${MAX_BACKUP_BYTES}. D1 has grown unexpectedly large.`,
      'error',
    )
    return
  }

  await env.BACKUPS.put(key, compressed, {
    httpMetadata: { contentType: 'application/gzip' },
  })

  await pruneOldBackups(env)
}

async function countBackupObjects(env: Env): Promise<number> {
  let count = 0
  let cursor: string | undefined
  do {
    const listed = await env.BACKUPS!.list({ prefix: 'd1/mapnova/', cursor })
    count += listed.objects.length
    cursor = listed.truncated ? listed.cursor : undefined
    // Bail out of the loop early if we're already over the cap to avoid
    // pointlessly paginating through a huge bucket.
    if (count >= MAX_BACKUP_OBJECTS) return count
  } while (cursor)
  return count
}

async function dumpD1ToSQL(env: Env): Promise<string> {
  const lines: string[] = [
    '-- mapnova D1 backup',
    `-- Generated: ${new Date().toISOString()}`,
    '',
  ]

  const { results: tables } = await env.DB!.prepare(
    "SELECT name, sql FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
  ).all<{ name: string; sql: string }>()

  for (const table of tables) {
    lines.push(`-- Table: ${table.name}`)
    lines.push(`DROP TABLE IF EXISTS \`${table.name}\`;`)
    lines.push(`${table.sql};`)
    lines.push('')

    const { results: rows } = await env.DB!.prepare(
      `SELECT * FROM \`${table.name}\``,
    ).all<Record<string, unknown>>()

    if (rows.length > 0) {
      const cols = Object.keys(rows[0])
        .map(c => `\`${c}\``)
        .join(', ')
      for (const row of rows) {
        const vals = Object.values(row).map(sqlValue).join(', ')
        lines.push(`INSERT INTO \`${table.name}\` (${cols}) VALUES (${vals});`)
      }
      lines.push('')
    }
  }

  return lines.join('\n')
}

function sqlValue(v: unknown): string {
  if (v === null || v === undefined) return 'NULL'
  if (typeof v === 'number') return String(v)
  if (typeof v === 'boolean') return v ? '1' : '0'
  return `'${String(v).replace(/'/g, "''")}'`
}

async function gzip(data: Uint8Array): Promise<ArrayBuffer> {
  const cs = new CompressionStream('gzip')
  const writer = cs.writable.getWriter()
  await writer.write(data)
  await writer.close()
  return new Response(cs.readable).arrayBuffer()
}

async function pruneOldBackups(env: Env): Promise<void> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 30)
  const cutoffDateStr = cutoff.toISOString().slice(0, 10)

  let cursor: string | undefined
  do {
    const listed = await env.BACKUPS!.list({ prefix: 'd1/mapnova/', cursor })
    for (const obj of listed.objects) {
      const match = obj.key.match(/d1\/mapnova\/(\d{4}-\d{2}-\d{2})\.sql\.gz$/)
      if (match && match[1] < cutoffDateStr) {
        await env.BACKUPS!.delete(obj.key)
      }
    }
    cursor = listed.truncated ? listed.cursor : undefined
  } while (cursor)
}
