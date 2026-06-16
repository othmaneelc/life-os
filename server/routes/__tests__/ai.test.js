import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import express from 'express'
import request from 'supertest'

vi.mock('../../services/logger.js', () => ({ default: { info: () => {}, error: () => {}, warn: () => {}, fatal: () => {} }, info: () => {}, error: () => {}, warn: () => {}, fatal: () => {} }))
vi.mock('uuid', () => ({ v4: () => 'mock-uuid-123' }))

import { runMigrations } from '../../db/migrations.js'
import { run } from '../../db/database.js'

runMigrations()
run("INSERT OR IGNORE INTO settings (key, value) VALUES ('groq_key', 'gsk_test123')")

const aiRouter = (await import('../ai.js')).default
const aiChatRouter = (await import('../ai-chat.js')).default

function createApp() {
  const app = express()
  app.use(express.json())
  app.use('/api/ai', aiRouter)
  app.use('/api/ai', aiChatRouter)
  return app
}

describe('AI Routes', () => {
  let app

  beforeEach(() => {
    app = createApp()
    vi.clearAllMocks()
  })

  describe('POST /api/ai/chat', () => {
    it('returns 400 if no message provided', async () => {
      const res = await request(app).post('/api/ai/chat').send({})
      expect(res.status).toBe(400)
    })
  })

  describe('POST /api/ai/suggestions', () => {
    it('returns suggestions array', async () => {
      const res = await request(app).post('/api/ai/suggestions').send({ view: '/dashboard' })
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body.suggestions)).toBe(true)
      expect(res.body.suggestions.length).toBeGreaterThan(0)
    })
  })
})
