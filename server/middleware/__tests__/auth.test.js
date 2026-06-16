import { describe, it, expect, beforeAll } from 'vitest'
import jwt from 'jsonwebtoken'

let requireAuth, optionalAuth

beforeAll(async () => {
  const mod = await import('../auth.js')
  requireAuth = mod.requireAuth
  optionalAuth = mod.optionalAuth
})

function makeToken(payload = {}) {
  return jwt.sign(
    { id: 1, email: 'test@lifeos.app', username: 'testuser', ...payload },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  )
}

describe('requireAuth', () => {
  it('returns 401 if no authorization header', () => {
    const req = { headers: {} }
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() }
    const next = vi.fn()
    requireAuth(req, res, next)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 401 if authorization is not Bearer', () => {
    const req = { headers: { authorization: 'Basic token' } }
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() }
    const next = vi.fn()
    requireAuth(req, res, next)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 401 if token is invalid', () => {
    const req = { headers: { authorization: 'Bearer definitely-not-a-valid-jwt' } }
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() }
    const next = vi.fn()
    requireAuth(req, res, next)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('calls next if token is valid', () => {
    const token = makeToken()
    const req = { headers: { authorization: `Bearer ${token}` } }
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() }
    const next = vi.fn()
    requireAuth(req, res, next)
    expect(next).toHaveBeenCalled()
    expect(req.user.email).toBe('test@lifeos.app')
  })
})

describe('optionalAuth', () => {
  it('calls next without setting user if no token', () => {
    const req = { headers: {} }
    const res = {}
    const next = vi.fn()
    optionalAuth(req, res, next)
    expect(next).toHaveBeenCalled()
    expect(req.user).toBeUndefined()
  })

  it('sets user if valid token', () => {
    const token = makeToken()
    const req = { headers: { authorization: `Bearer ${token}` } }
    const res = {}
    const next = vi.fn()
    optionalAuth(req, res, next)
    expect(next).toHaveBeenCalled()
    expect(req.user.email).toBe('test@lifeos.app')
  })

  it('calls next even if invalid token', () => {
    const req = { headers: { authorization: 'Bearer bad-token' } }
    const res = {}
    const next = vi.fn()
    optionalAuth(req, res, next)
    expect(next).toHaveBeenCalled()
    expect(req.user).toBeUndefined()
  })
})
