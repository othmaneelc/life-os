import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import express from 'express'
import request from 'supertest'

import { runMigrations } from '../../db/migrations.js'
import { run, get, query } from '../../db/database.js'

const habitsRouter = (await import('../habits.js')).default

function createApp() {
  const app = express()
  app.use(express.json())
  app.use('/api/habits', habitsRouter)
  return app
}

describe('Habits Routes', () => {
  let app

  beforeAll(() => {
    runMigrations()
    app = createApp()
  })

  afterAll(() => {
    run("DELETE FROM habit_logs")
    run("DELETE FROM habits")
  })

  describe('POST /api/habits', () => {
    it('creates a habit', async () => {
      const res = await request(app).post('/api/habits').send({ name: 'Exercise', category: 'health', frequency: 'daily' })
      expect(res.status).toBe(200)
      expect(res.body.name).toBe('Exercise')
      expect(res.body.active).toBe(1)
      expect(res.body.id).toBeDefined()
    })

    it('rejects empty name', async () => {
      const res = await request(app).post('/api/habits').send({ name: '' })
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('name is required')
    })
  })

  describe('GET /api/habits', () => {
    it('returns active habits', async () => {
      await request(app).post('/api/habits').send({ name: 'Reading', category: 'mind', frequency: 'daily' })
      const res = await request(app).get('/api/habits')
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
      expect(res.body.some(h => h.name === 'Exercise')).toBe(true)
    })

    it('excludes inactive habits', async () => {
      run("UPDATE habits SET active = 0 WHERE name = 'Reading'")
      const res = await request(app).get('/api/habits')
      expect(res.body.every(h => h.active === 1)).toBe(true)
      expect(res.body.some(h => h.name === 'Reading')).toBe(false)
    })
  })

  describe('GET /api/habits/today', () => {
    it('returns habits with today log status', async () => {
      const res = await request(app).get('/api/habits/today')
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
    })
  })

  describe('GET /api/habits/week', () => {
    it('returns week data', async () => {
      const res = await request(app).get('/api/habits/week')
      expect(res.status).toBe(200)
      expect(res.body.start).toBeDefined()
      expect(res.body.end).toBeDefined()
      expect(Array.isArray(res.body.habits)).toBe(true)
    })
  })

  describe('POST /api/habits/log', () => {
    it('logs a habit as done', async () => {
      const habits = query("SELECT * FROM habits WHERE name = 'Exercise'")
      const res = await request(app).post('/api/habits/log').send({ habit_id: habits[0].id, date: new Date().toISOString().split('T')[0], done: true })
      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
    })

    it('updates existing log', async () => {
      const habits = query("SELECT * FROM habits WHERE name = 'Exercise'")
      const res = await request(app).post('/api/habits/log').send({ habit_id: habits[0].id, date: new Date().toISOString().split('T')[0], done: false })
      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
    })
  })

  describe('GET /api/habits/stats', () => {
    it('returns habit statistics', async () => {
      const res = await request(app).get('/api/habits/stats')
      expect(res.status).toBe(200)
      expect(res.body.weekCompletion).toBeDefined()
      expect(res.body.bestStreak).toBeDefined()
      expect(res.body.needsAttention).toBeDefined()
      expect(res.body.perfectDays).toBeDefined()
    })
  })

  describe('PUT /api/habits/:id', () => {
    it('updates a habit', async () => {
      const habits = query("SELECT * FROM habits WHERE name = 'Exercise'")
      const res = await request(app).put(`/api/habits/${habits[0].id}`).send({ name: 'Daily Exercise', category: 'fitness' })
      expect(res.status).toBe(200)
      expect(res.body.name).toBe('Daily Exercise')
      expect(res.body.category).toBe('fitness')
    })
  })

  describe('DELETE /api/habits/:id', () => {
    it('soft-deletes a habit', async () => {
      const habits = query("SELECT * FROM habits WHERE name = 'Daily Exercise'")
      const res = await request(app).delete(`/api/habits/${habits[0].id}`)
      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      const deleted = get("SELECT active FROM habits WHERE id = ?", [habits[0].id])
      expect(deleted.active).toBe(0)
    })
  })
})
