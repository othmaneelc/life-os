import { useRef } from 'react'
import { useInView } from 'framer-motion'

export function useScrollAnimation(threshold = 0.1) {
  const ref = useRef()
  const inView = useInView(ref, { once: true, margin: '-50px' })
  return { ref, inView }
}
