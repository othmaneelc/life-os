const express = require('express')
const { v4: uuidv4 } = require('uuid')
const { query, run, get } = require('../db/database')

const router = express.Router()

// Check if FTS5 is available
let fts5Available = null
function checkFts5() {
  if (fts5Available !== null) return fts5Available
  try {
    query('SELECT * FROM kb_fts LIMIT 0')
    fts5Available = true
  } catch {
    fts5Available = false
  }
  return fts5Available
}

function searchDocs(term) {
  if (checkFts5()) {
    const sanitized = term.replace(/[^a-zA-Z0-9 ]/g, '').trim()
    if (!sanitized) return []
    try {
      return query(`SELECT doc.* FROM kb_documents doc JOIN kb_fts ON doc.rowid = kb_fts.rowid WHERE kb_fts MATCH ? ORDER BY rank`, [sanitized + '*'])
    } catch {}
  }
  const like = `%${term.replace(/'/g, "''")}%`
  return query('SELECT * FROM kb_documents WHERE title LIKE ? OR content LIKE ? ORDER BY created_at DESC LIMIT 20', [like, like])
}

function syncFts(id) {
  if (!checkFts5()) return
  try {
    const doc = get('SELECT rowid, * FROM kb_documents WHERE id = ?', [id])
    if (doc) {
      run('DELETE FROM kb_fts WHERE rowid = ?', [doc.rowid])
      run('INSERT INTO kb_fts (rowid, title, content) VALUES (?,?,?)', [doc.rowid, doc.title, doc.content || ''])
    }
  } catch {}
}

function deleteFts(rowid) {
  if (!checkFts5()) return
  try { run('DELETE FROM kb_fts WHERE rowid = ?', [rowid]) } catch {}
}

router.get('/', (req, res) => {
  try {
    const { search } = req.query
    if (search) return res.json(searchDocs(search))
    res.json(query('SELECT * FROM kb_documents ORDER BY created_at DESC'))
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/', (req, res) => {
  try {
    const { title, content, source_url, source_type } = req.body
    const id = uuidv4()
    run('INSERT INTO kb_documents (id, title, content, source_url, source_type) VALUES (?,?,?,?,?)',
      [id, title, content || '', source_url || null, source_type || 'note'])
    syncFts(id)
    res.json(get('SELECT * FROM kb_documents WHERE id = ?', [id]))
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.put('/:id', (req, res) => {
  try {
    const { title, content, source_url, source_type } = req.body
    const fields = []; const params = []
    if (title !== undefined) { fields.push('title = ?'); params.push(title) }
    if (content !== undefined) { fields.push('content = ?'); params.push(content) }
    if (source_url !== undefined) { fields.push('source_url = ?'); params.push(source_url) }
    if (source_type !== undefined) { fields.push('source_type = ?'); params.push(source_type) }
    fields.push('updated_at = datetime("now")')
    params.push(req.params.id)
    run(`UPDATE kb_documents SET ${fields.join(', ')} WHERE id = ?`, params)
    syncFts(req.params.id)
    res.json(get('SELECT * FROM kb_documents WHERE id = ?', [req.params.id]))
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.delete('/:id', (req, res) => {
  try {
    const doc = get('SELECT rowid FROM kb_documents WHERE id = ?', [req.params.id])
    if (doc) deleteFts(doc.rowid)
    run('DELETE FROM kb_documents WHERE id = ?', [req.params.id])
    res.json({ success: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/ai', async (req, res) => {
  try {
    const { question } = req.body
    if (!question) return res.status(400).json({ error: 'Question is required' })

    // Search relevant docs
    const searchTerms = question.replace(/[^a-zA-Z0-9 ]/g, '').split(/\s+/).filter(Boolean).join(' ')
    if (!searchTerms.trim()) return res.json({ answer: 'No relevant documents found.', sources: [] })

    const docs = searchDocs(searchTerms).slice(0, 5)
    if (docs.length === 0) return res.json({ answer: 'No relevant documents found in your Knowledge Base.', sources: [] })

    // Check for AI API key in settings
    const apiKey = get('SELECT value FROM settings WHERE key = ?', ['ai_api_key'])
    if (apiKey) {
      try {
        const { default: fetch } = await import('node-fetch')
        const context = docs.map(d => `[${d.title}]: ${d.content?.slice(0, 2000)}`).join('\n\n')
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey.value}` },
          body: JSON.stringify({ model: 'gpt-4o-mini', messages: [
            { role: 'system', content: 'Answer based only on the provided context. If unsure, say so.' },
            { role: 'user', content: `Context:\n${context}\n\nQuestion: ${question}` }
          ], max_tokens: 1000 })
        })
        const data = await response.json()
        if (data.choices?.[0]) return res.json({ answer: data.choices[0].message.content, sources: docs.map(d => ({ title: d.title, id: d.id })) })
      } catch (e) {
        return res.json({ answer: 'AI service error. Your API key may be invalid.', sources: [] })
      }
    }

    // No AI: return relevant snippets
    const snippets = docs.map(d => `**${d.title}**: ${d.content?.slice(0, 500)}`).join('\n\n---\n\n')
    res.json({ answer: `Found ${docs.length} relevant document(s):\n\n${snippets}`, sources: docs.map(d => ({ title: d.title, id: d.id })) })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
