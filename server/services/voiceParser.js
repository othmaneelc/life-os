const { query } = require('../db/database')
const { createThrottle } = require('./throttle')
const logger = require('./logger')

const throttle = createThrottle(1000)

function buildMultipart(fields, fileField, fileBuffer, fileName, mimeType) {
  const boundary = '----LifeOS' + Math.random().toString(36).slice(2)
  const parts = []
  for (const [key, val] of Object.entries(fields)) {
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${val}\r\n`))
  }
  parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${fileField}"; filename="${fileName}"\r\nContent-Type: ${mimeType}\r\n\r\n`))
  parts.push(fileBuffer)
  parts.push(Buffer.from(`\r\n--${boundary}--\r\n`))
  return { boundary, body: Buffer.concat(parts) }
}

async function transcribeAudio(audioBuffer) {
  const settings = query('SELECT * FROM settings')
  const groqKey = settings?.find(s => s.key === 'groq_key')?.value
  if (!groqKey) throw new Error('Groq API key not configured in settings')

  const userLang = settings?.find(s => s.key === 'language')?.value || 'en'
  const languageHint = userLang === 'auto' ? undefined : userLang

  const whisperFields = { model: 'whisper-large-v3', response_format: 'verbose_json' }
  if (languageHint) whisperFields.language = languageHint
  whisperFields.prompt = 'Transcribe the user\'s speech accurately. The user may have a Moroccan accent, may code-switch between English, French, and Arabic. Context: Life OS personal productivity app — tasks, schedule, habits, finance, agency, prayers, journaling, health.'

  const { default: fetch } = await import('node-fetch')
  const { boundary, body } = buildMultipart(
    whisperFields,
    'file',
    Buffer.from(audioBuffer),
    'audio.webm',
    'audio/webm'
  )

  const resp = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${groqKey}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
    body,
    signal: AbortSignal.timeout(30000),
  })

  if (!resp.ok) {
    const err = await resp.text().catch(() => '')
    throw new Error(`Whisper transcription failed (${resp.status}): ${err.slice(0, 200)}`)
  }

  const data = await resp.json()
  const text = (data.text || '').trim()
  logger.info({ language: data.language, duration: data.duration, avg_logprob: data.avg_logprob, no_speech_prob: data.no_speech_prob, text_length: text.length }, 'Whisper transcription')
  return text
}

function buildParsePrompt(transcript, clientDate, clientTimezone) {
  const today = clientDate ? new Date(clientDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
  const now = clientDate
    ? new Date(clientDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
    : new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })

  return `You are an intent parser for a Life OS personal assistant.
Given a transcription of a user's speech, extract ALL actionable items and return a JSON array.
Each item must follow this schema:
{
  "action": string,
  "params": object,
  "natural_summary": string
}

SUPPORTED ACTIONS AND PARAMS:

1. add_expense
   params: { amount: number, category: "Food & Drink"|"Transport"|"Shopping"|"Bills"|"Entertainment"|"Health"|"Business"|"Other", description: string }

2. add_income
   params: { amount: number, category: string, description: string }

3. create_task
   params: { title: string, priority: "high"|"medium"|"low", due_date: string|null, category: "urgent"|"business"|"personal"|null }
   IMPORTANT: resolve relative dates ("tomorrow", "next week", "Friday") to actual YYYY-MM-DD dates.

4. log_workout
   params: { name: string, sets: number|null, reps: number|null }

5. update_task_due_date
   params: { task_title: string, due_date: string }
   Resolve relative dates to YYYY-MM-DD.

6. log_prayer
   params: { prayer_name: "fajr"|"dhuhr"|"asr"|"maghrib"|"isha", done: true }

7. add_prospect
   params: { company_name: string, contact_name: string|null, phone: string|null, notes: string|null }

8. log_content
   params: { platform: "instagram"|"tiktok"|"youtube"|"x"|"facebook", content_type: "post"|"reel"|"short"|"story"|"carousel", client: string|null, caption: string|null }

9. create_habit
   params: { name: string, frequency: "daily"|"weekly" }

10. add_transaction
    params: { type: "income"|"expense", category: string, amount: number, description: string }

RULES:
- Return ONLY a valid JSON array. No markdown, no explanation, no code fences.
- If no actions can be extracted, return [].
- Resolve relative dates using today's date: ${today}.
- All amounts are in MAD (Moroccan Dirham) unless specified otherwise ("dollars", "euros", "$").
- For French or Arabic transcriptions: action names in English, parse numbers correctly.
- Deduplicate identical actions. Max 5 actions per transcription.
- natural_summary must be <60 chars in English.

Today's date: ${today}
Current time: ${now}
Client timezone: ${clientTimezone}`
}

async function parseIntent(transcript, clientDate, clientTimezone) {
  const settings = query('SELECT * FROM settings')
  const groqKey = settings?.find(s => s.key === 'groq_key')?.value
  if (!groqKey) throw new Error('Groq API key not configured')

  await throttle()

  const { default: fetch } = await import('node-fetch')
  const prompt = buildParsePrompt(transcript, clientDate, clientTimezone)

  const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${groqKey}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: `Transcription: "${transcript}"\n\n${prompt}` }],
      temperature: 0.1,
      max_tokens: 1024,
    }),
    signal: AbortSignal.timeout(15000),
  })

  if (!resp.ok) {
    const err = await resp.text().catch(() => '')
    throw new Error(`Intent parsing failed (${resp.status}): ${err.slice(0, 200)}`)
  }

  const data = await resp.json()
  const content = (data.choices?.[0]?.message?.content || '[]').trim()

  try {
    return JSON.parse(content)
  } catch {
    const cleaned = content.replace(/```json?\s*/gi, '').replace(/```\s*/g, '').trim()
    try { return JSON.parse(cleaned) } catch {}
    throw new Error(`Failed to parse LLM response as JSON: ${content.slice(0, 300)}`)
  }
}

async function processVoiceInput(audioBuffer, clientDate, clientTimezone) {
  const transcript = await transcribeAudio(audioBuffer)
  if (!transcript) {
    return { transcript: '', actions: [], natural_summary: 'No speech detected' }
  }
  const actions = await parseIntent(transcript, clientDate, clientTimezone)
  const firstSummary = actions?.[0]?.natural_summary
  const natural_summary = actions?.length
    ? `${actions.length} action${actions.length > 1 ? 's' : ''}${firstSummary ? ': ' + firstSummary : ''}`
    : 'No actionable items found'
  return { transcript, actions: actions || [], natural_summary }
}

module.exports = { processVoiceInput, parseIntent }
