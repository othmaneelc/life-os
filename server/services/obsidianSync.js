const fs = require('fs')
const path = require('path')
const { v4: uuidv4 } = require('uuid')
const chokidar = require('chokidar')
const { get, query, run } = require('../db/database')

function getVaultPath() {
  const setting = get('SELECT value FROM settings WHERE key = ?', ['obsidian_path'])
  if (!setting) return null
  let vaultPath = setting.value
  if (vaultPath.startsWith('~/')) {
    vaultPath = path.join(process.env.HOME || process.env.USERPROFILE, vaultPath.slice(2))
  }
  return vaultPath
}

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-')
  const day = parseInt(d)
  const suffix = day >= 11 && day <= 13 ? 'th' : ['st', 'nd', 'rd'][(day - 1) % 10] || 'th'
  return `${monthNames[parseInt(m) - 1]} ${day}${suffix}, ${y}`
}

function entryToMarkdown(entry) {
  let tags = []
  if (entry.tags) {
    try { tags = JSON.parse(entry.tags) } catch (e) { tags = [] }
  }
  const dateFormatted = formatDate(entry.date)

  let md = '---\n'
  md += `date: ${entry.date}\n`
  md += `mood: ${entry.mood || 3}\n`
  if (tags.length > 0) md += `tags: [${tags.join(', ')}]\n`
  md += 'app: LifeOS\n'
  md += '---\n\n'
  md += `# Journal — ${dateFormatted}\n\n`
  if (entry.what_happened) md += `## What happened today\n\n${entry.what_happened}\n\n`
  if (entry.gratitude) {
    md += '## Gratitude\n\n'
    const lines = entry.gratitude.split('\n').filter(l => l.trim())
    for (const line of lines) {
      md += `- ${line.replace(/^[-*]\s*/, '')}\n`
    }
    md += '\n'
  }
  if (entry.muhasaba) md += `## Muhasaba\n\n${entry.muhasaba}\n\n`
  if (entry.tomorrow_intention) md += `## Tomorrow's intention\n\n${entry.tomorrow_intention}\n\n`
  return md
}

function parseMarkdownToEntry(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    const dateMatch = content.match(/^date:\s*(\d{4}-\d{2}-\d{2})/m)
    const moodMatch = content.match(/^mood:\s*(\d)/m)
    const tagsMatch = content.match(/^tags:\s*\[(.*?)\]/m)
    if (!dateMatch) return null

    const date = dateMatch[1]
    const mood = moodMatch ? parseInt(moodMatch[1]) : 3
    let tags = null
    if (tagsMatch) {
      tags = JSON.stringify(tagsMatch[1].split(',').map(t => t.trim()))
    }

    const sections = content.split(/^## /m)
    let whatHappened = '', gratitude = '', muhasaba = '', tomorrowIntention = ''

    for (const section of sections) {
      if (section.startsWith('What happened today')) {
        whatHappened = section.replace(/^What happened today\n+/, '').trim()
      } else if (section.startsWith('Gratitude')) {
        const lines = section.split('\n').slice(1)
        gratitude = lines.filter(l => l.trim()).map(l => l.replace(/^[-*]\s*/, '')).join('\n').trim()
      } else if (section.startsWith('Muhasaba')) {
        muhasaba = section.replace(/^Muhasaba\n+/, '').trim()
      } else if (section.startsWith("Tomorrow's intention")) {
        tomorrowIntention = section.replace(/^Tomorrow's intention\n+/, '').trim()
      }
    }

    return { date, mood, what_happened: whatHappened, gratitude, muhasaba, tomorrow_intention: tomorrowIntention, tags }
  } catch (err) {
    console.error('Error parsing Obsidian file:', err.message)
    return null
  }
}

function syncToObsidian(entry) {
  try {
    const vaultPath = getVaultPath()
    if (!vaultPath || !entry) return
    const journalDir = path.join(vaultPath, 'Journal')
    if (!fs.existsSync(journalDir)) fs.mkdirSync(journalDir, { recursive: true })
    const filePath = path.join(journalDir, `${entry.date}.md`)
    const markdown = entryToMarkdown(entry)
    fs.writeFileSync(filePath, markdown, 'utf-8')
  } catch (err) {
    console.error('Obsidian sync error:', err.message)
  }
}

function importFromObsidian() {
  try {
    const vaultPath = getVaultPath()
    if (!vaultPath) return
    const journalDir = path.join(vaultPath, 'Journal')
    if (!fs.existsSync(journalDir)) return

    const files = fs.readdirSync(journalDir).filter(f => f.endsWith('.md'))
    let imported = 0

    for (const file of files) {
      const filePath = path.join(journalDir, file)
      const entry = parseMarkdownToEntry(filePath)
      if (!entry) continue
      const existing = get('SELECT * FROM journal_entries WHERE date = ?', [entry.date])
      if (!existing) {
        run(`INSERT INTO journal_entries (id, date, mood, what_happened, gratitude, muhasaba, tomorrow_intention, tags)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [uuidv4(), entry.date, entry.mood, entry.what_happened, entry.gratitude, entry.muhasaba, entry.tomorrow_intention, entry.tags])
        imported++
      }
    }
    if (imported > 0) console.log(`Imported ${imported} journal entries from Obsidian`)
  } catch (err) {
    console.error('Obsidian import error:', err.message)
  }
}

let watcher = null

function startWatcher() {
  importFromObsidian()

  try {
    const vaultPath = getVaultPath()
    if (!vaultPath) return
    const journalDir = path.join(vaultPath, 'Journal')
    if (!fs.existsSync(journalDir)) fs.mkdirSync(journalDir, { recursive: true })

    watcher = chokidar.watch(path.join(journalDir, '*.md'), {
      ignored: /(^|[\/\\])\../,
      persistent: true,
      ignoreInitial: true,
    })

    watcher.on('change', (filePath) => {
      try {
        const entry = parseMarkdownToEntry(filePath)
        if (!entry) return
        const existing = get('SELECT * FROM journal_entries WHERE date = ?', [entry.date])
        if (existing) {
          const appUpdated = query('SELECT * FROM journal_entries WHERE date = ? AND updated_at > ?',
            [entry.date, new Date(Date.now() - 5000).toISOString()])
          if (appUpdated.length === 0) {
            run(`UPDATE journal_entries SET mood=?, what_happened=?, gratitude=?, muhasaba=?, tomorrow_intention=?, tags=?, updated_at=datetime('now') WHERE date=?`,
              [entry.mood, entry.what_happened, entry.gratitude, entry.muhasaba, entry.tomorrow_intention, entry.tags, entry.date])
          }
        } else {
          run(`INSERT INTO journal_entries (id, date, mood, what_happened, gratitude, muhasaba, tomorrow_intention, tags)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [uuidv4(), entry.date, entry.mood, entry.what_happened, entry.gratitude, entry.muhasaba, entry.tomorrow_intention, entry.tags])
        }
      } catch (err) {
        console.error('Obsidian file change handler error:', err.message)
      }
    })
  } catch (err) {
    console.error('Obsidian watcher error:', err.message)
  }
}

function stopWatcher() {
  if (watcher) { watcher.close(); watcher = null }
}

module.exports = { syncToObsidian, startWatcher, stopWatcher, importFromObsidian }
