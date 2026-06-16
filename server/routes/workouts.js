const express = require('express')
const { handleError } = require('../middleware/errorHandler')
const { v4: uuidv4 } = require('uuid')
const { query, run, get } = require('../db/database')

const router = express.Router()

router.get('/', (req, res) => {
  try {
    const workouts = query('SELECT * FROM workouts ORDER BY date DESC')
    const counts = query('SELECT workout_id, COUNT(*) as count FROM workout_exercises GROUP BY workout_id')
    const countMap = {}
    counts.forEach(c => { countMap[c.workout_id] = c.count })
    workouts.forEach(w => { w.exercise_count = countMap[w.id] || 0 })
    res.json(workouts)
  } catch (err) { handleError(res, err) }
})

router.post('/', (req, res) => {
  try {
    const { date, name, duration_min, notes, exercises } = req.body
    if (!date || !name) return res.status(400).json({ error: 'date and name are required' })
    const id = uuidv4()
    run('INSERT INTO workouts (id, date, name, duration_min, notes) VALUES (?,?,?,?,?)',
      [id, date, name, duration_min || null, notes || null])
    if (Array.isArray(exercises)) {
      exercises.forEach((ex, i) => {
        const exId = uuidv4()
        run('INSERT INTO workout_exercises (id, workout_id, exercise_name, sets, reps, weight_kg, notes, sort_order) VALUES (?,?,?,?,?,?,?,?)',
          [exId, id, ex.exercise_name, ex.sets || 0, ex.reps || 0, ex.weight_kg || 0, ex.notes || null, i])
      })
    }
    const workout = get('SELECT * FROM workouts WHERE id = ?', [id])
    workout.exercises = query('SELECT * FROM workout_exercises WHERE workout_id = ? ORDER BY sort_order', [id])
    workout.exercise_count = workout.exercises.length
    res.json(workout)
  } catch (err) { handleError(res, err) }
})

router.get('/:id', (req, res) => {
  try {
    const workout = get('SELECT * FROM workouts WHERE id = ?', [req.params.id])
    if (!workout) return res.status(404).json({ error: 'Not found' })
    workout.exercises = query('SELECT * FROM workout_exercises WHERE workout_id = ? ORDER BY sort_order', [req.params.id])
    res.json(workout)
  } catch (err) { handleError(res, err) }
})

router.put('/:id', (req, res) => {
  try {
    const { date, name, duration_min, notes, exercises } = req.body
    run(`UPDATE workouts SET date=COALESCE(?,date), name=COALESCE(?,name), duration_min=?, notes=? WHERE id=?`,
      [date, name, duration_min ?? null, notes ?? null, req.params.id])
    if (Array.isArray(exercises)) {
      run('DELETE FROM workout_exercises WHERE workout_id = ?', [req.params.id])
      exercises.forEach((ex, i) => {
        const exId = uuidv4()
        run('INSERT INTO workout_exercises (id, workout_id, exercise_name, sets, reps, weight_kg, notes, sort_order) VALUES (?,?,?,?,?,?,?,?)',
          [exId, req.params.id, ex.exercise_name, ex.sets || 0, ex.reps || 0, ex.weight_kg || 0, ex.notes || null, i])
      })
    }
    const workout = get('SELECT * FROM workouts WHERE id = ?', [req.params.id])
    workout.exercises = query('SELECT * FROM workout_exercises WHERE workout_id = ? ORDER BY sort_order', [req.params.id])
    workout.exercise_count = workout.exercises.length
    res.json(workout)
  } catch (err) { handleError(res, err) }
})

router.delete('/:id', (req, res) => {
  try {
    run('DELETE FROM workout_exercises WHERE workout_id = ?', [req.params.id])
    run('DELETE FROM workouts WHERE id = ?', [req.params.id])
    res.json({ success: true })
  } catch (err) { handleError(res, err) }
})

module.exports = router
