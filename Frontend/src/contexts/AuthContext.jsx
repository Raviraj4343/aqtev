import React, { createContext, useContext, useEffect, useState } from 'react'
import * as api from '../utils/api'

const AuthContext = createContext(null)
const PUBLIC_ENTRY_PATHS = new Set(['/', '/signin', '/signup', '/forgot', '/reset-password', '/verify-email', '/auth', '/guest-nutrition-check'])

export function AuthProvider({ children }){
  const [user, setUser] = useState(null)
  const [rememberedUser, setRememberedUser] = useState(()=> api.readRememberedUser())
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const storedToken = api.readToken?.()

    if (storedToken) {
      try {
        const me = await api.getMe(storedToken)
        setUser(me?.data || null)
        return
      } catch (_meErr) {
        // fall through to refresh path
      }
    }

    try {
      const refreshed = await api.refreshToken()
      if (refreshed?.data?.accessToken) {
        api.saveToken(refreshed.data.accessToken, true)
      }
      const me = await api.getMe(refreshed?.data?.accessToken)
      setUser(me?.data || null)
    } catch (_refreshErr) {
      try { api.clearToken?.() } catch {}
      setUser(null)
    } finally { setLoading(false) }
  }

  useEffect(()=>{
    api.prewarmBackend?.().catch(()=>{})

    const path = typeof window !== 'undefined' ? window.location.pathname : ''
    const hasStoredToken = Boolean(api.readToken?.())
    const hasRememberedIdentity = Boolean(api.readRememberedUser?.()?.email)
    const isPublicEntry = PUBLIC_ENTRY_PATHS.has(path)

    // On public entry routes with no auth hints, skip boot auth round-trips.
    if (!hasStoredToken && !hasRememberedIdentity && isPublicEntry) {
      setLoading(false)
      return
    }

    load()
  }, [])

  const login = async (payload, options = {})=>{
    const rememberMe = Boolean(options?.rememberMe)
    const persistSession = rememberMe || api.isNativeApp?.()
    const res = await api.login(payload)
    // Save access token (backend also sets cookies). This helps dev when cookies are blocked for cross-origin.
    try{ if (res?.data?.accessToken) api.saveToken(res.data.accessToken, persistSession) }catch(e){}

    // Apply user state immediately so UI can continue without waiting for another roundtrip.
    const immediateUser = api.normalizeUser(res?.data?.user || null)
    setUser(immediateUser)

    if (persistSession) {
      api.saveRememberedUser(immediateUser || { email: payload?.email })
      if (rememberMe && payload?.email && payload?.password) {
        api.saveRememberedCredentials({ email: payload.email, password: payload.password })
      } else {
        api.clearRememberedCredentials()
      }
      setRememberedUser(api.readRememberedUser())
    } else {
      api.clearRememberedUser()
      api.clearRememberedCredentials()
      setRememberedUser(null)
    }

    // Hydrate full profile in background to enrich fields when available.
    api.getMe(res?.data?.accessToken)
      .then((me) => {
        const hydrated = me?.data || null
        if (!hydrated) return
        setUser(hydrated)
        if (persistSession) {
          api.saveRememberedUser(hydrated)
          setRememberedUser(api.readRememberedUser())
        }
      })
      .catch(() => {})

    return res
  }

  const logout = async ()=>{
    try{ await api.logout() }catch(e){}
    try{ api.clearToken() }catch(e){}
    setUser(null)
  }

  const continueWithRemembered = ()=>{
    const remembered = api.readRememberedUser()
    setRememberedUser(remembered)
    return remembered
  }

  const autoLoginRemembered = async ()=>{
    const remembered = api.readRememberedUser()
    const rememberedAuth = api.readRememberedCredentials()
    setRememberedUser(remembered)
    if (!remembered?.email) return { ok: false, reason: 'no-remembered-user' }

    const sameEmail = (candidate) => {
      const email = String(candidate?.email || '').trim().toLowerCase()
      return Boolean(email) && email === remembered.email.toLowerCase()
    }

    // 1) Try existing access token/cookie session first.
    try {
      const meRes = await api.getMe()
      const meUser = meRes?.data || null
      if (sameEmail(meUser)) {
        setUser(meUser)
        return { ok: true, user: meUser }
      }
    } catch (e) {}

    // 2) Try refresh-token session and then hydrate /me.
    try {
      const refreshed = await api.refreshToken()
      if (refreshed?.data?.accessToken) {
        api.saveToken(refreshed.data.accessToken, true)
      }

      const meRes = await api.getMe(refreshed?.data?.accessToken)
      const meUser = meRes?.data || null
      if (sameEmail(meUser)) {
        setUser(meUser)
        return { ok: true, user: meUser }
      }

      return { ok: false, reason: 'remembered-user-mismatch' }
    } catch (e) {
      // 3) Fallback to remembered credentials for one-tap continue login.
      if (rememberedAuth?.email && rememberedAuth?.password && sameEmail(rememberedAuth)) {
        try {
          await login({ email: rememberedAuth.email, password: rememberedAuth.password }, { rememberMe: true })
          return { ok: true, user: api.readRememberedUser() }
        } catch (_loginErr) {
          return { ok: false, reason: 'saved-password-invalid' }
        }
      }

      return { ok: false, reason: 'session-expired' }
    }
  }

  const forgetRemembered = ()=>{
    api.clearRememberedUser()
    api.clearRememberedCredentials()
    setRememberedUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, rememberedUser, loading, login, logout, refresh: load, continueWithRemembered, autoLoginRemembered, forgetRemembered }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(){
  return useContext(AuthContext)
}

export default AuthContext
