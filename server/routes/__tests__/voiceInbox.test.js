import { describe, it, expect, vi, beforeAll } from 'vitest'
import express from 'express'
import request from 'supertest'

vi.mock('../../services/logger.js', () => ({ default: { info: () => {}, error: () => {}, warn: () => {}, fatal: () => {} }, info: () => {}, error: () => {}, warn: () => {}, fatal: () => {} }))
vi.mock('uuid', () => ({ v4: () => 'mock-uuid-voice' }))

import { runMigrations } from '../../db/migrations.js'
import { run, get } from '../../db/database.js'

const voiceRouter = (await import('../voiceInbox.js')).default

function createApp() {
  const app = express()
  app.use(express.json())
  app.use('/api/voice', voiceRouter)
  return app
}

describe('Voice Inbox Routes', () => {
  let app

  beforeAll(() => {
    runMigrations()
    app = createApp()
  })

  describe('POST /api/voice/inbox', () => {
    it('returns 400 if no audio file provided', async () => {
      const res = await request(app).post('/api/voice/inbox').send({})
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('No audio provided')
    })
  })

  describe('POST /api/voice/inbox/:id/execute', () => {
    it('returns 404 for non-existent item', async () => {
      const res = await request(app).post('/api/voice/inbox/nonexistent/execute')
      expect(res.status).toBe(404)
      expect(res.body.error).toBe('Item not found or already processed')
    })

    it('executes actions for valid inbox item', async () => {
      run(`INSERT OR IGNORE INTO voice_inbox (id, transcript, actions_json, natural_summary, status) VALUES (?, ?, ?, ?, 'pending')`,
        ['mock-uuid-voice-exec', 'test', JSON.stringify([{ action: 'create_task', params: { title: 'Voice task', priority: 'medium' } }]), 'test'])

      const res = await request(app).post('/api/voice/inbox/mock-uuid-voice-exec/execute')
      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.results).toHaveLength(1)
      expect(res.body.results[0].success).toBe(true)
      expect(res.body.results[0].action).toBe('create_task')
    })
  })

  describe('DELETE /api/voice/inbox/:id', () => {
    it('returns 404 for non-existent item', async () => {
      const res = await request(app).delete('/api/voice/inbox/nonexistent')
      expect(res.status).toBe(404)
    })

    it('discards a pending item', async () => {
      run(`INSERT OR IGNORE INTO voice_inbox (id, transcript, actions_json, natural_summary, status) VALUES (?, ?, ?, ?, 'pending')`,
        ['mock-uuid-voice-discard', 'test', '[]', 'test'])

      const res = await request(app).delete('/api/voice/inbox/mock-uuid-voice-discard')
      expect(res.status).toBe(200)
      expect(res.body.discarded).toBe(true)

      const row = get("SELECT status FROM voice_inbox WHERE id = ?", ['mock-uuid-voice-discard'])
      expect(row.status).toBe('discarded')
    })
  })
})
