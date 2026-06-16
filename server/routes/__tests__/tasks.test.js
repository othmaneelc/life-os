import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import express from 'express'
import request from 'supertest'

import { runMigrations } from '../../db/migrations.js'
import { run, get, query } from '../../db/database.js'

const tasksRouter = (await import('../tasks.js')).default

function createApp() {
  const app = express()
  app.use(express.json())
  app.use('/api/tasks', tasksRouter)
  return app
}

describe('Tasks Routes', () => {
  let app

  beforeAll(() => {
    runMigrations()
    app = createApp()
  })

  afterAll(() => {
    run("DELETE FROM tasks")
  })

  describe('GET /api/tasks', () => {
    it('returns empty array when no tasks', async () => {
      run("DELETE FROM tasks")
      const res = await request(app).get('/api/tasks')
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
      expect(res.body.length).toBe(0)
    })

    it('returns all active tasks', async () => {
      run("DELETE FROM tasks")
      run("INSERT INTO tasks (id, title, category, priority, status, created_at) VALUES (?, ?, ?, ?, ?, datetime('now'))", ['task-1', 'Test task 1', 'business', 'high', 'todo'])
      run("INSERT INTO tasks (id, title, category, priority, status, created_at) VALUES (?, ?, ?, ?, ?, datetime('now'))", ['task-2', 'Test task 2', 'personal', 'medium', 'inprogress'])

      const res = await request(app).get('/api/tasks')
      expect(res.status).toBe(200)
      expect(res.body.length).toBe(2)
    })

    it('excludes deleted tasks', async () => {
      run("UPDATE tasks SET deleted_at = datetime('now') WHERE id = 'task-2'")
      const res = await request(app).get('/api/tasks')
      expect(res.status).toBe(200)
      expect(res.body.length).toBe(1)
      expect(res.body[0].id).toBe('task-1')
    })

    it('filters by category', async () => {
      run("UPDATE tasks SET deleted_at = NULL WHERE id = 'task-2'")
      const res = await request(app).get('/api/tasks?category=personal')
      expect(res.status).toBe(200)
      expect(res.body.length).toBe(1)
      expect(res.body[0].category).toBe('personal')
    })

    it('filters by status', async () => {
      const res = await request(app).get('/api/tasks?status=inprogress')
      expect(res.status).toBe(200)
      expect(res.body.length).toBe(1)
      expect(res.body[0].status).toBe('inprogress')
    })

    it('returns paginated results', async () => {
      for (let i = 0; i < 15; i++) {
        run("INSERT INTO tasks (id, title, category, priority, status, created_at) VALUES (?, ?, ?, ?, ?, datetime('now'))", ['task-page-' + i, 'Page task ' + i, 'business', 'low', 'todo'])
      }
      const res = await request(app).get('/api/tasks?page=1&limit=5')
      expect(res.status).toBe(200)
      expect(res.body.data).toBeDefined()
      expect(res.body.pagination).toBeDefined()
      expect(res.body.data.length).toBeLessThanOrEqual(5)
      expect(res.body.pagination.total).toBeGreaterThanOrEqual(15)
    })
  })

  describe('POST /api/tasks', () => {
    it('creates a task with required fields', async () => {
      const res = await request(app).post('/api/tasks').send({ title: 'New task' })
      expect(res.status).toBe(200)
      expect(res.body.title).toBe('New task')
      expect(res.body.category).toBe('business')
      expect(res.body.priority).toBe('medium')
      expect(res.body.status).toBe('todo')
      expect(res.body.id).toBeDefined()
    })

    it('creates a task with all fields', async () => {
      const res = await request(app).post('/api/tasks').send({
        title: 'Full task',
        category: 'urgent',
        priority: 'high',
        status: 'inprogress',
        due_date: '2026-12-31',
        notes: 'Some notes',
        tag: 'important',
        is_top_priority: true
      })
      expect(res.status).toBe(200)
      expect(res.body.title).toBe('Full task')
      expect(res.body.category).toBe('urgent')
      expect(res.body.priority).toBe('high')
      expect(res.body.notes).toBe('Some notes')
      expect(res.body.is_top_priority).toBe(1)
    })

    it('rejects empty title', async () => {
      const res = await request(app).post('/api/tasks').send({ title: '' })
      expect(res.status).toBe(422)
    })

    it('rejects invalid category', async () => {
      const res = await request(app).post('/api/tasks').send({ title: 'Bad cat', category: 'invalid' })
      expect(res.status).toBe(422)
    })

    it('rejects invalid priority', async () => {
      const res = await request(app).post('/api/tasks').send({ title: 'Bad prio', priority: 'super' })
      expect(res.status).toBe(422)
    })
  })

  describe('PUT /api/tasks/:id', () => {
    it('updates task fields', async () => {
      const res = await request(app).put('/api/tasks/task-1').send({ title: 'Updated title', priority: 'low' })
      expect(res.status).toBe(200)
      expect(res.body.title).toBe('Updated title')
      expect(res.body.priority).toBe('low')
    })

    it('sets completed_at when status is done', async () => {
      const res = await request(app).put('/api/tasks/task-1').send({ status: 'done' })
      expect(res.status).toBe(200)
      expect(res.body.status).toBe('done')
      expect(res.body.completed_at).toBeTruthy()
    })

    it('clears completed_at when status changes from done', async () => {
      await request(app).put('/api/tasks/task-1').send({ status: 'inprogress' })
      const res = await request(app).get('/api/tasks')
      const task = res.body.find(t => t.id === 'task-1')
      expect(task.completed_at).toBeNull()
    })
  })

  describe('DELETE /api/tasks/:id', () => {
    it('soft-deletes a task', async () => {
      const res = await request(app).delete('/api/tasks/task-1')
      expect(res.status).toBe(200)
      expect(res.body.deleted_at).toBeTruthy()
    })

    it('returns 404 for non-existent task', async () => {
      const res = await request(app).delete('/api/tasks/nonexistent')
      expect(res.status).toBe(404)
    })
  })

  describe('POST /api/tasks/:id/restore', () => {
    it('restores a soft-deleted task', async () => {
      const res = await request(app).post('/api/tasks/task-1/restore')
      expect(res.status).toBe(200)
      expect(res.body.deleted_at).toBeNull()
    })
  })

  describe('POST /api/tasks/reorder', () => {
    it('reorders tasks', async () => {
      const res = await request(app).post('/api/tasks/reorder').send({ ids: ['task-1', 'task-2'] })
      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
    })

    it('rejects non-array ids', async () => {
      const res = await request(app).post('/api/tasks/reorder').send({ ids: 'not-array' })
      expect(res.status).toBe(400)
    })
  })
})
