const DB = 'lifeos-offline'
const VERSION = 3
const CACHE = 'api-cache'
const QUEUE = 'write-queue'
const MAX_CACHE_AGE = 30 * 60 * 1000
const MAX_CACHE_ENTRIES = 200
const MAX_RETRIES = 10

function db() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, VERSION)
    req.onupgradeneeded = (e) => {
      const d = e.target.result
      if (!d.objectStoreNames.contains(CACHE)) d.createObjectStore(CACHE, { keyPath: 'k' })
      if (!d.objectStoreNames.contains(QUEUE)) {
        const s = d.createObjectStore(QUEUE, { keyPath: 'id', autoIncrement: true })
        s.createIndex('ts', 'ts')
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function tx(db, name, mode) {
  const t = db.transaction(name, mode)
  return { tx: t, store: t.objectStore(name) }
}

function reqPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function waitComplete(t) {
  return new Promise((resolve, reject) => {
    t.oncomplete = () => resolve()
    t.onerror = () => reject(t.error)
  })
}

export async function cacheApiGet(key, data) {
  const d = await db()
  const { store, tx: t } = tx(d, CACHE, 'readwrite')
  try {
    await reqPromise(store.put({ k: key, data, ts: Date.now() }))
    const all = await reqPromise(store.getAll())
    if (all.length > MAX_CACHE_ENTRIES) {
      all.sort((a, b) => a.ts - b.ts)
      for (const entry of all.slice(0, all.length - MAX_CACHE_ENTRIES)) {
        await reqPromise(store.delete(entry.k))
      }
    }
    await waitComplete(t)
  } finally { d.close() }
}

export async function getCachedApiGet(key) {
  const d = await db()
  const { store, tx: t } = tx(d, CACHE, 'readonly')
  try {
    const entry = await reqPromise(store.get(key))
    if (!entry) return null
    if (Date.now() - entry.ts > MAX_CACHE_AGE) {
      await reqPromise(store.delete(key))
      await waitComplete(t)
      return null
    }
    return entry.data
  } finally { d.close() }
}

export async function enqueueWrite(url, options) {
  const d = await db()
  const { store, tx: t } = tx(d, QUEUE, 'readwrite')
  try {
    await reqPromise(store.add({ url, options, ts: Date.now(), retries: 0 }))
    await waitComplete(t)
  } finally { d.close() }
}

export async function queueLength() {
  const d = await db()
  const { store } = tx(d, QUEUE, 'readonly')
  try {
    return await reqPromise(store.count())
  } finally { d.close() }
}

let processing = false
export async function processQueue(onProgress) {
  if (processing) return 0
  processing = true
  let replayed = 0
  const d = await db()
  try {
    const { store, tx: t } = tx(d, QUEUE, 'readwrite')
    const all = await reqPromise(store.getAll())
    for (const item of all) {
      if (item.retries >= MAX_RETRIES) { await reqPromise(store.delete(item.id)); continue }
      try {
        const token = localStorage.getItem('lifeos-token')
        const headers = { ...item.options?.headers }
        if (token) headers.Authorization = `Bearer ${token}`
        const r = await fetch(item.url, { ...item.options, headers })
        if (r.ok) { await reqPromise(store.delete(item.id)); replayed++ }
        else {
          item.retries++
          await reqPromise(store.put(item))
        }
      } catch {
        item.retries++
        await reqPromise(store.put(item))
      }
    }
    await waitComplete(t)
  } finally { d.close(); processing = false }
  if (onProgress) onProgress(replayed)
  return replayed
}
