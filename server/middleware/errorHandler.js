const logger = require('../services/logger')

const HTTP_STATUS = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  CONFLICT: 409,
  VALIDATION_ERROR: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_ERROR: 500,
}

function apiError(res, status, message, details = null) {
  const body = { success: false, error: message }
  if (details) body.details = details
  return res.status(status).json(body)
}

function errorMiddleware(err, req, res, next) {
  logger.error({ err, method: req.method, path: req.path }, 'Unhandled error')
  const msg = err?.message || 'Internal server error'
  apiError(res, HTTP_STATUS.INTERNAL_ERROR, msg)
}

function handleError(res, err, defaultMsg = 'Internal server error') {
  const msg = err?.message || defaultMsg
  logger.error({ err, statusCode: 500, responseSent: true }, msg)
  if (!res.headersSent) {
    res.status(500).json({ success: false, error: msg })
  }
}

module.exports = { apiError, errorMiddleware, HTTP_STATUS, handleError }
