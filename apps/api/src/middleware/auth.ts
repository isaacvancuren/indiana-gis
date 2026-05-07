import { createMiddleware } from 'hono/factory'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import { drizzle } from 'drizzle-orm/d1'
import { eq } from 'drizzle-orm'
import type { Env } from '../env'
import { users } from '../db/schema'

export type AuthVariables = { userId: string }

const jwksSets = new Map<string, ReturnType<typeof createRemoteJWKSet>>()

function getJWKS(issuerUrl: string) {
  if (!jwksSets.has(issuerUrl)) {
    jwksSets.set(
      issuerUrl,
      createRemoteJWKSet(new URL(`${issuerUrl}/.well-known/jwks.json`)),
    )
  }
  return jwksSets.get(issuerUrl)!
}

export const requireAuth = createMiddleware<{
  Bindings: Env
  Variables: AuthVariables
}>(async (c, next) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const token = authHeader.slice(7)
  let userId: string

  try {
    const parts = token.split('.')
    if (parts.length !== 3) throw new Error('malformed jwt')
    const padded = parts[1].replace(/-/g, '+').replace(/_/g, '/') + '=='
    const claims = JSON.parse(atob(padded)) as Record<string, unknown>
    const issuerUrl = claims.iss as string
    if (!issuerUrl) throw new Error('no iss claim')

    const { payload } = await jwtVerify(token, getJWKS(issuerUrl), {
      algorithms: ['RS256'],
    })
    userId = payload.sub!
  } catch {
    return c.json({ error: 'Invalid token' }, 401)
  }

  // Upsert user on first seen — non-fatal if it fails
  try {
    const db = drizzle(c.env.DB)
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, userId))
      .get()

    if (!existing) {
      const res = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
        headers: { Authorization: `Bearer ${c.env.CLERK_SECRET_KEY}` },
      })
      const data = (await res.json()) as {
        email_addresses?: Array<{ email_address: string }>
      }
      const email = data.email_addresses?.[0]?.email_address ?? ''
      await db.insert(users).values({ id: userId, email }).onConflictDoNothing().run()
    }
  } catch {
    // Non-fatal — upsert failure does not block the request
  }

  c.set('userId', userId)
  return next()
})
