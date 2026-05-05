import { Hono } from 'hono'
import type { Env } from '../env'

const health = new Hono<{ Bindings: Env }>()

health.get('/health', c => c.json({ ok: true, version: '0.1.0' }))

export default health
