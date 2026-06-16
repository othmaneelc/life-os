const express = require('express')
const { handleError } = require('../middleware/errorHandler')
const { v4: uuidv4 } = require('uuid')
const { query, run, get } = require('../db/database')

const router = express.Router()

// Recalculate budget spending from transactions for a given month/year
function recalculateBudgetSpending(month, year) {
  const m = month.padStart(2, '0')
  const y = year
  // Get all expenses for the month grouped by category
  const expenses = query(`
    SELECT category, SUM(amount) as spent
    FROM finance_transactions
    WHERE type='expense' AND strftime('%m', date) = ? AND strftime('%Y', date) = ?
    GROUP BY category`, [m, y])

  // Map category names to budget category IDs
  const categories = query('SELECT id, name FROM budget_categories WHERE active = 1')
  const nameToId = {}
  categories.forEach(c => { nameToId[c.name] = c.id })

  // Upsert spending for each category
  for (const exp of expenses) {
    const catId = nameToId[exp.category]
    if (!catId) continue
    const existing = get('SELECT id FROM budget_spending WHERE category_id = ? AND month = ? AND year = ?', [catId, m, parseInt(y)])
    if (existing) {
      run('UPDATE budget_spending SET spent = ? WHERE id = ?', [exp.spent, existing.id])
    } else {
      run('INSERT INTO budget_spending (id, category_id, month, year, spent, alerted) VALUES (?, ?, ?, ?, ?, 0)',
        [uuidv4(), catId, m, parseInt(y), exp.spent])
    }
  }
}

// Transactions
router.get('/transactions', (req, res) => {
  try {
    const { month, year, type, is_personal, page: pageStr, limit: limitStr } = req.query
    let sql = 'SELECT * FROM finance_transactions WHERE 1=1'
    const params = []
    if (month && year) {
      sql += ` AND strftime('%m', date) = ? AND strftime('%Y', date) = ?`
      params.push(month.padStart(2, '0'), year)
    }
    if (type) { sql += ` AND type = ?`; params.push(type) }
    if (is_personal !== undefined) { sql += ` AND is_personal = ?`; params.push(parseInt(is_personal)) }
    sql += ' ORDER BY date DESC'
    if (pageStr) {
      const page = Math.max(1, parseInt(pageStr) || 1)
      const limit = Math.min(200, Math.max(1, parseInt(limitStr) || 50))
      const offset = (page - 1) * limit
      let countSql = 'SELECT COUNT(*) as count FROM finance_transactions WHERE 1=1'
      const countParams = [...params]
      if (month && year) { countSql += ` AND strftime('%m', date) = ? AND strftime('%Y', date) = ?` }
      if (type) { countSql += ` AND type = ?` }
      if (is_personal !== undefined) { countSql += ` AND is_personal = ?` }
      const total = get(countSql, [...countParams]).count
      const data = query(sql + ' LIMIT ? OFFSET ?', [...params, limit, offset])
      return res.json({ data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } })
    }
    res.json(query(sql, params))
  } catch (err) { handleError(res, err) }
})

