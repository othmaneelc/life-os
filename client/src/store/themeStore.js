import { createWithEqualityFn } from 'zustand/traditional'

function getInitialTheme() {
  try { return localStorage.getItem('lifeos-theme') || 'light' } catch { return 'light' }
}

function getInitialAutoTheme() {
  try { return localStorage.getItem('lifeos-auto-theme') === 'true' } catch { return false }
}

const initialTheme = getInitialTheme()
if (initialTheme === 'dark' || initialTheme === 'monk' || initialTheme === 'night') {
  document.documentElement.classList.add('dark')
}
document.documentElement.setAttribute('data-theme', initialTheme)

const savedAccent = (() => { try { return localStorage.getItem('lifeos-accent') } catch { return null } })()
if (savedAccent) document.documentElement.style.setProperty('--accent', savedAccent)

function themeByHour() {
  const h = new Date().getHours()
  if (h >= 6 && h < 17) return 'light'
  if (h >= 17 && h < 20) return 'night'
  return 'dark'
}

let autoThemeTimer = null

export function startAutoTheme() {
  if (autoThemeTimer) return
  const apply = () => document.documentElement.setAttribute('data-theme', themeByHour())
  apply()
  autoThemeTimer = setInterval(apply, 60000)
}

export function stopAutoTheme() {
  if (autoThemeTimer) { clearInterval(autoThemeTimer); autoThemeTimer = null }
}

export const useThemeStore = createWithEqualityFn((set) => ({
  theme: initialTheme,
  autoTheme: getInitialAutoTheme(),

  setTheme: (theme) => {
    set({ theme })
    try { localStorage.setItem('lifeos-theme', theme) } catch {}
    document.documentElement.setAttribute('data-theme', theme)
    if (theme === 'dark' || theme === 'monk' || theme === 'night') document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
  },

  setAutoTheme: (enabled) => {
    set({ autoTheme: enabled })
    try { localStorage.setItem('lifeos-auto-theme', String(enabled)) } catch {}
    if (enabled) { startAutoTheme(); document.documentElement.setAttribute('data-theme', themeByHour()) }
    else { stopAutoTheme(); document.documentElement.setAttribute('data-theme', getInitialTheme()) }
  },

  setAccent: (color) => {
    document.documentElement.style.setProperty('--accent', color)
    try { localStorage.setItem('lifeos-accent', color) } catch {}
  },
}), Object.is)
