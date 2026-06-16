const express = require('express')
const { handleError } = require('../middleware/errorHandler')
const { v4: uuidv4 } = require('uuid')
const { query, run } = require('../db/database')
const logger = require('../services/logger')

const router = express.Router()

const DAY_NAMES = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

function getDayName(date) {
  const d = new Date(date + 'T12:00:00')
  return DAY_NAMES[d.getDay()]
}

router.post('/generate', (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0]
    const blocks = query("SELECT id, title, start_time, end_time, day_of_week, date, block_type, color FROM schedule_blocks ORDER BY sort_order")
    const generated = []

    for (const block of blocks) {
      const applicableDates = []

      if (block.date) {
        if (block.date >= today) applicableDates.push(block.date)
      } else if (block.day_of_week && block.day_of_week !== 'all') {
        for (let i = 0; i < 14; i++) {
          const d = new Date(Date.now() + i * 86400000)
          const dayStr = d.toISOString().split('T')[0]
          if (getDayName(dayStr) === block.day_of_week.toLowerCase()) {
            applicableDates.push(dayStr)
          }
        }
      }

      for (const date of applicableDates) {
        const existing = query(
          "SELECT id FROM tasks WHERE title = ? AND due_date = ? AND category = 'schedule'",
          [block.title, date]
        )
        if (existing.length === 0) {
          const id = uuidv4()
          run(`INSERT INTO tasks (id, title, category, priority, status, due_date, sort_order)
            VALUES (?, ?, 'schedule', 'medium', 'todo', ?, COALESCE((SELECT MAX(sort_order) FROM tasks), 0) + 1)`,
            [id, block.title, date])
          generated.push({ id, title: block.title, date })
        }
      }
    }

    logger.info({ generated: generated.length }, 'Chores generated')
    res.json({ generated: generated.length, tasks: generated })
  } catch (err) { handleError(res, err) }
})

module.exports = router
