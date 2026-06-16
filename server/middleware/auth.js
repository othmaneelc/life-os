const jwt = require('jsonwebtoken')

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  throw new Error('[FATAL] JWT_SECRET environment variable is required. Set it in .env or export it, then restart the server.')
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'No token provided' })
  }
  const token = header.split(' ')[1]
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.user = { id: decoded.id, email: decoded.email, username: decoded.username }
    next()
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Invalid token' })
  }
}

function optionalAuth(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return next()
  }
  const token = header.split(' ')[1]
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.user = { id: decoded.id, email: decoded.email, username: decoded.username }
  } catch (err) {
    // Ignore invalid token for optional auth
  }
  next()
}

module.exports = { requireAuth, optionalAuth }
