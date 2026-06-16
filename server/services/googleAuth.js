const { google } = require('googleapis')
const { get, run } = require('../db/database')
const logger = require('./logger')

let oauth2Client = null

function getOAuth2Client() {
  if (oauth2Client) return oauth2Client

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/auth/google/callback'

  if (!clientId || !clientSecret) {
    return null
  }

  oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri)

  const stored = get('SELECT value FROM settings WHERE key = ?', ['google_tokens'])
  if (stored) {
    try {
      oauth2Client.setCredentials(JSON.parse(stored.value))
    } catch (e) { logger.error({ err: e }, 'Failed to parse stored Google tokens') }
  }

  return oauth2Client
}

function getGoogleAuth() {
  const client = getOAuth2Client()
  if (!client || !client.credentials?.access_token) {
    return null
  }
  return client
}

function getAuthUrl(state) {
  const client = getOAuth2Client()
  if (!client) return null
  return client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/tasks',
    ],
    state,
  })
}

async function handleCallback(code, state) {
  const expected = get('SELECT value FROM settings WHERE key = ?', ['oauth_state'])
  if (expected && state !== expected.value) {
    throw new Error('Invalid OAuth state — possible CSRF attack')
  }
  run('DELETE FROM settings WHERE key = ?', ['oauth_state'])
  const client = getOAuth2Client()
  const { tokens } = await client.getToken(code)
  client.setCredentials(tokens)
  run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
    ['google_tokens', JSON.stringify(tokens)])
  return tokens
}

function disconnectGoogle() {
  run('DELETE FROM settings WHERE key = ?', ['google_tokens'])
  oauth2Client = null
}

module.exports = { getOAuth2Client, getGoogleAuth, getAuthUrl, handleCallback, disconnectGoogle }