router.post('/transactions', (req, res) => {
  try {
    const { date, type, category, amount, description, client, is_personal } = req.body
    const validTypes = ['income', 'expense']
    if (!type || !validTypes.includes(type)) return res.status(400).json({ error: 'type must be income or expense' })
    if (amount === undefined || amount === null || isNaN(amount) || Number(amount) < 0) return res.status(400).json({ error: 'amount must be a non-negative number' })
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'date must be YYYY-MM-DD format' })
    const id = uuidv4()
    run(`INSERT INTO finance_transactions (id, date, type, category, amount, description, client, is_personal)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, date, type, category || 'Other', Number(amount), description || '', client || null, is_personal ? 1 : 0])
    // Recalculate budget spending
    if (type === 'expense' && date) {
      const [y, m] = date.split('-')
      recalculateBudgetSpending(m, y)
    }
    res.json(get('SELECT * FROM finance_transactions WHERE id = ?', [id]))
  } catch (err) { handleError(res, err) }
})

router.put('/transactions/:id', (req, res) => {
  try {
    const { date, type, category, amount, description, client, is_personal } = req.body
    const validTypes = ['income', 'expense']
    if (type && !validTypes.includes(type)) return res.status(400).json({ error: 'type must be income or expense' })
    if (amount !== undefined && amount !== null && (isNaN(amount) || Number(amount) < 0)) return res.status(400).json({ error: 'amount must be a non-negative number' })
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Invalid date format (expected YYYY-MM-DD)' })
    }
    run(`UPDATE finance_transactions SET date=COALESCE(?,date), type=COALESCE(?,type), category=COALESCE(?,category), amount=COALESCE(?,amount), description=COALESCE(?,description), client=COALESCE(?,client), is_personal=COALESCE(?,is_personal) WHERE id=?`,
      [date ?? null, type ?? null, category ?? null, amount ?? null, description ?? null, client ?? null, is_personal !== undefined ? (is_personal ? 1 : 0) : null, req.params.id])
    // Recalculate budget spending for affected months
    if (type === 'expense' && date) {
      const [y, m] = date.split('-')
      recalculateBudgetSpending(m, y)
    }
    res.json(get('SELECT * FROM finance_transactions WHERE id = ?', [req.params.id]))
  } catch (err) { handleError(res, err) }
})

router.delete('/transactions/:id', (req, res) => {
  try {
    const old = get('SELECT date, type FROM finance_transactions WHERE id = ?', [req.params.id])
    run('DELETE FROM finance_transactions WHERE id = ?', [req.params.id])
    // Recalculate budget spending for affected month
    if (old && old.type === 'expense' && old.date) {
      const [y, m] = old.date.split('-')
      recalculateBudgetSpending(m, y)
    }
    res.json({ success: true })
  } catch (err) { handleError(res, err) }
})

// Budget categories
router.get('/budgets', (req, res) => {
  try {
    const { month, year } = req.query
    const categories = query('SELECT * FROM budget_categories WHERE active = 1 ORDER BY name')
    if (month && year) {
      const spending = query(`SELECT category_id, spent, alerted FROM budget_spending WHERE month = ? AND year = ?`,
        [month.padStart(2, '0'), parseInt(year)])
      const spendingMap = {}
      spending.forEach(s => { spendingMap[s.category_id] = s })
      categories.forEach(c => {
        c.spent = spendingMap[c.id]?.spent || 0
        c.alerted = spendingMap[c.id]?.alerted || 0
      })
    }
    res.json(categories)
  } catch (err) { handleError(res, err) }
})

router.post('/budgets', (req, res) => {
  try {
    const { id, name, monthly_limit, color, icon } = req.body
    if (id) {
      run('UPDATE budget_categories SET name=?, monthly_limit=?, color=?, icon=? WHERE id=?',
        [name, monthly_limit, color || '#0071E3', icon || '', id])
    } else {
      const newId = uuidv4()
      run('INSERT INTO budget_categories (id, name, monthly_limit, color, icon) VALUES (?, ?, ?, ?, ?)',
        [newId, name, monthly_limit, color || '#0071E3', icon || ''])
    }
    res.json({ success: true })
  } catch (err) { handleError(res, err) }
})

router.delete('/budgets/:id', (req, res) => {
  try {
    run('UPDATE budget_categories SET active = 0 WHERE id = ?', [req.params.id])
    res.json({ success: true })
  } catch (err) { handleError(res, err) }
})

// Reports
router.get('/reports', (req, res) => {
  try {
    const { start, end } = req.query
    const rows = query(`
      SELECT strftime('%Y-%m', date) as month,
             SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as income,
             SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as expense,
             SUM(CASE WHEN type='income' THEN amount ELSE 0 END) - SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as net
      FROM finance_transactions
      WHERE date >= ? AND date <= ?
      GROUP BY strftime('%Y-%m', date)
      ORDER BY month`, [start, end])
    res.json(rows)
  } catch (err) { handleError(res, err) }
})

// Summary
router.get('/summary', (req, res) => {
  try {
    const { month, year } = req.query
    const m = month ? month.padStart(2, '0') : String(new Date().getMonth() + 1).padStart(2, '0')
    const y = year || String(new Date().getFullYear())
    const totalIncome = get(`SELECT COALESCE(SUM(amount), 0) as total FROM finance_transactions WHERE type='income' AND strftime('%m', date) = ? AND strftime('%Y', date) = ?`, [m, y])
    const totalExpense = get(`SELECT COALESCE(SUM(amount), 0) as total FROM finance_transactions WHERE type='expense' AND strftime('%m', date) = ? AND strftime('%Y', date) = ?`, [m, y])
    const agencyExpense = get(`SELECT COALESCE(SUM(amount), 0) as total FROM finance_transactions WHERE type='expense' AND is_personal=0 AND strftime('%m', date) = ? AND strftime('%Y', date) = ?`, [m, y])
    const personalExpense = get(`SELECT COALESCE(SUM(amount), 0) as total FROM finance_transactions WHERE type='expense' AND is_personal=1 AND strftime('%m', date) = ? AND strftime('%Y', date) = ?`, [m, y])

    const categories = query('SELECT id, name, monthly_limit, color FROM budget_categories WHERE active = 1')
    const spending = query(`SELECT category_id, spent FROM budget_spending WHERE month = ? AND year = ?`, [m, parseInt(y)])
    const spendingMap = {}
    spending.forEach(s => { spendingMap[s.category_id] = s.spent })

    const budgetAlerts = categories.map(c => ({
      id: c.id,
      name: c.name,
      limit: c.monthly_limit,
      spent: spendingMap[c.id] || 0,
      pct: c.monthly_limit > 0 ? Math.round(((spendingMap[c.id] || 0) / c.monthly_limit) * 100) : 0,
      color: c.color,
    }))

    res.json({
      totalIncome: totalIncome.total,
      totalExpense: totalExpense.total,
      net: totalIncome.total - totalExpense.total,
      agencyExpense: agencyExpense.total,
      personalExpense: personalExpense.total,
      budgetAlerts,
    })
  } catch (err) { handleError(res, err) }
})

// Debts / Loans
router.get('/debts', (req, res) => {
  try {
    res.json(query('SELECT * FROM debts ORDER BY created_at DESC'))
  } catch (err) { handleError(res, err) }
})

router.post('/debts', (req, res) => {
  try {
    const { type, person_name, amount, remaining, interest_rate, due_date, status, description } = req.body
    const validTypes = ['lent', 'borrowed']
    if (!type || !validTypes.includes(type)) return res.status(400).json({ error: 'type must be lent or borrowed' })
    if (amount === undefined || amount === null || isNaN(amount) || Number(amount) <= 0) return res.status(400).json({ error: 'amount must be a positive number' })
    if (!person_name || !person_name.trim()) return res.status(400).json({ error: 'person_name is required' })
    const id = uuidv4()
    run(`INSERT INTO debts (id, type, person_name, amount, remaining, interest_rate, due_date, status, description)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, type, person_name.trim(), Number(amount), remaining !== undefined ? Number(remaining) : Number(amount), Number(interest_rate || 0), due_date || null, status || 'active', description || null])
    res.json(get('SELECT * FROM debts WHERE id = ?', [id]))
  } catch (err) { handleError(res, err) }
})

router.put('/debts/:id', (req, res) => {
  try {
    const fields = []
    const params = []
    const allowed = ['type', 'person_name', 'amount', 'remaining', 'interest_rate', 'due_date', 'status', 'description']
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        if (key === 'type') {
          if (!['lent', 'borrowed'].includes(req.body[key])) return res.status(400).json({ error: 'type must be lent or borrowed' })
        }
        fields.push(`${key} = ?`)
        params.push(req.body[key])
      }
    }
    fields.push("updated_at = datetime('now')")
    params.push(req.params.id)
    run(`UPDATE debts SET ${fields.join(', ')} WHERE id = ?`, params)
    res.json(get('SELECT * FROM debts WHERE id = ?', [req.params.id]))
  } catch (err) { handleError(res, err) }
})

router.delete('/debts/:id', (req, res) => {
  try {
    run('DELETE FROM debts WHERE id = ?', [req.params.id])
    res.json({ success: true })
  } catch (err) { handleError(res, err) }
})

module.exports = router
