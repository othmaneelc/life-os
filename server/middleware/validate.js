const { apiError, HTTP_STATUS } = require('./errorHandler')

function validate(rules) {
  return (req, res, next) => {
    const errors = []
    for (const [field, checks] of Object.entries(rules)) {
      const value = req.body[field]
      for (const check of checks) {
        if (check.required && (value === undefined || value === null || value === '')) {
          errors.push({ field, message: `${field} is required` })
          break
        }
        if (value !== undefined && value !== null && value !== '') {
          if (check.type === 'string' && typeof value !== 'string') {
            errors.push({ field, message: `${field} must be a string` })
          }
          if (check.type === 'number' && (typeof value !== 'number' || isNaN(value))) {
            errors.push({ field, message: `${field} must be a number` })
          }
          if (check.minLength && typeof value === 'string' && value.length < check.minLength) {
            errors.push({ field, message: `${field} must be at least ${check.minLength} characters` })
          }
          if (check.maxLength && typeof value === 'string' && value.length > check.maxLength) {
            errors.push({ field, message: `${field} must be at most ${check.maxLength} characters` })
          }
          if (check.oneOf && !check.oneOf.includes(value)) {
            errors.push({ field, message: `${field} must be one of: ${check.oneOf.join(', ')}` })
          }
          if (check.pattern && !check.pattern.test(value)) {
            errors.push({ field, message: `${field} format is invalid` })
          }
          if (check.min !== undefined && Number(value) < check.min) {
            errors.push({ field, message: `${field} must be at least ${check.min}` })
          }
          if (check.max !== undefined && Number(value) > check.max) {
            errors.push({ field, message: `${field} must be at most ${check.max}` })
          }
        }
      }
    }
    if (errors.length > 0) {
      return apiError(res, HTTP_STATUS.VALIDATION_ERROR, 'Validation failed', errors)
    }
    next()
  }
}

module.exports = { validate }
