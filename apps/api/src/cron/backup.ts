import type { Env } from '../env'

export async function handleBackup(env: Env): Promise<void> {
  const date = new Date().toISOString().slice(0, 10)
  const key = `d1/mapnova/${date}.sql.gz`

  const sql = await dumpD1ToSQL(env)
  const compressed = await gzip(new TextEncoder().encode(sql))

  await env.BACKUPS.put(key, compressed, {
    httpMetadata: { contentType: 'application/gzip' },
  })

  await pruneOldBackups(env)
}

async function dumpD1ToSQL(env: Env): Promise<string> {
  const lines: string[] = [
    '-- mapnova D1 backup',
    `-- Generated: ${new Date().toISOString()}`,
    '',
  ]

  const { results: tables } = await env.DB.prepare(
    "SELECT name, sql FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
  ).all<{ name: string; sql: string }>()

  for (const table of tables) {
    lines.push(`-- Table: ${table.name}`)
    lines.push(`DROP TABLE IF EXISTS \`${table.name}\`;`)
    lines.push(`${table.sql};`)
    lines.push('')

    const { results: rows } = await env.DB.prepare(
      `SELECT * FROM \`${table.name}\``
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
    const listed = await env.BACKUPS.list({ prefix: 'd1/mapnova/', cursor })
    for (const obj of listed.objects) {
      const match = obj.key.match(/d1\/mapnova\/(\d{4}-\d{2}-\d{2})\.sql\.gz$/)
      if (match && match[1] < cutoffDateStr) {
        await env.BACKUPS.delete(obj.key)
      }
    }
    cursor = listed.truncated ? listed.cursor : undefined
  } while (cursor)
}
