import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

function FlipDigit({ digit, isFullscreen }) {
  const display = String(digit).padStart(2, '0')
  const persp = isFullscreen ? '800px' : '300px'

  return (
    <div className='flip-digit-container'>
      {display.split('').map((d, i) => (
        <div
          key={i}
          className='flip-digit relative inline-flex items-center justify-center'
          style={{ perspective: persp }}
        >
          <AnimatePresence mode='popLayout'>
            <motion.span
              key={d}
              initial={{ rotateX: -90, opacity: 0 }}
              animate={{ rotateX: 0, opacity: 1 }}
              exit={{ rotateX: 90, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.65, 0, 0.35, 1] }}
              className='flip-digit-inner inline-flex items-center justify-center font-mono tabular-nums leading-none'
              style={{ backfaceVisibility: 'hidden' }}
            >
              {d}
            </motion.span>
          </AnimatePresence>
        </div>
      ))}
    </div>
  )
}

export default function FlipClock({ className = '', size = 'default' }) {
  const [time, setTime] = useState(new Date())
  const isFullscreen = size === 'fullscreen'

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const h = time.getHours()
  const m = time.getMinutes()
  const s = time.getSeconds()
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12

  const sizeClasses = isFullscreen
    ? 'text-[16vw] gap-4'
    : size === 'hero'
      ? 'text-3xl gap-1.5'
      : 'text-xl gap-1'

  const colonSize = isFullscreen ? 'text-[10vw]' : size === 'hero' ? 'text-2xl' : 'text-lg'

  return (
    <div className={'flip-clock flex items-center ' + className + ' ' + sizeClasses} style={{ fontVariantNumeric: 'tabular-nums' }}>
      <FlipDigit digit={h12} isFullscreen={isFullscreen} />
      <span className={'flip-colon animate-pulse-colon ' + colonSize} style={{ opacity: 0.3 }}>:</span>
      <FlipDigit digit={m} isFullscreen={isFullscreen} />
      {isFullscreen && (
        <>
          <span className={'flip-colon animate-pulse-colon ' + colonSize} style={{ opacity: 0.3 }}>:</span>
          <FlipDigit digit={s} isFullscreen={isFullscreen} />
        </>
      )}
      <span
        className='flip-ampm font-medium'
        style={{
          fontSize: isFullscreen ? '0.2em' : '0.4em',
          opacity: 0.4,
          alignSelf: isFullscreen ? 'flex-end' : 'center',
          marginBottom: isFullscreen ? '0.6em' : 0,
          marginLeft: isFullscreen ? '0.3em' : '0.4em',
        }}
      >
        {ampm}
      </span>
    </div>
  )
}
