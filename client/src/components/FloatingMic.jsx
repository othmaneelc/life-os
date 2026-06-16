import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Square, Loader2, Check, AlertCircle } from 'lucide-react'
import { useVoiceRecorder } from '../hooks/useVoiceRecorder'
import { useAppUIStore } from '../store/appUIStore'

function formatDuration(ms) {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${String(sec).padStart(2, '0')}`
}

const stateConfig = {
  idle: { icon: Mic, label: 'Voice command', btnClass: 'bg-apple-card/80 backdrop-blur-xl border-apple-border hover:bg-apple-card hover:shadow-apple-xl', iconClass: 'text-apple-text' },
  recording: { icon: Square, label: null, btnClass: 'bg-red-500 border-red-400 scale-110 shadow-red-500/20', iconClass: 'text-white fill-white' },
  processing: { icon: Loader2, label: 'Processing...', btnClass: 'bg-apple-card border-apple-border', iconClass: 'text-apple-muted' },
  success: { icon: Check, label: 'Done', btnClass: 'bg-apple-green/20 border-apple-green/30', iconClass: 'text-apple-green' },
  error: { icon: AlertCircle, label: null, btnClass: 'bg-red-500/20 border-red-500/30', iconClass: 'text-red-500' },
}

export default function FloatingMic() {
  const [showTooltip, setShowTooltip] = useState(false)
  const longPressTimer = useRef(null)

  const resultTimer = useRef(null)
  const errorTimer = useRef(null)

  const { state, startRecording, stopRecording, cancelRecording, reset, durationMs, error, isRecording, isProcessing, isSuccess, isError, result } = useVoiceRecorder({})

  const handleResult = useCallback((data) => {
    if (resultTimer.current) clearTimeout(resultTimer.current)
    resultTimer.current = setTimeout(() => reset(), 2000)
  }, [reset])

  const handleError = useCallback((err) => {
    if (errorTimer.current) clearTimeout(errorTimer.current)
    errorTimer.current = setTimeout(() => reset(), 3000)
  }, [reset])

  const cfg = stateConfig[state]

  useEffect(() => {
    useAppUIStore.getState().setVoiceRecording(true)
    return () => {
      useAppUIStore.getState().setVoiceRecording(false)
      if (resultTimer.current) clearTimeout(resultTimer.current)
      if (errorTimer.current) clearTimeout(errorTimer.current)
    }
  }, [])

  useEffect(() => {
    window.__startVoiceRecording = () => {
      if (!isRecording && !isProcessing) startRecording()
    }
    return () => { delete window.__startVoiceRecording }
  }, [startRecording, isRecording, isProcessing])

  const handlePointerDown = useCallback((e) => {
    e.preventDefault()
    if (isRecording || isProcessing) return
    longPressTimer.current = setTimeout(() => {
      startRecording()
    }, 200)
  }, [isRecording, isProcessing, startRecording])

  const handlePointerUp = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    if (isRecording) {
      stopRecording()
    } else if (!isProcessing && !isSuccess && !isError) {
      startRecording()
    }
  }, [isRecording, isProcessing, isSuccess, isError, stopRecording, startRecording])

  const handlePointerLeave = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }, [])

  const tooltipText = isError
    ? (error || 'Recording failed')
    : isSuccess
      ? (result?.natural_summary || 'Got it!')
      : isRecording
        ? formatDuration(durationMs)
        : (showTooltip ? 'Tap or hold to record' : null)

  return (
    <div className="fixed bottom-6 right-24 z-40 flex flex-col items-end gap-2" style={{ bottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}>
      <AnimatePresence>
        {(tooltipText) && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            className={`px-3 py-1.5 rounded-full text-micro font-medium backdrop-blur-md border shadow-apple max-w-[200px] truncate ${
              isError
                ? 'bg-red-500/10 border-red-500/20 text-red-500'
                : isSuccess
                  ? 'bg-green-500/10 border-green-500/20 text-green-500'
                  : isRecording
                    ? 'bg-red-500/10 border-red-500/20 text-red-500'
                    : 'bg-apple-card/80 border-apple-border text-apple-muted'
            }`}
          >
            {tooltipText}
          </motion.div>
        )}
      </AnimatePresence>
      <motion.button
        onMouseDown={handlePointerDown}
        onMouseUp={handlePointerUp}
        onMouseLeave={() => { handlePointerLeave(); setShowTooltip(false) }}
        onTouchStart={handlePointerDown}
        onTouchEnd={handlePointerUp}
        onTouchCancel={handlePointerLeave}
        onMouseEnter={() => { if (!isRecording && !isProcessing && !isSuccess && !isError) setShowTooltip(true) }}
        whileTap={{ scale: 0.9 }}
        aria-label={isRecording ? 'Stop recording' : isProcessing ? 'Processing...' : 'Voice command'}
        className={`relative w-12 h-12 rounded-full flex items-center justify-center shadow-apple-lg border transition-all duration-200 ${cfg.btnClass}`}
      >
        <cfg.icon size={isProcessing ? 18 : isRecording ? 14 : 18} className={`${cfg.iconClass} ${isProcessing ? 'animate-spin' : ''}`} />
        {isRecording && (
          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 animate-pulse" />
        )}
      </motion.button>
    </div>
  )
}
