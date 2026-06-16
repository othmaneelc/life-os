import { describe, it, expect, vi } from 'vitest'
import { validate } from '../validate.js'

function mockReqRes(body) {
  const req = { body }
  const res = {
    status: vi.fn(() => res),
    json: vi.fn(() => res),
  }
  const next = vi.fn()
  return { req, res, next }
}

describe('validate middleware', () => {
  it('passes when all required fields are present', () => {
    const { req, res, next } = mockReqRes({ title: 'Test', category: 'personal' })
    const middleware = validate({
      title: [{ required: true }, { type: 'string' }],
      category: [{ oneOf: ['personal', 'business', 'urgent'] }],
    })
    middleware(req, res, next)
    expect(next).toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalled()
  })

  it('fails when required field is missing', () => {
    const { req, res, next } = mockReqRes({ category: 'personal' })
    const middleware = validate({ title: [{ required: true }] })
    middleware(req, res, next)
    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(422)
  })

  it('fails when value is not in oneOf', () => {
    const { req, res, next } = mockReqRes({ category: 'invalid' })
    const middleware = validate({ category: [{ oneOf: ['personal', 'business'] }] })
    middleware(req, res, next)
    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(422)
  })

  it('fails when string is too long', () => {
    const { req, res, next } = mockReqRes({ title: 'a'.repeat(600) })
    const middleware = validate({ title: [{ maxLength: 500 }] })
    middleware(req, res, next)
    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(422)
  })

  it('fails when number is out of range', () => {
    const { req, res, next } = mockReqRes({ mood: 10 })
    const middleware = validate({ mood: [{ type: 'number' }, { min: 1 }, { max: 5 }] })
    middleware(req, res, next)
    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(422)
  })

  it('passes when optional field is absent', () => {
    const { req, res, next } = mockReqRes({ title: 'Valid' })
    const middleware = validate({
      title: [{ required: true }],
      category: [{ oneOf: ['personal', 'business'] }],
    })
    middleware(req, res, next)
    expect(next).toHaveBeenCalled()
  })
})
