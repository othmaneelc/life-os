const https = require('https')

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          resolve(JSON.parse(data))
        } catch (e) {
          reject(new Error('Failed to parse response'))
        }
      })
    }).on('error', reject)
  })
}

async function fetchPrayerTimes(dateStr) {
  const [year, month, day] = dateStr.split('-')
  const url = `https://api.aladhan.com/v1/timingsByCity?city=Casablanca&country=Morocco&method=2&date=${day}-${month}-${year}`
  const response = await httpsGet(url)
  if (response.code === 200 && response.data?.timings) {
    return response.data.timings
  }
  // Fallback: return reasonable defaults for Casablanca
  return {
    Fajr: '04:58',
    Sunrise: '06:24',
    Dhuhr: '13:12',
    Asr: '16:47',
    Maghrib: '19:58',
    Isha: '21:24',
  }
}

module.exports = { fetchPrayerTimes }
