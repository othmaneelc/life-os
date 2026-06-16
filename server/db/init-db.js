const path = require('path')
const fs = require('fs')

const dataDir = path.join(__dirname, '../../data')
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })
const dbPath = path.join(dataDir, 'lifeos.db')
if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath)

// Re-create by running migrations against a fresh db
const { runMigrations } = require('./migrations')
runMigrations()

console.log('Fresh database created at:', dbPath)
