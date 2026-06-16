import { useState, useEffect, memo } from 'react'

const TypewriterText = memo(function TypewriterText({ text, delay = 0 }) {
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!text) return
    setDisplayed('')
    setDone(false)
    let intervalId = null
    const timerId = setTimeout(() => {
      let i = 0
      intervalId = setInterval(() => {
        i++
        setDisplayed(text.slice(0, i))
        if (i >= text.length) { clearInterval(intervalId); setDone(true) }
      }, 18)
    }, delay)
    return () => { clearTimeout(timerId); if (intervalId) clearInterval(intervalId) }
  }, [text, delay])

  return (
    <span>
      {displayed}
      {!done && <span className="animate-typewrite-cursor" style={{ color: 'var(--accent)' }}>|</span>}
    </span>
  )
})

export default TypewriterText
