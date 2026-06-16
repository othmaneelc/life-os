const express = require('express')
const { handleError } = require('../middleware/errorHandler')
const { v4: uuidv4 } = require('uuid')
const { query, run, get } = require('../db/database')
const { validate } = require('../middleware/validate')

const router = express.Router()

// Goals
router.get('/', (req, res) => {
  try {
    const goals = query('SELECT * FROM goals WHERE active = 1 ORDER BY sort_order')
    if (!goals.length) return res.json([])
    const ids = goals.map(g => g.id)
    const placeholders = ids.map(() => '?').join(',')
    const steps = query(`SELECT * FROM goal_steps WHERE goal_id IN (${placeholders}) ORDER BY sort_order`, ids)
    const habitLinks = query(`SELECT * FROM goal_habits WHERE goal_id IN (${placeholders}) ORDER BY goal_id`, ids)
    const byGoal = {}
    goals.forEach(g => {
      byGoal[g.id] = { ...g, steps: [], habit_ids: [] }
    })
    steps.forEach(s => { byGoal[s.goal_id]?.steps.push(s) })
    habitLinks.forEach(h => { byGoal[h.goal_id]?.habit_ids.push(h.habit_id) })
    // Calculate progress
    Object.values(byGoal).forEach(g => {
      const done = g.steps.filter(s => s.done).length
      g.progress = g.steps.length > 0 ? Math.round((done / g.steps.length) * 100) : 0
      g.done_steps = done
      g.total_steps = g.steps.length
    })
    res.json(Object.values(byGoal))
  } catch (err) { handleError(res, err) }
})

router.post('/', validate({
  title: [{ required: true }, { type: 'string' }, { minLength: 1 }, { maxLength: 300 }],
  timeframe: [{ oneOf: ['monthly', 'quarterly', 'yearly'] }],
}), (req, res) => {
  try {
    const { title, description, timeframe, target_date, category, color } = req.body
    const id = uuidv4()
    const maxOrder = get('SELECT MAX(sort_order) as max FROM goals')
    run('INSERT INTO goals (id, title, description, timeframe, target_date, category, color, sort_order) VALUES (?,?,?,?,?,?,?,?)',
      [id, title, description || '', timeframe || 'monthly', target_date || null, category || null, color || '#0071E3', (maxOrder?.max || 0) + 1])
    res.json(get('SELECT * FROM goals WHERE id = ?', [id]))
  } catch (err) { handleError(res, err) }
})

router.put('/:id', (req, res) => {
  try {
    const { title, description, timeframe, target_date, category, color } = req.body
    run(`UPDATE goals SET title=COALESCE(?,title), description=COALESCE(?,description), timeframe=COALESCE(?,timeframe), target_date=COALESCE(?,target_date), category=COALESCE(?,category), color=COALESCE(?,color) WHERE id=?`,
      [title, description, timeframe, target_date, category, color, req.params.id])
    res.json(get('SELECT * FROM goals WHERE id = ?', [req.params.id]))
  } catch (err) { handleError(res, err) }
})

router.delete('/:id', (req, res) => {
  try {
    run('UPDATE goals SET active = 0 WHERE id = ?', [req.params.id])
    run('UPDATE goal_steps SET active = 0 WHERE goal_id = ?', [req.params.id])
    run('DELETE FROM goal_habits WHERE goal_id = ?', [req.params.id])
    res.json({ success: true })
  } catch (err) { handleError(res, err) }
})

// Steps
router.post('/:goalId/steps', validate({
  title: [{ required: true }, { type: 'string' }, { minLength: 1 }],
}), (req, res) => {
  try {
    const { title } = req.body
    const id = uuidv4()
    const maxOrder = get('SELECT MAX(sort_order) as max FROM goal_steps WHERE goal_id = ?', [req.params.goalId])
    run('INSERT INTO goal_steps (id, goal_id, title, sort_order) VALUES (?,?,?,?)',
      [id, req.params.goalId, title, (maxOrder?.max || 0) + 1])
    res.json(get('SELECT * FROM goal_steps WHERE id = ?', [id]))
  } catch (err) { handleError(res, err) }
})

router.put('/:goalId/steps/:id', (req, res) => {
  try {
    run('UPDATE goal_steps SET done = CASE WHEN done = 1 THEN 0 ELSE 1 END WHERE id = ?', [req.params.id])
    res.json(get('SELECT * FROM goal_steps WHERE id = ?', [req.params.id]))
  } catch (err) { handleError(res, err) }
})

router.delete('/:goalId/steps/:id', (req, res) => {
  try {
    run('DELETE FROM goal_steps WHERE id = ?', [req.params.id])
    res.json({ success: true })
  } catch (err) { handleError(res, err) }
})

// Habit links
router.post('/:goalId/habits', (req, res) => {
  try {
    const { habit_id } = req.body
    const id = uuidv4()
    run('INSERT INTO goal_habits (id, goal_id, habit_id) VALUES (?,?,?)', [id, req.params.goalId, habit_id])
    res.json({ success: true, id })
  } catch (err) { handleError(res, err) }
})

router.delete('/:goalId/habits/:habitId', (req, res) => {
  try {
    run('DELETE FROM goal_habits WHERE goal_id = ? AND habit_id = ?', [req.params.goalId, req.params.habitId])
    res.json({ success: true })
  } catch (err) { handleError(res, err) }
})

module.exports = router
