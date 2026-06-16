import { useState, useRef, useCallback, useEffect } from 'react'

const SILENCE_THRESHOLD_MS = 800
const MAX_DURATION_MS = 120_000

export function useAudioCapture({ onResult, onError, maxDuration = MAX_DURATION_MS, silenceThreshold = SILENCE_THRESHOLD_MS } = {}) {
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [durationMs, setDurationMs] = useState(0)
  const [error, setError] = useState(null)

  const mediaRecorder = useRef(null)
  const streamRef = useRef(null)
  const chunks = useRef([])
  const durationInterval = useRef(null)
  const silenceTimer = useRef(null)
  const analyserRef = useRef(null)
  const silenceCheckInterval = useRef(null)
  const startTime = useRef(0)
  const abortRef = useRef(false)

  const cleanup = useCallback(() => {
    clearInterval(durationInterval.current)
    clearTimeout(silenceTimer.current)
    clearInterval(silenceCheckInterval.current)
    if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
      try { mediaRecorder.current.stop() } catch {}
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    chunks.current = []
    setDurationMs(0)
    setIsRecording(false)
  }, [])

  const startRecording = useCallback(async () => {
    try {
      setError(null)
      abortRef.current = false
      setIsRecording(true)
      setDurationMs(0)
      chunks.current = []

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const audioContext = new AudioContext()
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 512
      source.connect(analyser)
      analyserRef.current = analyser

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4'

      const recorder = new MediaRecorder(stream, mimeType === 'audio/mp4' ? {} : { mimeType })
      mediaRecorder.current = recorder

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data)
      }

      recorder.onstop = async () => {
        if (abortRef.current) { cleanup(); return }
        setIsRecording(false)
        setIsProcessing(true)

        const blob = new Blob(chunks.current, { type: mimeType })
        const formData = new FormData()
        formData.append('audio', blob, 'capture.webm')
        formData.append('clientDate', new Date().toISOString())
        formData.append('clientTimezone', Intl.DateTimeFormat().resolvedOptions().timeZone)

        try {
          const res = await fetch('/api/voice/inbox', { method: 'POST', body: formData })
          if (!res.ok) { const e = await res.json().catch(() => ({ error: 'Voice processing failed' })); throw new Error(e.error) }
          const data = await res.json()
          onResult?.(data)
        } catch (err) {
          setError(err.message)
          onError?.(err)
        } finally {
          setIsProcessing(false)
          cleanup()
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
        else if (Date.now() - lastSound > silenceThreshold && recorder.state === 'recording') {
          recorder.stop()
        }
        if (Date.now() - startTime.current > maxDuration && recorder.state === 'recording') {
          recorder.stop()
        }
      }, 200)

      recorder.onerror = () => {
        setError('Recording failed')
        cleanup()
      }
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Microphone permission denied')
      } else {
        setError(err.message || 'Could not start recording')
      }
      setIsRecording(false)
      onError?.(err)
    }
  }, [onResult, onError, maxDuration, silenceThreshold, cleanup])

  const stopRecording = useCallback(() => {
    if (mediaRecorder.current && mediaRecorder.current.state === 'recording') {
      mediaRecorder.current.stop()
    }
  }, [])

  const cancelRecording = useCallback(() => {
    abortRef.current = true
    cleanup()
  }, [cleanup])

  useEffect(() => {
    return () => {
      abortRef.current = true
      cleanup()
    }
  }, [cleanup])

  return {
    startRecording,
    stopRecording,
    cancelRecording,
    isRecording,
    isProcessing,
    durationMs,
    error,
  }
}
