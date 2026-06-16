const crypto = require('crypto')

const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32
const IV_LENGTH = 16
const TAG_LENGTH = 16
const SALT_LENGTH = 32

let vaultKey = null

function deriveKey(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 100000, KEY_LENGTH, 'sha512')
}

function hashPassword(password) {
  const salt = crypto.randomBytes(SALT_LENGTH)
  const key = deriveKey(password, salt)
  return salt.toString('hex') + ':' + key.toString('hex')
}

function verifyPassword(password, stored) {
  const [saltHex, keyHex] = stored.split(':')
  const salt = Buffer.from(saltHex, 'hex')
  const key = deriveKey(password, salt)
  return key.toString('hex') === keyHex
}

function setVaultKey(password) {
  vaultKey = crypto.createHash('sha256').update(password).digest()
}

function clearVaultKey() {
  vaultKey = null
}

function encrypt(text) {
  if (!vaultKey) throw new Error('Vault not unlocked')
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, vaultKey, iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const authTag = cipher.getAuthTag()
  return { encrypted, iv: iv.toString('hex'), authTag: authTag.toString('hex') }
}

function decrypt(encryptedHex, ivHex, authTagHex) {
  if (!vaultKey) throw new Error('Vault not unlocked')
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  const decipher = crypto.createDecipheriv(ALGORITHM, vaultKey, iv)
  decipher.setAuthTag(authTag)
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

module.exports = { hashPassword, verifyPassword, setVaultKey, clearVaultKey, encrypt, decrypt }
