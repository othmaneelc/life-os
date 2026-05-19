const express = require('express')
const { v4: uuidv4 } = require('uuid')
const { query, run, get } = require('../db/database')

const router = express.Router()

router.get('/', (req, res) => {
  try {
    const { status } = req.query
    let sql = 'SELECT * FROM books'
    const params = []
    if (status && status !== 'all') { sql += ' WHERE status = ?'; params.push(status) }
    sql += ' ORDER BY sort_order'
    const books = query(sql, params)
    // Attach note count
    const noteCounts = query('SELECT book_id, COUNT(*) as count FROM book_notes GROUP BY book_id')
    const countsMap = {}
    noteCounts.forEach(n => { countsMap[n.book_id] = n.count })
    books.forEach(b => { b.note_count = countsMap[b.id] || 0 })
    res.json(books)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/', (req, res) => {
  try {
    const { title, author, genre, total_pages, current_page, cover_url, status } = req.body
    const id = uuidv4()
    const maxOrder = get('SELECT MAX(sort_order) as max FROM books')
    run('INSERT INTO books (id, title, author, genre, total_pages, current_page, cover_url, status, sort_order) VALUES (?,?,?,?,?,?,?,?,?)',
      [id, title, author || '', genre || '', total_pages || 0, current_page || 0, cover_url || null, status || 'want_to_read', (maxOrder?.max || 0) + 1])
    res.json(get('SELECT * FROM books WHERE id = ?', [id]))
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.put('/:id', (req, res) => {
  try {
    const { title, author, genre, status, total_pages, current_page, rating, cover_url, start_date, finish_date, notes_summary } = req.body
    run(`UPDATE books SET title=COALESCE(?,title), author=COALESCE(?,author), genre=COALESCE(?,genre), status=COALESCE(?,status), total_pages=COALESCE(?,total_pages), current_page=COALESCE(?,current_page), rating=?, cover_url=?, start_date=COALESCE(?,start_date), finish_date=COALESCE(?,finish_date), notes_summary=COALESCE(?,notes_summary) WHERE id=?`,
      [title, author, genre, status, total_pages, current_page, rating ?? null, cover_url ?? null, start_date, finish_date, notes_summary, req.params.id])
    res.json(get('SELECT * FROM books WHERE id = ?', [req.params.id]))
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.delete('/:id', (req, res) => {
  try {
    run('DELETE FROM book_notes WHERE book_id = ?', [req.params.id])
    run('DELETE FROM books WHERE id = ?', [req.params.id])
    res.json({ success: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// Notes
router.get('/:bookId/notes', (req, res) => {
  try {
    const notes = query('SELECT * FROM book_notes WHERE book_id = ? ORDER BY created_at DESC', [req.params.bookId])
    res.json(notes)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/:bookId/notes', (req, res) => {
  try {
    const { chapter, content, type, page } = req.body
    const id = uuidv4()
    run('INSERT INTO book_notes (id, book_id, chapter, content, type, page) VALUES (?,?,?,?,?,?)',
      [id, req.params.bookId, chapter || null, content, type || 'note', page || null])
    res.json(get('SELECT * FROM book_notes WHERE id = ?', [id]))
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.put('/:bookId/notes/:id', (req, res) => {
  try {
    const { chapter, content, type, page } = req.body
    run('UPDATE book_notes SET chapter=COALESCE(?,chapter), content=COALESCE(?,content), type=COALESCE(?,type), page=? WHERE id=?',
      [chapter, content, type, page ?? null, req.params.id])
    res.json(get('SELECT * FROM book_notes WHERE id = ?', [req.params.id]))
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.delete('/:bookId/notes/:id', (req, res) => {
  try {
    run('DELETE FROM book_notes WHERE id = ?', [req.params.id])
    res.json({ success: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
