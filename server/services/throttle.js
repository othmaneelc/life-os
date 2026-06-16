function createThrottle(minIntervalMs = 2000) {
  let lastCall = 0
  return async function throttle() {
    const now = Date.now()
    const wait = Math.max(0, minIntervalMs - (now - lastCall))
    if (wait > 0) await new Promise(r => setTimeout(r, wait))
    lastCall = Date.now()
  }
}

module.exports = { createThrottle }
