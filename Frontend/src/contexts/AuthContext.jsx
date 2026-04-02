import React, { createContext, useContext, useEffect, useState } from 'react'
import * as api from '../utils/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }){
  const [user, setUser] = useState(null)
  const [rememberedUser, setRememberedUser] = useState(()=> api.readRememberedUser())
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try{
      const res = await api.getMe()
      setUser(res?.data || null)
    }catch(err){
      setUser(null)
    }finally{ setLoading(false) }
  }

  useEffect(()=>{ load() }, [])

  const login = async (payload, options = {})=>{
    const rememberMe = Boolean(options?.rememberMe)
    const res = await api.login(payload)
    // Save access token (backend also sets cookies). This helps dev when cookies are blocked for cross-origin.
    try{ if (res?.data?.accessToken) api.saveToken(res.data.accessToken, rememberMe) }catch(e){}
    // Hydrate full user data after login so profile fields persist across sessions.
    try{
      const me = await api.getMe(res?.data?.accessToken)
      const nextUser = me?.data || null
      setUser(nextUser)
      if (rememberMe) {
        api.saveRememberedUser(nextUser || { email: payload?.email })
        if (payload?.email && payload?.password) {
          api.saveRememberedCredentials({ email: payload.email, password: payload.password })
        }
        setRememberedUser(api.readRememberedUser())
      } else {
        api.clearRememberedUser()
        api.clearRememberedCredentials()
        setRememberedUser(null)
      }
    }catch(e){
      // Fallback to login payload if /auth/me is temporarily unavailable.
      const nextUser = api.normalizeUser(res?.data?.user || null)
      setUser(nextUser)
      if (rememberMe) {
        api.saveRememberedUser(nextUser || { email: payload?.email })
        if (payload?.email && payload?.password) {
          api.saveRememberedCredentials({ email: payload.email, password: payload.password })
        }
        setRememberedUser(api.readRememberedUser())
      } else {
        api.clearRememberedUser()
        api.clearRememberedCredentials()
        setRememberedUser(null)
      }
    }
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
