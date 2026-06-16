const Database = require('better-sqlite3')
const jwt = require('jsonwebtoken')
const path = require('path')
const fs = require('fs')

const TEST_JWT_SECRET = 'test-secret-for-unit-tests'

function createTestDb() {
  const db = new Database(':memory:')
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  return db
}

function getTestSecret() {
  return TEST_JWT_SECRET
}

function createTestToken(overrides = {}) {
  return jwt.sign(
    { id: 1, email: 'test@lifeos.app', username: 'testuser', ...overrides },
    TEST_JWT_SECRET,
    { expiresIn: '1h' }
  )
}

function mockDbModule(db) {
  const { query, run, get } = require('./database')
  const origPrepare = db.prepare.bind(db)
  db.prepare = (sql) => {
    const stmt = origPrepare(sql)
    return stmt
  }
  return { query, run, get }
}

module.exports = { createTestDb, getTestSecret, createTestToken, mockDbModule }
