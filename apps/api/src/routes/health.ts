import { Hono } from 'hono'

const health = new Hono()

health.get('/health', (c) => c.json({ ok: true, version: '0.1.0' }))

export default health
