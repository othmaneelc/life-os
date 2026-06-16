import { useEffect, useRef } from 'react'
import { useScheduleStore } from '../../store/scheduleStore'

export function useScheduleKeyboard() {
  const stateRef = useRef({})

  useEffect(() => {
    const unsub = useScheduleStore.subscribe((s) => {
      stateRef.current = {
        showModal: s.showModal,
        showDetails: s.showDetails,
      }
    })
    return unsub
  }, [])

  useEffect(() => {
    function handleKeys(e) {
      const { showModal, showDetails } = stateRef.current
      if (showModal || showDetails) return
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      const store = useScheduleStore.getState()
      if (e.key === 'n' || e.key === 'N') { e.preventDefault(); store.openNewEvent() }
      if (e.key === 't' || e.key === 'T') { e.preventDefault(); store.goToday() }
      if (e.key === 'd' || e.key === 'D') { e.preventDefault(); store.setViewMode('day') }
      if (e.key === 'w' || e.key === 'W') { e.preventDefault(); store.setViewMode('week') }
      if (e.key === 'm' || e.key === 'M') { e.preventDefault(); store.setViewMode('month') }
      if (e.key === 'l' || e.key === 'L') { e.preventDefault(); store.setViewMode('list') }
      if (e.key === 'ArrowLeft') { e.preventDefault(); store.navigate(-1) }
      if (e.key === 'ArrowRight') { e.preventDefault(); store.navigate(1) }
      if (e.key === 'Escape') { store.setShowDetails(null) }
    }
    window.addEventListener('keydown', handleKeys)
    return () => window.removeEventListener('keydown', handleKeys)
  }, [])
}
