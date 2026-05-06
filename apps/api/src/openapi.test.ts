import { describe, it, expect } from 'vitest'
import app from './index'

describe('GET /openapi.json', () => {
  it('returns valid spec with correct info.title', async () => {
    const res = await app.fetch(new Request('http://localhost/openapi.json'))
    expect(res.status).toBe(200)
    const spec = (await res.json()) as { info: { title: string }; openapi: string }
    expect(spec.info.title).toBe('Mapnova API')
    expect(spec.openapi).toBe('3.1.0')
  })
})
