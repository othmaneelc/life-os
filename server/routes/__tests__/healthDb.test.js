import { describe, it, expect, vi, beforeEach } from 'vitest'
import express from 'express'
import request from 'supertest'

vi.mock('../../db/database.js', () => ({
  query: vi.fn((sql) => {
    if (sql.startsWith('SELECT name FROM sqlite_master')) {
      return [{ name: 'tasks' }, { name: 'habits' }, { name: 'settings' }]
    }
    if (sql.startsWith('PRAGMA table_info')) {
      return [{ name: 'id' }, { name: 'title' }]
    }
    return []
  }),
  run: vi.fn(),
  get: vi.fn(() => null),
  getDatabase: vi.fn(() => ({ pragma: () => [{ integrity_check: 'ok' }] })),
}))

vi.mock('../../services/logger.js', () => ({ default: { info: vi.fn(), error: vi.fn() }, info: vi.fn(), error: vi.fn() }))

const healthRouter = (await import('../healthDb.js')).default

function createApp() {
  const app = express()
  app.use('/api/health/db', healthRouter)
  return app
}

describe('DB Health Route', () => {
  it('returns healthy status when all tables are fine', async () => {
    const app = createApp()
    const res = await request(app).get('/api/health/db')
    expect(res.status).toBe(200)
    expect(res.body.status).toBeDefined()
    expect(res.body.tables).toBeGreaterThanOrEqual(0)
    expect(res.body.timestamp).toBeDefined()
  })

  it('returns integrity_check result', async () => {
    const app = createApp()
    const res = await request(app).get('/api/health/db')
    expect(res.status).toBe(200)
    expect(res.body.integrity_check).toBeDefined()
  })
})
