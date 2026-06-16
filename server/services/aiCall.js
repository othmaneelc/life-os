const { query } = require('../db/database')
const { createThrottle } = require('./throttle')

const throttle = createThrottle(2000)

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function getAIConfig() {
  const settings = query('SELECT * FROM settings')
  const groqKey = settings?.find(s => s.key === 'groq_key')?.value
  const geminiKey = settings?.find(s => s.key === 'gemini_key')?.value
  const openaiKey = settings?.find(s => s.key === 'openai_key')?.value

  const configs = []
  if (groqKey) {
    configs.push({ provider: 'groq', key: groqKey, model: 'llama-3.3-70b-versatile', url: 'https://api.groq.com/openai/v1/chat/completions' })
    configs.push({ provider: 'groq', key: groqKey, model: 'llama-3.1-8b-instant', url: 'https://api.groq.com/openai/v1/chat/completions' })
  }
  if (geminiKey) configs.push({ provider: 'gemini', key: geminiKey, model: 'gemini-2.0-flash', url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions' })
  if (openaiKey) configs.push({ provider: 'openai', key: openaiKey, model: 'gpt-4o-mini', url: 'https://api.openai.com/v1/chat/completions' })
  return configs.length > 0 ? configs : null
}

function getFallbackConfig(allConfigs, usedModels) {
  return allConfigs.find(c => !usedModels.includes(c.model)) || null
}

function parseRetryAfter(errText) {
  try {
    const match = errText.match(/try again in (\d+(?:\.\d+)?)s/)
    if (match) return Math.ceil(parseFloat(match[1])) + 1
  } catch {}
  return null
}

async function aiCall(config, messages, maxTokens = 2048, temperature = 0.7) {
  const { default: fetch } = await import('node-fetch')
  // config can be a single config or an array from getAIConfig
  const allConfigs = Array.isArray(config) ? config : [config]
  let currentConfig = allConfigs[0]
  const usedModels = [currentConfig.model]

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await throttle()
      const tokens = attempt === 0 ? maxTokens : Math.min(maxTokens, 1024)
      const resp = await fetch(currentConfig.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${currentConfig.key}` },
        body: JSON.stringify({ model: currentConfig.model, messages, temperature, max_tokens: tokens }),
        signal: AbortSignal.timeout(30000),
      })
      if (resp.status === 429) {
        const errText = await resp.text().catch(() => '')
        const retryAfter = parseRetryAfter(errText)
        if (retryAfter) await sleep(retryAfter * 1000)
        const fallback = getFallbackConfig(allConfigs, usedModels)
        if (fallback) { currentConfig = fallback; usedModels.push(fallback.model); continue }
        throw new Error(`AI rate limited. ${retryAfter ? `Retry after ${retryAfter}s.` : 'Try again in a moment.'}`)
      }
      if (!resp.ok) {
        const errText = await resp.text().catch(() => '')
        // Fallback on server errors (5xx) and model errors (404)
        if (resp.status >= 500 || resp.status === 404) {
          const fallback = getFallbackConfig(allConfigs, usedModels)
          if (fallback) { currentConfig = fallback; usedModels.push(fallback.model); continue }
        }
        throw new Error(`AI provider error (${resp.status}): ${errText || resp.statusText}`)
      }
      const data = await resp.json()
      return data.choices?.[0]?.message?.content || null
    } catch (err) {
      if (err.name === 'TimeoutError' || err.code === 'UND_ERR_CONNECT_TIMEOUT') {
        const fallback = getFallbackConfig(allConfigs, usedModels)
        if (fallback) { currentConfig = fallback; usedModels.push(fallback.model); continue }
        throw new Error('AI request timed out. Try again.')
      }
      // If it's our own error (from above), don't retry
      if (err.message?.includes('AI provider error') || err.message?.includes('AI rate limited')) throw err
      if (attempt < 2) {
        const fallback = getFallbackConfig(allConfigs, usedModels)
        if (fallback) { currentConfig = fallback; usedModels.push(fallback.model); continue }
      }
      throw err
    }
  }
  return null
}

async function* streamAiCall(config, messages, maxTokens = 2048, temperature = 0.7) {
  const { default: fetch } = await import('node-fetch')
  const allConfigs = Array.isArray(config) ? config : [config]
  let currentConfig = allConfigs[0]
  const usedModels = [currentConfig.model]

  for (let attempt = 0; attempt < 3; attempt++) {
    await throttle()
    const tokens = attempt === 0 ? maxTokens : Math.min(maxTokens, 1024)

    let resp
    try {
      resp = await fetch(currentConfig.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${currentConfig.key}` },
        body: JSON.stringify({ model: currentConfig.model, messages, temperature, max_tokens: tokens, stream: true }),
        signal: AbortSignal.timeout(60000),
      })
    } catch (err) {
      const fallback = getFallbackConfig(allConfigs, usedModels)
      if (fallback) { currentConfig = fallback; usedModels.push(fallback.model); continue }
      throw err
    }

    if (resp.status === 429) {
      const errText = await resp.text().catch(() => '')
      const retryAfter = parseRetryAfter(errText)
      if (retryAfter) await sleep(retryAfter * 1000)
      const fallback = getFallbackConfig(allConfigs, usedModels)
      if (fallback) { currentConfig = fallback; usedModels.push(fallback.model); continue }
      throw new Error(`AI rate limited. ${retryAfter ? `Retry after ${retryAfter}s.` : 'Try again in a moment.'}`)
    }
    if (!resp.ok) {
      const errText = await resp.text().catch(() => '')
      if (resp.status >= 500) {
        const fallback = getFallbackConfig(allConfigs, usedModels)
        if (fallback) { currentConfig = fallback; usedModels.push(fallback.model); continue }
      }
      throw new Error(`AI provider error (${resp.status}): ${errText || resp.statusText}`)
    }

    if (!resp.body) { yield await aiCall(config, messages, maxTokens, temperature); return }

    const decoder = new TextDecoder()
    let buffer = ''

    if (typeof resp.body.getReader === 'function') {
      const reader = resp.body.getReader()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        for (const token of parseChunks(buffer)) {
          if (token.skip) continue
          buffer = token.buffer
          if (token.content) yield token.content
          if (token.done) return
        }
      }
    } else {
      for await (const chunk of resp.body) {
        buffer += typeof chunk === 'string' ? chunk : decoder.decode(chunk, { stream: true })
        for (const token of parseChunks(buffer)) {
          if (token.skip) continue
          buffer = token.buffer
          if (token.content) yield token.content
          if (token.done) return
        }
      }
    }
  }
  // If we exhaust all retries, throw explicitly
  throw new Error('All AI providers failed. Please try again later.')
}

function parseChunks(buffer) {
  const lines = buffer.split('\n')
  const remaining = lines.pop() || ''
  const result = { buffer: remaining, content: '', done: false, skip: false }
  for (const line of lines) {
    const clean = line.replace(/\r$/, '')
    if (!clean.startsWith('data: ')) continue
    const data = clean.slice(6).trim()
    if (data === '[DONE]') { result.done = true; return [result] }
    try {
      const parsed = JSON.parse(data)
      const content = parsed.choices?.[0]?.delta?.content || ''
      const finishReason = parsed.choices?.[0]?.finish_reason
      if (content) result.content += content
      if (finishReason === 'stop' || finishReason === 'length') result.done = true
    } catch {}
  }
  return [result]
}

module.exports = { getAIConfig, aiCall, streamAiCall }