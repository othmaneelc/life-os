const express = require('express')
const { handleError } = require('../middleware/errorHandler')
const { query, run, get } = require('../db/database')
const router = express.Router()

// ─── STATS (used by sidebar badge + overview) ───
router.get('/stats', (req, res) => {
  try {
    const now = new Date().toISOString().split('T')[0]
    const overdue = query(`SELECT COUNT(*) as cnt FROM cdz_posts WHERE status NOT IN ('Posted','Archived') AND scheduled_date < ?`, [now])
    const pending = query(`SELECT COUNT(*) as cnt FROM cdz_posts WHERE status = 'Ready for Review'`)
    const ideas = query(`SELECT COUNT(*) as cnt FROM cdz_posts WHERE status = 'Idea'`)
    const inProduction = query(`SELECT COUNT(*) as cnt FROM cdz_posts WHERE status = 'In Production'`)
    res.json({
      overdue: overdue[0]?.cnt || 0,
      pendingApprovals: pending[0]?.cnt || 0,
      ideas: ideas[0]?.cnt || 0,
      inProduction: inProduction[0]?.cnt || 0,
    })
  } catch (err) { handleError(res, err) }
})

// ─── POSTS ───
router.get('/posts', (req, res) => {
  try {
    let sql = 'SELECT * FROM cdz_posts WHERE status != \'Archived\''
    const params = []
    if (req.query.status) { sql += ' AND status = ?'; params.push(req.query.status) }
    if (req.query.platform) { sql += ' AND platform = ?'; params.push(req.query.platform) }
    if (req.query.post_type) { sql += ' AND post_type = ?'; params.push(req.query.post_type) }
    if (req.query.priority) { sql += ' AND priority = ?'; params.push(req.query.priority) }
    sql += ' ORDER BY scheduled_date ASC, created_at DESC'
    res.json(query(sql, params))
  } catch (err) { handleError(res, err) }
})

router.get('/posts/:id', (req, res) => {
  try {
    const post = get('SELECT * FROM cdz_posts WHERE id = ?', [req.params.id])
    if (!post) return res.status(404).json({ error: 'Post not found' })
    res.json(post)
  } catch (err) { handleError(res, err) }
})

function getChecklistTemplates() {
  return query('SELECT section, step_key, step_label FROM cdz_checklist_templates ORDER BY sort_order')
}

router.post('/posts', (req, res) => {
  try {
    const { title, topic, content_pillar, post_type, platform, status, priority, scheduled_date, design_notes } = req.body
    const result = run(`INSERT INTO cdz_posts (title,topic,content_pillar,post_type,platform,status,priority,scheduled_date,design_notes) VALUES (?,?,?,?,?,?,?,?,?)`,
      [title, topic || null, content_pillar || null, post_type, platform, status || 'Idea', priority || 'Normal', scheduled_date || null, design_notes || null])
    const postId = result.lastInsertRowid

    const templates = getChecklistTemplates()
    for (const step of templates) {
      run(`INSERT INTO cdz_checklist_steps (post_id,section,step_key,step_label) VALUES (?,?,?,?)`,
        [postId, step.section, step.step_key, step.step_label])
    }

    res.json(get('SELECT * FROM cdz_posts WHERE id = ?', [postId]))
  } catch (err) { handleError(res, err) }
})

router.put('/posts/:id', (req, res) => {
  try {
    const { title, topic, content_pillar, post_type, platform, status, priority, scheduled_date, posted_date, facebook_caption, instagram_caption, hashtags, design_notes, performance_reach, performance_likes, performance_comments, performance_saves, performance_shares } = req.body
    run(`UPDATE cdz_posts SET
      title=COALESCE(?,title), topic=COALESCE(?,topic), content_pillar=COALESCE(?,content_pillar),
      post_type=COALESCE(?,post_type), platform=COALESCE(?,platform), status=COALESCE(?,status),
      priority=COALESCE(?,priority), scheduled_date=COALESCE(?,scheduled_date), posted_date=COALESCE(?,posted_date),
      facebook_caption=COALESCE(?,facebook_caption), instagram_caption=COALESCE(?,instagram_caption),
      hashtags=COALESCE(?,hashtags), design_notes=COALESCE(?,design_notes),
      performance_reach=COALESCE(?,performance_reach), performance_likes=COALESCE(?,performance_likes),
      performance_comments=COALESCE(?,performance_comments), performance_saves=COALESCE(?,performance_saves),
      performance_shares=COALESCE(?,performance_shares),
      updated_at=datetime('now')
      WHERE id=?`,
      [title, topic, content_pillar, post_type, platform, status, priority, scheduled_date, posted_date, facebook_caption, instagram_caption, hashtags, design_notes, performance_reach, performance_likes, performance_comments, performance_saves, performance_shares, req.params.id])
    res.json(get('SELECT * FROM cdz_posts WHERE id = ?', [req.params.id]))
  } catch (err) { handleError(res, err) }
})

