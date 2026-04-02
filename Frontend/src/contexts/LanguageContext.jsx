import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { translations } from '../i18n/translations'

const STORAGE_KEY = 'fitcek.language'
const SUPPORTED = ['en', 'hi']

const LanguageContext = createContext(null)

const resolvePath = (obj, path) => {
  if (!obj || !path) return undefined
  return path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj)
}

const interpolate = (template, vars = {}) => {
  if (typeof template !== 'string') return template
  return template.replace(/\{(\w+)\}/g, (_, key) => (vars[key] == null ? `{${key}}` : String(vars[key])))
}

const getInitialLanguage = () => {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored && SUPPORTED.includes(stored)) return stored
  } catch (error) {}
  return 'en'
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(getInitialLanguage)

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, language)
    } catch (error) {}

    if (typeof document !== 'undefined') {
      document.documentElement.lang = language === 'hi' ? 'hi' : 'en'
      document.documentElement.setAttribute('data-language', language)
    }
  }, [language])

  const setLanguage = (value) => {
    if (!SUPPORTED.includes(value)) return
    setLanguageState(value)
  }

  const t = (key, vars = {}, fallback = '') => {
    const current = resolvePath(translations[language], key)
    const english = resolvePath(translations.en, key)
    const resolved = current ?? english ?? fallback ?? key
    return interpolate(resolved, vars)
  }

  const value = useMemo(() => ({ language, setLanguage, t }), [language])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider')
  }
  return context
}
