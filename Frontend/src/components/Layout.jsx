import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { App as CapacitorApp } from '@capacitor/app'
import Sidebar from './Sidebar'
import Navbar from './Navbar'
import { useAuth } from '../contexts/AuthContext'

const PUBLIC_PATHS = ['/', '/guest-nutrition-check', '/signin', '/signup', '/auth', '/forgot', '/reset-password']

export default function Layout({ children }){
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth() || {}

  const showSidebar = !PUBLIC_PATHS.includes(pathname)

  useEffect(() => {
    let cleanup = null

    CapacitorApp.addListener('backButton', () => {
      if (sidebarOpen) {
        setSidebarOpen(false)
        return
      }

      if (window.history.length > 1) {
        navigate(-1)
        return
      }

      navigate(user ? '/dashboard' : '/', { replace: true })
    }).then((listener) => {
      cleanup = () => listener.remove()
    }).catch(() => {})

    return () => {
      if (cleanup) cleanup()
    }
  }, [navigate, sidebarOpen, user, pathname])

  return (
    <div className="app-root">
      {(showSidebar || sidebarOpen) && (
        <Sidebar isOpen={sidebarOpen} onClose={()=>setSidebarOpen(false)} />
      )}
      {sidebarOpen && <div className="drawer-backdrop" onClick={()=>setSidebarOpen(false)} aria-hidden="true" />}
      <div className={`main-area ${showSidebar ? 'has-sidebar' : 'no-sidebar'}`}>
        <Navbar isSidebarOpen={sidebarOpen} onToggleSidebar={()=>setSidebarOpen(s=>!s)} />
        <main className="content-area" onClick={()=> sidebarOpen && setSidebarOpen(false)}>
          {children}
        </main>
      </div>
    </div>
  )
}