router.delete('/posts/:id', (req, res) => {
  try {
    run(`UPDATE cdz_posts SET status='Archived' WHERE id=?`, [req.params.id])
    res.json({ success: true })
  } catch (err) { handleError(res, err) }
})

// ─── CHECKLIST ───
router.get('/checklist/:postId', (req, res) => {
  try {
    res.json(query('SELECT * FROM cdz_checklist_steps WHERE post_id=? ORDER BY id', [req.params.postId]))
  } catch (err) { handleError(res, err) }
})

router.put('/checklist/:id', (req, res) => {
  try {
    const step = get('SELECT * FROM cdz_checklist_steps WHERE id=?', [req.params.id])
    if (!step) return res.status(404).json({ error: 'Step not found' })
    const newVal = step.is_completed ? 0 : 1
    if (newVal) {
      run(`UPDATE cdz_checklist_steps SET is_completed=?, completed_at=datetime('now') WHERE id=?`, [newVal, req.params.id])
    } else {
      run(`UPDATE cdz_checklist_steps SET is_completed=?, completed_at=NULL WHERE id=?`, [newVal, req.params.id])
    }
    res.json(get('SELECT * FROM cdz_checklist_steps WHERE id=?', [req.params.id]))
  } catch (err) { handleError(res, err) }
})

// ─── COMMS ───
router.get('/comms', (req, res) => {
  try {
    let sql = 'SELECT * FROM cdz_comms'
    const params = []
    const conds = []
    if (req.query.type) { conds.push('type=?'); params.push(req.query.type) }
    if (req.query.action_status) { conds.push('action_status=?'); params.push(req.query.action_status) }
    if (conds.length) sql += ' WHERE ' + conds.join(' AND ')
    sql += ' ORDER BY date DESC, created_at DESC'
    res.json(query(sql, params))
  } catch (err) { handleError(res, err) }
})

router.post('/comms', (req, res) => {
  try {
    const { date, type, summary, action_item, action_status } = req.body
    const result = run(`INSERT INTO cdz_comms (date,type,summary,action_item,action_status) VALUES (?,?,?,?,?)`,
      [date, type, summary, action_item || null, action_status || 'Pending'])
    res.json(get('SELECT * FROM cdz_comms WHERE id=?', [result.lastInsertRowid]))
  } catch (err) { handleError(res, err) }
})

router.put('/comms/:id', (req, res) => {
  try {
    const { date, type, summary, action_item, action_status } = req.body
    run(`UPDATE cdz_comms SET date=COALESCE(?,date), type=COALESCE(?,type), summary=COALESCE(?,summary), action_item=COALESCE(?,action_item), action_status=COALESCE(?,action_status) WHERE id=?`,
      [date, type, summary, action_item, action_status, req.params.id])
    res.json(get('SELECT * FROM cdz_comms WHERE id=?', [req.params.id]))
  } catch (err) { handleError(res, err) }
})

router.delete('/comms/:id', (req, res) => {
  try {
    run('DELETE FROM cdz_comms WHERE id=?', [req.params.id])
    res.json({ success: true })
  } catch (err) { handleError(res, err) }
})

// ─── MONTHLY RESULTS ───
router.get('/results', (req, res) => {
  try {
    res.json(query('SELECT * FROM cdz_monthly_results ORDER BY year DESC, month DESC'))
  } catch (err) { handleError(res, err) }
})

router.put('/results/:id', (req, res) => {
  try {
    const { fb_views, fb_reach, fb_new_followers, fb_top_post, ig_views, ig_reach, ig_new_followers, ig_saves, ig_top_post, reels_views, reels_shares, total_posts_published, notes, goals_next_month } = req.body
    run(`UPDATE cdz_monthly_results SET
      fb_views=COALESCE(?,fb_views), fb_reach=COALESCE(?,fb_reach), fb_new_followers=COALESCE(?,fb_new_followers),
      fb_top_post=COALESCE(?,fb_top_post), ig_views=COALESCE(?,ig_views), ig_reach=COALESCE(?,ig_reach),
      ig_new_followers=COALESCE(?,ig_new_followers), ig_saves=COALESCE(?,ig_saves), ig_top_post=COALESCE(?,ig_top_post),
      reels_views=COALESCE(?,reels_views), reels_shares=COALESCE(?,reels_shares),
      total_posts_published=COALESCE(?,total_posts_published), notes=COALESCE(?,notes), goals_next_month=COALESCE(?,goals_next_month)
      WHERE id=?`,
      [fb_views, fb_reach, fb_new_followers, fb_top_post, ig_views, ig_reach, ig_new_followers, ig_saves, ig_top_post, reels_views, reels_shares, total_posts_published, notes, goals_next_month, req.params.id])
    res.json(get('SELECT * FROM cdz_monthly_results WHERE id=?', [req.params.id]))
  } catch (err) { handleError(res, err) }
})

