import { motion } from 'framer-motion'

const Path = motion.path
const Rect = motion.rect

export function LogoIcon({ size = 28, animate = true }) {
  const s = typeof size === 'number' ? size : 28
  const view = s > 40 ? 48 : 28

  return (
    <svg width={s} height={s} viewBox={`0 0 ${view} ${view}`} fill="none" xmlns="http://www.w3.org/2000/svg">
      <Rect
        x="2" y="2" width={view - 4} height={view - 4} rx={view / 5}
        fill="url(#logo-gradient)"
        initial={animate ? { scale: 0.8, opacity: 0 } : undefined}
        animate={animate ? { scale: 1, opacity: 1 } : undefined}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      />
      <Path
        d={view > 40
          ? "M 14 32 L 14 14 Q 14 10 18 10 L 22 10"
          : "M 8 20 L 8 8 Q 8 6 10 6 L 12 6"}
        stroke="white" strokeWidth={view / 14} strokeLinecap="round" strokeLinejoin="round"
        initial={animate ? { pathLength: 0 } : { pathLength: 1 }}
        animate={animate ? { pathLength: 1 } : { pathLength: 1 }}
        transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
      />
      <Path
        d={view > 40
          ? "M 26 32 L 26 20 Q 26 18 28 18 L 30 18 M 26 24 L 30 24"
          : "M 16 20 L 16 12 Q 16 10 18 10 L 19 10 M 16 14 L 19 14"}
        stroke="white" strokeWidth={view / 14} strokeLinecap="round" strokeLinejoin="round"
        initial={animate ? { pathLength: 0 } : { pathLength: 1 }}
        animate={animate ? { pathLength: 1 } : { pathLength: 1 }}
        transition={{ duration: 0.5, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
      />
      <defs>
        <linearGradient id="logo-gradient" x1="0" y1="0" x2={view} y2={view}>
          <stop offset="0%" stopColor="#5B5BD6" />
          <stop offset="100%" stopColor="#818CF8" />
        </linearGradient>
      </defs>
    </svg>
  )
}

export function LogoWordmark({ size = 18 }) {
  return (
    <span className="flex items-center gap-2">
      <LogoIcon size={size + 10} animate={false} />
      <span className="font-bold tracking-tight" style={{ fontSize: size, color: 'var(--text-primary)' }}>
        Life <span className="gradient-text">OS</span>
      </span>
    </span>
  )
}
