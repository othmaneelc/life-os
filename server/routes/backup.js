const express = require('express')
const fs = require('fs')
const path = require('path')
const { query, run } = require('../db/database')

const router = express.Router()
const BACKUP_DIR = path.join(__dirname, '../../data/backups')

function ensureDir() {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true })
}

router.get('/list', (req, res) => {
  try {
    ensureDir()
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => {
        const stat = fs.statSync(path.join(BACKUP_DIR, f))
        return { name: f, size: stat.size, created: stat.birthtime }
      })
      .sort((a, b) => b.created - a.created)
    res.json(files)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/export', (req, res) => {
  try {
    ensureDir()
    const tables = query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'kb_fts%' ORDER BY name")
    const data = {}
    tables.forEach(t => { data[t.name] = query(`SELECT * FROM "${t.name}"`) })
    const filename = `lifeos-${new Date().toISOString().split('T')[0]}-${Date.now()}.json`
    fs.writeFileSync(path.join(BACKUP_DIR, filename), JSON.stringify(data, null, 2))
    res.json({ filename, tables: tables.map(t => t.name), count: Object.values(data).reduce((s, a) => s + a.length, 0) })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/restore/:filename', (req, res) => {
  try {
    ensureDir()
    const filePath = path.join(BACKUP_DIR, req.params.filename)
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Backup not found' })
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    const tables = Object.keys(data)
    const started = dbRunAll(tables, data)
    if (req.body?.createMissing !== false) ensureTables(tables)
    res.json({ restored: tables, count: started })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

function dbRunAll(tables, data) {
  let count = 0
  for (const table of tables) {
    const rows = data[table]
    if (!rows?.length) continue
    // Clear table
    run(`DELETE FROM "${table}"`)
    if (!rows[0]) continue
    const columns = Object.keys(rows[0])
    const placeholders = columns.map(() => '?').join(', ')
    for (const row of rows) {
      try {
        run(`INSERT INTO "${table}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders})`,
          columns.map(c => row[c] ?? null))
        count++
      } catch (e) {
        console.error(`Skipping row in ${table}: ${e.message}`)
      }
    }
  }
  return count
}

function ensureTables(tables) {
  const existing = query("SELECT name FROM sqlite_master WHERE type='table'").map(r => r.name)
  for (const table of tables) {
    if (!existing.includes(table) && table !== 'kb_fts') {
      const sample = (mig => mig ? mig.split('\n').find(l => l.includes('CREATE TABLE')) : null)(null)
      console.warn(`Table ${table} not found — restore may be partial`)
    }
  }
}

router.post('/import', (req, res) => {
  try {
    const data = req.body
    if (!data || typeof data !== 'object') return res.status(400).json({ error: 'Invalid data' })
    const started = dbRunAll(Object.keys(data), data)
    res.json({ imported: Object.keys(data), count: started })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
