const logger = require('./logger')

function getSettings() {
  const { query } = require('../db/database')
  const rows = query('SELECT key, value FROM settings')
  const map = {}
  for (const r of rows) map[r.key] = r.value
  return map
}

async function syncGBP() {
  const settings = getSettings()
  const locationId = settings.gbp_location_id
  const accessToken = settings.gbp_access_token

  if (!locationId || !accessToken) {
    logger.warn('GBP sync skipped: missing location_id or access_token in settings')
    return { synced: false, reason: 'not_configured' }
  }

  try {
    const { default: fetch } = await import('node-fetch')

    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    const weekStr = weekStart.toISOString().split('T')[0]

    const resp = await fetch(
      `https://mybusiness.googleapis.com/v1/accounts/${settings.gbp_account_id || '*'}/locations/${locationId}/insights:reportInsights`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          basicRequest: {
            metricRequests: [
              { metric: 'ALL', options: ['AGGREGATED_DAILY'] },
            ],
            timeRange: { startTime: `${weekStart}T00:00:00Z`, endTime: new Date().toISOString() },
          },
        }),
      }
    )

    if (!resp.ok) {
      const err = await resp.text().catch(() => '')
      throw new Error(`GBP API error (${resp.status}): ${err.slice(0, 200)}`)
    }

    const data = await resp.json()
    const metrics = data?.locationMetrics?.[0]?.metricValues || []
    let profileViews = 0; let directionRequests = 0; let phoneCalls = 0; let newReviews = 0; let avgRating = 0

    for (const mv of metrics) {
      if (mv.metric === 'VIEWS_SEARCH' || mv.metric === 'VIEWS_MAPS') profileViews += parseInt(mv.totalValue?.value || 0)
      if (mv.metric === 'DIRECTIONS') directionRequests += parseInt(mv.totalValue?.value || 0)
      if (mv.metric === 'PHONE_CALLS') phoneCalls += parseInt(mv.totalValue?.value || 0)
      if (mv.metric === 'REVIEWS') avgRating = parseFloat(mv.totalValue?.averageValue || 0)
    }

    const { run, get } = require('../db/database')
    const existing = get('SELECT id FROM gbp_metrics WHERE week_start = ?', [weekStr])
    if (existing) {
      run('UPDATE gbp_metrics SET profile_views=?, direction_requests=?, phone_calls=?, new_reviews=?, avg_rating=? WHERE week_start=?',
        [profileViews, directionRequests, phoneCalls, newReviews, avgRating, weekStr])
    } else {
      const { v4: uuidv4 } = require('uuid')
      run('INSERT INTO gbp_metrics (id, week_start, profile_views, direction_requests, phone_calls, new_reviews, avg_rating) VALUES (?,?,?,?,?,?,?)',
        [uuidv4(), weekStr, profileViews, directionRequests, phoneCalls, newReviews, avgRating])
    }

    logger.info({ week: weekStr, profileViews, directionRequests, phoneCalls, newReviews, avgRating }, 'GBP sync completed')
    return { synced: true, week: weekStr, profileViews, directionRequests, phoneCalls }
  } catch (err) {
    logger.error({ err }, 'GBP sync failed')
    return { synced: false, error: err.message }
  }
}

async function syncMeta() {
  const settings = getSettings()
  const pageId = settings.meta_page_id
  const accessToken = settings.meta_access_token

  if (!pageId || !accessToken) {
    logger.warn('Meta sync skipped: missing page_id or access_token in settings')
    return { synced: false, reason: 'not_configured' }
  }

  try {
    const { default: fetch } = await import('node-fetch')

    const today = new Date().toISOString().split('T')[0]
    const resp = await fetch(
      `https://graph.facebook.com/v22.0/${pageId}/insights?metric=page_impressions,page_fans,page_engaged_users&period=days_28&access_token=${accessToken}`
    )

    if (!resp.ok) {
      const err = await resp.text().catch(() => '')
      throw new Error(`Meta API error (${resp.status}): ${err.slice(0, 200)}`)
    }

    const data = await resp.json()
    const metrics = {}
    for (const d of data.data || []) {
      metrics[d.name] = parseInt(d.values?.[0]?.value || 0)
    }

    logger.info({ pageId, metrics }, 'Meta sync completed')
    return { synced: true, pageId, impressions: metrics.page_impressions, fans: metrics.page_fans, engagement: metrics.page_engaged_users }
  } catch (err) {
    logger.error({ err }, 'Meta sync failed')
    return { synced: false, error: err.message }
  }
}

function startSyncSchedulers() {
  const HOUR_MS = 3600000

  const gbpInterval = setInterval(() => {
    syncGBP().catch(e => logger.error({ err: e }, 'GBP scheduler error'))
  }, 24 * HOUR_MS)

  const metaInterval = setInterval(() => {
    syncMeta().catch(e => logger.error({ err: e }, 'Meta scheduler error'))
  }, 6 * HOUR_MS)

  syncGBP().catch(e => logger.error({ err: e }, 'GBP initial sync'))
  syncMeta().catch(e => logger.error({ err: e }, 'Meta initial sync'))

  return { gbpInterval, metaInterval }
}

module.exports = { syncGBP, syncMeta, startSyncSchedulers }
