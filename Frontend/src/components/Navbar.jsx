import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import Brand from './Brand'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'

const PUBLIC_PATHS = ['/', '/guest-nutrition-check', '/signin', '/signup', '/auth', '/forgot', '/reset-password']

export default function Navbar({ isSidebarOpen = false, onToggleSidebar }){
  const { pathname } = useLocation()
  const { user } = useAuth() || {}
  const { t, language, setLanguage } = useLanguage()
  const showAuthLinks = !user && PUBLIC_PATHS.includes(pathname)
  const nextLanguage = language === 'hi' ? 'en' : 'hi'

  return (
    <header className="topbar">
      <div className="container topbar-container">
        <div className="topbar-left">
          <div className="topbrand"><Brand to="/" /></div>
        </div>

        <div className="topbar-right">
          {showAuthLinks ? (
            <>
              <button
                type="button"
                className="nav-lang-toggle"
                aria-label={language === 'hi' ? 'Switch language to English' : 'Switch language to Hindi'}
                onClick={() => setLanguage(nextLanguage)}
              >
                {language === 'hi' ? 'EN' : 'हि'}
              </button>
              <Link to="/signin" className="nav-auth-link">{t('navbar.signIn')}</Link>
              <Link to="/signup" className="btn-primary" style={{ marginTop: 0, padding: '10px 14px' }}>{t('navbar.signUp')}</Link>
            </>
          ) : (
            <button
              type="button"
              aria-label={t('navbar.openMenu')}
              aria-controls="mobile-navigation"
              aria-haspopup="dialog"
              aria-expanded={isSidebarOpen}
              className="menu-btn"
              onClick={onToggleSidebar}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 7h16v2H4V7Zm0 6h16v2H4v-2Zm0 6h16v2H4v-2Z" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
