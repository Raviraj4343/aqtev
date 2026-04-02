import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import api from '../utils/api'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import { useLanguage } from '../contexts/LanguageContext'

export default function ResetPassword(){
  const { language } = useLanguage()
  const isHindi = language === 'hi'
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)
  const navigate = useNavigate()
  const { search } = useLocation()
  const [token, setToken] = useState('')

  useEffect(()=>{
    const q = new URLSearchParams(search)
    const t = q.get('token') || ''
    setToken(t)
  }, [search])

  async function handleSubmit(e){
    e.preventDefault()
    setError(null)
    setMessage(null)
    if (!token) return setError(isHindi ? 'टोकन उपलब्ध नहीं है' : 'Missing token')
    if (password.length < 6) return setError(isHindi ? 'पासवर्ड कम से कम 6 अक्षरों का होना चाहिए' : 'Password must be at least 6 characters')
    if (password !== confirm) return setError(isHindi ? 'पासवर्ड मेल नहीं खाते' : 'Passwords do not match')
    setLoading(true)
    try{
      await api.resetPassword(token, password)
      setMessage(isHindi ? 'पासवर्ड सफलतापूर्वक रीसेट हो गया, अब साइन इन करें।' : 'Password reset successful — you can now sign in.')
      setTimeout(()=>navigate('/signin'), 1500)
    }catch(err){
      setError(err.payload?.message || err.message || (isHindi ? 'पासवर्ड रीसेट असफल रहा' : 'Failed to reset password'))
    }finally{ setLoading(false) }
  }

  return (
    <div style={{minHeight:'80vh',display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
      <div style={{width:'100%',maxWidth:420,padding:12}}>
        <h2>{isHindi ? 'पासवर्ड रीसेट करें' : 'Reset password'}</h2>
        <p style={{color:'var(--color-muted)'}}>{isHindi ? 'अपने खाते के लिए नया पासवर्ड सेट करें।' : 'Set a new password for your account.'}</p>

        <form onSubmit={handleSubmit} style={{marginTop:16}}>
          <Input id="rp-password" label={isHindi ? 'नया पासवर्ड' : 'New password'} type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
          <Input id="rp-confirm" label={isHindi ? 'पासवर्ड की पुष्टि करें' : 'Confirm password'} type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} required />

          {error && <div style={{color:'var(--color-danger)', marginTop:8}}>{error}</div>}
          {message && <div style={{color:'var(--color-success)', marginTop:8}}>{message}</div>}

          <Button type="submit" className="btn-primary" style={{width:'100%',marginTop:16}} disabled={loading}>{loading ? (isHindi ? 'रीसेट हो रहा है...' : 'Resetting...') : (isHindi ? 'पासवर्ड रीसेट करें' : 'Reset password')}</Button>

          <p style={{fontSize:13,color:'var(--color-muted)',marginTop:12}}>{isHindi ? 'वापस जाएं' : 'Back to'} <Link to="/signin">{isHindi ? 'साइन इन' : 'Sign in'}</Link></p>
        </form>
      </div>
    </div>
  )
}
