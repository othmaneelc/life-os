const https = require('https')

function httpsGet(url, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          resolve(JSON.parse(data))
        } catch (e) {
          reject(new Error('Parse error: ' + e.message))
        }
      })
    })
    req.on('error', reject)
    req.setTimeout(timeout, () => { req.destroy(); reject(new Error('Timeout')) })
  })
}

function getSetting(dbGet, key, defaultVal) {
  try {
    const row = dbGet('SELECT value FROM settings WHERE key = ?', [key])
    return row ? row.value : defaultVal
  } catch {
    return defaultVal
  }
}

const PRAYER_METHODS = {
  '0': { name: 'Shia Ithna Ashari (Jafari)', region: 'Shia' },
  '1': { name: 'University of Islamic Sciences, Karachi', region: 'Hanafi' },
  '2': { name: 'Islamic Society of North America (ISNA)', region: 'North America' },
  '3': { name: 'Muslim World League (MWL)', region: 'Europe / Far East' },
  '4': { name: 'Umm Al-Qura University, Makkah', region: 'Arabian Peninsula' },
  '5': { name: 'Egyptian General Authority of Survey', region: 'Africa' },
  '7': { name: 'Institute of Geophysics, University of Tehran', region: 'Iran' },
  '8': { name: 'Gulf Region', region: 'Gulf' },
  '9': { name: 'Kuwait', region: 'Kuwait' },
  '10': { name: 'Qatar', region: 'Qatar' },
  '11': { name: 'Majlis Ugama Islam Singapura, Singapore', region: 'Singapore' },
  '12': { name: 'Union Organization islamic de France (UOIF)', region: 'France' },
  '13': { name: 'Diyanet İşleri Başkanlığı, Turkey (Diyanet)', region: 'Turkey' },
  '14': { name: 'Spiritual Administration of Muslims of Russia', region: 'Russia' },
}

function getMethods() {
  return Object.entries(PRAYER_METHODS).map(([id, m]) => ({
    id: parseInt(id), name: m.name, region: m.region,
  }))
}

async function fetchPrayerTimes(dateStr, city, country, method, dbGet) {
  const g = (k, d) => getSetting(dbGet, k, d)
  const c = city || g('city', 'Casablanca')
  const co = country || g('country', 'Morocco')
  const m = method || g('prayer_method', '2')
  try {
    const [year, month, day] = dateStr.split('-')
    const url = `https://api.aladhan.com/v1/timingsByCity/${day}-${month}-${year}?city=${encodeURIComponent(c)}&country=${encodeURIComponent(co)}&method=${m}`
    const response = await httpsGet(url)
    if (response.code === 200 && response.data?.timings) {
      return { timings: response.data.timings, meta: response.data.meta, city: c, country: co, method: parseInt(m) }
    }
  } catch (err) {}
  const defaults = { Fajr: '05:04', Sunrise: '06:24', Dhuhr: '13:27', Asr: '17:11', Maghrib: '20:31', Isha: '21:52' }
  return { timings: defaults, meta: null, city: c, country: co, method: parseInt(m), fallback: true }
}

module.exports = { fetchPrayerTimes, getMethods }
