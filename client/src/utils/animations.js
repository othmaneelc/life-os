export const pageTransition = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
  transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] },
}

export const pageSlide = {
  initial: { opacity: 0, x: -12 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 12 },
  transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] },
}

export const staggerContainer = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.035,
      delayChildren: 0.05,
    },
  },
}

export const staggerItem = {
  initial: { opacity: 0, y: 10 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] },
  },
}

export const staggerItemFast = {
  initial: { opacity: 0, y: 8 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.18, ease: [0.22, 1, 0.36, 1] },
  },
}

export const modalBackdrop = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.15 },
}

export const modalContent = {
  initial: { opacity: 0, y: -16, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -16, scale: 0.97 },
  transition: { type: 'spring', stiffness: 400, damping: 28 },
}

export const cardHover = {
  whileHover: { y: -2, boxShadow: 'var(--shadow-card-hover)', transition: { duration: 0.15 } },
  whileTap: { scale: 0.99 },
}

export const buttonTap = {
  whileTap: { scale: 0.95 },
}

export const countUp = (target, duration = 0.6) => ({
  initial: { count: 0 },
  animate: { count: target },
  transition: { duration, ease: [0.22, 1, 0.36, 1] },
})

export const listStagger = {
  variants: staggerContainer,
  initial: 'initial',
  animate: 'animate',
}

export const itemStagger = {
  variants: staggerItem,
}

export const itemStaggerFast = {
  variants: staggerItemFast,
}

export const bentoCard = {
  initial: { opacity: 0, y: 20, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { type: 'spring', stiffness: 300, damping: 24 },
}

export const particleBurst = (count = 12) => ({
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.02,
    },
  },
})

export const particle = {
  initial: { opacity: 1, x: 0, y: 0, scale: 1 },
  animate: (i) => ({
    opacity: 0,
    x: Math.cos((i / 12) * Math.PI * 2) * 60,
    y: Math.sin((i / 12) * Math.PI * 2) * 60,
    scale: 0,
    transition: { duration: 0.6, ease: 'easeOut' },
  }),
}

export const typewriter = {
  hidden: { width: 0 },
  visible: (i) => ({
    width: '100%',
    transition: {
      delay: i * 0.04,
      duration: 0.5,
      ease: 'easeInOut',
    },
  }),
}

export const scaleIn = {
  initial: { opacity: 0, scale: 0.92 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.92 },
  transition: { type: 'spring', stiffness: 350, damping: 25 },
}
