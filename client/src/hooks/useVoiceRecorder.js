import { useState, useRef, useCallback, useEffect } from 'react'

const STATES = {
  IDLE: 'idle',
  RECORDING: 'recording',
  PROCESSING: 'processing',
  SUCCESS: 'success',
  ERROR: 'error',
}

const SILENCE_THRESHOLD_MS = 800
const MAX_DURATION_MS = 120_000
const OPUS_MIME = 'audio/webm;codecs=opus'

function bestSupportedMime() {
  if (MediaRecorder.isTypeSupported(OPUS_MIME)) return OPUS_MIME
  if (MediaRecorder.isTypeSupported('audio/webm')) return 'audio/webm'
  return 'audio/mp4'
}

function getClientContext() {
  return {
    clientTimestamp: new Date().toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    currentRoute: window.location.pathname,
  }
}

async function sendVoiceForProcessing(blob, mimeType) {
  const fd = new FormData()
  fd.append('audio', blob, `capture.${mimeType.includes('mp4') ? 'mp4' : 'webm'}`)
  const context = getClientContext()
  fd.append('clientTimestamp', context.clientTimestamp)
  fd.append('timezone', context.timezone)
  fd.append('currentRoute', context.currentRoute)

  const res = await fetch('/api/voice/inbox', { method: 'POST', body: fd })
  if (!res.ok) { const e = await res.json().catch(() => ({ error: 'Voice processing failed' })); throw new Error(e.error) }
  const data = await res.json()
  return data
}

export function useVoiceRecorder({ onResult, onError } = {}) {
  const [state, setState] = useState(STATES.IDLE)
  const [durationMs, setDurationMs] = useState(0)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)

  const mediaRecorder = useRef(null)
  const streamRef = useRef(null)
  const chunks = useRef([])
  const durationInterval = useRef(null)
  const silenceCheckInterval = useRef(null)
  const analyserRef = useRef(null)
  const audioContextRef = useRef(null)
  const startTime = useRef(0)
  const abortRef = useRef(false)

  const cleanup = useCallback(() => {
    clearInterval(durationInterval.current)
    clearInterval(silenceCheckInterval.current)
    if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
      try { mediaRecorder.current.stop() } catch {}
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    chunks.current = []
    setDurationMs(0)
  }, [])

  const reset = useCallback(() => {
    cleanup()
    setState(STATES.IDLE)
    setError(null)
    setResult(null)
  }, [cleanup])

  const startRecording = useCallback(async () => {
    try {
      reset()
      abortRef.current = false
      chunks.current = []
      setState(STATES.RECORDING)

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const audioContext = new AudioContext()
      audioContextRef.current = audioContext
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 512
      source.connect(analyser)
      analyserRef.current = analyser

      const mimeType = bestSupportedMime()
      const recorder = new MediaRecorder(stream, mimeType === 'audio/mp4' ? {} : { mimeType })
      mediaRecorder.current = recorder

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data)
      }

      recorder.onstop = async () => {
        if (abortRef.current) { cleanup(); setState(STATES.IDLE); return }
        setState(STATES.PROCESSING)

        const blob = new Blob(chunks.current, { type: mimeType })

        try {
          const data = await sendVoiceForProcessing(blob, mimeType)
          if (abortRef.current) { cleanup(); return }
          setResult(data)
          setState(STATES.SUCCESS)
          onResult?.(data)
        } catch (err) {
          if (abortRef.current) { cleanup(); return }
          setError(err.message)
          setState(STATES.ERROR)
          onError?.(err)
        } finally {
          if (!abortRef.current) cleanup()
        }
      }

      recorder.start(250)

      startTime.current = Date.now()
      durationInterval.current = setInterval(() => {
        setDurationMs(Date.now() - startTime.current)
      }, 100)

      const dataArray = new Uint8Array(analyser.frequencyBinCount)
      let lastSound = Date.now()

      silenceCheckInterval.current = setInterval(() => {
        analyser.getByteFrequencyData(dataArray)
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length
        if (avg > 10) { lastSound = Date.now() }
        else if (Date.now() - lastSound > SILENCE_THRESHOLD_MS && recorder.state === 'recording') {
          recorder.stop()
        }
        if (Date.now() - startTime.current > MAX_DURATION_MS && recorder.state === 'recording') {
          recorder.stop()
        }
      }, 200)

      recorder.onerror = () => {
        setError('Recording failed')
        setState(STATES.ERROR)
        cleanup()
      }
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Microphone permission denied')
      } else {
        setError(err.message || 'Could not start recording')
      }
      setState(STATES.ERROR)
      onError?.(err)
    }
  }, [onResult, onError, reset, cleanup])

  const stopRecording = useCallback(() => {
    if (mediaRecorder.current && mediaRecorder.current.state === 'recording') {
      mediaRecorder.current.stop()
    }
  }, [])

  const cancelRecording = useCallback(() => {
    abortRef.current = true
    cleanup()
    setState(STATES.IDLE)
  }, [cleanup])

  useEffect(() => {
    return () => {
      abortRef.current = true
      cleanup()
    }
  }, [cleanup])

  return {
    state,
    startRecording,
    stopRecording,
    cancelRecording,
    reset,
    durationMs,
    error,
    result,
    isRecording: state === STATES.RECORDING,
    isProcessing: state === STATES.PROCESSING,
    isIdle: state === STATES.IDLE,
    isSuccess: state === STATES.SUCCESS,
    isError: state === STATES.ERROR,
  }
}
