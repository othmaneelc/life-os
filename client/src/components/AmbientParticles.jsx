import { useRef, useEffect } from 'react'

export default function AmbientParticles({ count = 40, color, speed = 1 }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId
    let w, h

    const particles = Array.from({ length: count }, () => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.0008 * speed,
      vy: (Math.random() - 0.5) * 0.0008 * speed,
      size: 1 + Math.random() * 2,
      opacity: 0.15 + Math.random() * 0.35,
    }))

    const computedStyle = getComputedStyle(document.documentElement)
    const accent = color || computedStyle.getPropertyValue('--accent').trim() || '#818CF8'

    function resize() {
      w = canvas.width = window.innerWidth
      h = canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    function draw() {
      ctx.clearRect(0, 0, w, h)

      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0 || p.x > 1) p.vx *= -1
        if (p.y < 0 || p.y > 1) p.vy *= -1

        ctx.beginPath()
        ctx.arc(p.x * w, p.y * h, p.size, 0, Math.PI * 2)
        ctx.fillStyle = accent
        ctx.globalAlpha = p.opacity * 0.5
        ctx.fill()
      }
      ctx.globalAlpha = 1
      animId = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [count, color, speed])

  return (
    <canvas
      ref={canvasRef}
      className='fixed inset-0 pointer-events-none'
      style={{ zIndex: 0, opacity: 0.6 }}
      aria-hidden='true'
    />
  )
}
