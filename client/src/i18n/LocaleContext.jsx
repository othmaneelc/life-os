import { createContext, useContext, useState, useEffect } from 'react'
import { translations, DEFAULT_LOCALE } from './translations'

const LocaleContext = createContext()

export function LocaleProvider({ children }) {
  const [locale, setLocale] = useState(() => {
    const saved = localStorage.getItem('locale')
    if (saved) return saved
    const browserLang = navigator.language?.startsWith('ar') ? 'ar' : DEFAULT_LOCALE
    return browserLang
  })

  useEffect(() => {
    localStorage.setItem('locale', locale)
    document.documentElement.lang = locale
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr'
  }, [locale])

  function t(path) {
    const keys = path.split('.')
    let value = translations[locale]
    for (const key of keys) {
      value = value?.[key]
    }
    return value || path.split('.').pop()
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale() {
  const ctx = useContext(LocaleContext)
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider')
  return ctx
}
