import { useState, useEffect } from 'react'

let deferredPrompt = null
let installResolve = null

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  deferredPrompt = e
  if (installResolve) {
    installResolve(deferredPrompt)
    installResolve = null
  }
})

export function usePWAInstall() {
  const [installable, setInstallable] = useState(!!deferredPrompt)

  useEffect(() => {
    if (deferredPrompt) return
    const handler = () => setInstallable(true)
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const promptInstall = async () => {
    if (!deferredPrompt) return false
    deferredPrompt.prompt()
    const result = await deferredPrompt.userChoice
    deferredPrompt = null
    setInstallable(false)
    return result.outcome === 'accepted'
  }

  return { installable, promptInstall }
}
