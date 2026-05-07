import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { drizzle } from 'drizzle-orm/d1'
import { eq, desc } from 'drizzle-orm'
import type { Env } from '../env'
import { projects } from '../db/schema'
import { requireAuth, type AuthVariables } from '../middleware/auth'
import {
  CreateProjectBodySchema,
  UpdateProjectBodySchema,
  BulkCreateBodySchema,
} from '@mapnova/shared'

type HonoEnv = { Bindings: Env; Variables: AuthVariables }

const router = new Hono<HonoEnv>()

router.use('*', requireAuth)

// GET /api/projects — list current user's projects
router.get('/', async (c) => {
  const db = drizzle(c.env.DB)
  const userId = c.get('userId')

  const rows = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, userId))
    .orderBy(desc(projects.updatedAt))
    .all()

  return c.json({ projects: rows })
})

// POST /api/projects/bulk — bulk create (for localStorage migration on first sign-in)
router.post('/bulk', zValidator('json', BulkCreateBodySchema), async (c) => {
  const db = drizzle(c.env.DB)
  const userId = c.get('userId')
  const items = c.req.valid('json')
  const now = Math.floor(Date.now() / 1000)

  let inserted = 0
  for (const item of items) {
    const id =
      item.id && item.id.length > 0 ? item.id : crypto.randomUUID()
    const dataJson = JSON.stringify(
      item.data ?? { features: [], notes: '', settings: {} },
    )
    await db
      .insert(projects)
      .values({ id, userId, name: item.name, data: dataJson, createdAt: now, updatedAt: now })
      .onConflictDoNothing()
      .run()
    inserted++
  }

  return c.json({ inserted }, 201)
})

// POST /api/projects — create one
router.post('/', zValidator('json', CreateProjectBodySchema), async (c) => {
  const db = drizzle(c.env.DB)
  const userId = c.get('userId')
  const body = c.req.valid('json')

  const id = crypto.randomUUID()
  const dataJson = JSON.stringify(
    body.data ?? { features: [], notes: '', settings: {} },
  )
  const now = Math.floor(Date.now() / 1000)

  await db
    .insert(projects)
    .values({ id, userId, name: body.name, data: dataJson, createdAt: now, updatedAt: now })
    .run()

  const row = await db.select().from(projects).where(eq(projects.id, id)).get()

  return c.json({ project: row }, 201)
})

// GET /api/projects/:id
router.get('/:id', async (c) => {
  const db = drizzle(c.env.DB)
  const userId = c.get('userId')
  const id = c.req.param('id')

  const row = await db.select().from(projects).where(eq(projects.id, id)).get()

  if (!row) return c.json({ error: 'Not found' }, 404)
  if (row.userId !== userId) return c.json({ error: 'Forbidden' }, 403)

  return c.json({ project: row })
})

// PATCH /api/projects/:id
router.patch('/:id', zValidator('json', UpdateProjectBodySchema), async (c) => {
  const db = drizzle(c.env.DB)
  const userId = c.get('userId')
  const id = c.req.param('id')
  const body = c.req.valid('json')

  const row = await db.select().from(projects).where(eq(projects.id, id)).get()

  if (!row) return c.json({ error: 'Not found' }, 404)
  if (row.userId !== userId) return c.json({ error: 'Forbidden' }, 403)

  const updates: Partial<typeof projects.$inferInsert> = {
    updatedAt: Math.floor(Date.now() / 1000),
  }
  if (body.name !== undefined) updates.name = body.name
  if (body.data !== undefined) updates.data = JSON.stringify(body.data)

  await db.update(projects).set(updates).where(eq(projects.id, id)).run()

  const updated = await db.select().from(projects).where(eq(projects.id, id)).get()

  return c.json({ project: updated })
})

// DELETE /api/projects/:id
router.delete('/:id', async (c) => {
  const db = drizzle(c.env.DB)
  const userId = c.get('userId')
  const id = c.req.param('id')

  const row = await db.select().from(projects).where(eq(projects.id, id)).get()

  if (!row) return c.json({ error: 'Not found' }, 404)
  if (row.userId !== userId) return c.json({ error: 'Forbidden' }, 403)

  await db.delete(projects).where(eq(projects.id, id)).run()

  return c.json({ ok: true })
})

export default router
