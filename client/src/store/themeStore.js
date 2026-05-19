import { create } from 'zustand'

function getInitialTheme() {
  try { return localStorage.getItem('lifeos-theme') || 'light' } catch { return 'light' }
}

const initialTheme = getInitialTheme()
if (initialTheme === 'dark' || initialTheme === 'monk' || initialTheme === 'night') {
  document.documentElement.classList.add('dark')
}
document.documentElement.setAttribute('data-theme', initialTheme)

export const useThemeStore = create((set) => ({
  theme: initialTheme,

  setTheme: (theme) => {
    set({ theme })
    try { localStorage.setItem('lifeos-theme', theme) } catch {}
    document.documentElement.setAttribute('data-theme', theme)
    if (theme === 'dark' || theme === 'monk' || theme === 'night') document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
  },
}))