router.post('/results', (req, res) => {
  try {
    const { month, year, fb_views, fb_reach, fb_new_followers, fb_top_post, ig_views, ig_reach, ig_new_followers, ig_saves, ig_top_post, reels_views, reels_shares, total_posts_published, notes, goals_next_month } = req.body
    const existing = get('SELECT id FROM cdz_monthly_results WHERE month=? AND year=?', [month, year])
    if (existing) {
      run(`UPDATE cdz_monthly_results SET fb_views=COALESCE(?,fb_views), fb_reach=COALESCE(?,fb_reach), fb_new_followers=COALESCE(?,fb_new_followers), fb_top_post=COALESCE(?,fb_top_post), ig_views=COALESCE(?,ig_views), ig_reach=COALESCE(?,ig_reach), ig_new_followers=COALESCE(?,ig_new_followers), ig_saves=COALESCE(?,ig_saves), ig_top_post=COALESCE(?,ig_top_post), reels_views=COALESCE(?,reels_views), reels_shares=COALESCE(?,reels_shares), total_posts_published=COALESCE(?,total_posts_published), notes=COALESCE(?,notes), goals_next_month=COALESCE(?,goals_next_month) WHERE id=?`,
        [fb_views, fb_reach, fb_new_followers, fb_top_post, ig_views, ig_reach, ig_new_followers, ig_saves, ig_top_post, reels_views, reels_shares, total_posts_published, notes, goals_next_month, existing.id])
      return res.json(get('SELECT * FROM cdz_monthly_results WHERE id=?', [existing.id]))
    }
    const result = run(`INSERT INTO cdz_monthly_results (month,year,fb_views,fb_reach,fb_new_followers,fb_top_post,ig_views,ig_reach,ig_new_followers,ig_saves,ig_top_post,reels_views,reels_shares,total_posts_published,notes,goals_next_month) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [month, year, fb_views||0, fb_reach||0, fb_new_followers||0, fb_top_post||null, ig_views||0, ig_reach||0, ig_new_followers||0, ig_saves||0, ig_top_post||null, reels_views||0, reels_shares||0, total_posts_published||0, notes||null, goals_next_month||null])
    res.json(get('SELECT * FROM cdz_monthly_results WHERE id=?', [result.lastInsertRowid]))
  } catch (err) { handleError(res, err) }
})

// ─── IDEAS ───
router.get('/ideas', (req, res) => {
  try {
    res.json(query('SELECT * FROM cdz_ideas ORDER BY priority DESC, created_at DESC'))
  } catch (err) { handleError(res, err) }
})

router.post('/ideas', (req, res) => {
  try {
    const { title, description, content_pillar, post_type, source, priority } = req.body
    const result = run(`INSERT INTO cdz_ideas (title,description,content_pillar,post_type,source,priority) VALUES (?,?,?,?,?,?)`,
      [title, description||null, content_pillar||null, post_type||null, source||null, priority||0])
    res.json(get('SELECT * FROM cdz_ideas WHERE id=?', [result.lastInsertRowid]))
  } catch (err) { handleError(res, err) }
})

router.put('/ideas/:id/convert', (req, res) => {
  try {
    const idea = get('SELECT * FROM cdz_ideas WHERE id=?', [req.params.id])
    if (!idea) return res.status(404).json({ error: 'Idea not found' })
    // Create post from idea
    const result = run(`INSERT INTO cdz_posts (title,topic,content_pillar,post_type,status) VALUES (?,?,?,?,'Idea')`,
      [idea.title, idea.description, idea.content_pillar, idea.post_type])
    const postId = result.lastInsertRowid
    // Generate checklist
    const templates = getChecklistTemplates()
    for (const step of templates) {
      run(`INSERT INTO cdz_checklist_steps (post_id,section,step_key,step_label) VALUES (?,?,?,?)`,
        [postId, step.section, step.step_key, step.step_label])
    }
    run('UPDATE cdz_ideas SET converted_to_post=1, converted_post_id=? WHERE id=?', [postId, req.params.id])
    res.json(get('SELECT * FROM cdz_posts WHERE id=?', [postId]))
  } catch (err) { handleError(res, err) }
})

module.exports = router
