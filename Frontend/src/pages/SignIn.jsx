import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../utils/api'
import { useAuth } from '../contexts/AuthContext'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import '../styles/global.css'
import Brand from '../components/Brand'
import VerificationModal from '../components/VerificationModal'
import { useLanguage } from '../contexts/LanguageContext'

export default function SignIn(){
  const auth = useAuth()
  const { language } = useLanguage()
  const isHindi = language === 'hi'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showResend, setShowResend] = useState(false)
  const [resendEmail, setResendEmail] = useState('')
  const [showVerify, setShowVerify] = useState(false)
  const [verifyEmailAddr, setVerifyEmailAddr] = useState('')
  const navigate = useNavigate()

  async function handleSubmit(e){
    e.preventDefault()
    setError(null)
    setLoading(true)
    try{
      const res = await auth.login({ email, password })
      setLoading(false)
      navigate('/dashboard')
    }catch(err){
      setLoading(false)
      // If backend indicates email not verified, show helpful message and offer resend
      const status = err.status || err.payload?.statusCode
      if(status === 403 || (err.payload && /verify/i.test(err.payload.message || ''))){
        setError(null)
        // show verification modal prefilled with email
        setVerifyEmailAddr(email)
        setShowVerify(true)
      } else {
        setError(err.payload?.message || err.message || (isHindi ? 'साइन इन असफल रहा' : 'Sign in failed'))
      }
    }
  }

  return (
    <div className="auth-page-shell">
      <div className="auth-page-card auth-page-card-simple">
        <span className="auth-page-kicker">{isHindi ? 'वापसी पर स्वागत है' : 'Welcome back'}</span>
        <h2>{isHindi ? 'साइन इन करें' : 'Sign in to'} {!isHindi ? <Brand textOnly inline /> : null}</h2>
        <p className="auth-page-copy">{isHindi ? 'डैशबोर्ड देखने के लिए अपनी जानकारी दर्ज करें।' : 'Enter your credentials to access your dashboard.'}</p>

        <form onSubmit={handleSubmit} className="auth-page-form">
          <Input id="si-email" label={isHindi ? 'ईमेल पता' : 'Email address'} type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
          <Input id="si-password" label={isHindi ? 'पासवर्ड' : 'Password'} type="password" value={password} onChange={e=>setPassword(e.target.value)} required />

          {error && <div className="auth-page-error">{error}</div>}

          {showVerify && (
            <VerificationModal
              email={verifyEmailAddr}
              onClose={(result)=>{
                setShowVerify(false)
                if(result?.verified) navigate('/signin')
              }}
            />
          )}

          <div className="auth-page-row">
            <label className="auth-page-checkbox"><input type="checkbox"/> {isHindi ? 'मुझे याद रखें' : 'Remember me'}</label>
            <Link to="/forgot" className="auth-page-link">{isHindi ? 'पासवर्ड भूल गए?' : 'Forgot password?'}</Link>
          </div>

          <Button type="submit" className="btn-primary auth-submit-btn" disabled={loading}>{loading ? (isHindi ? 'साइन इन हो रहा है...' : 'Signing in...') : (isHindi ? 'साइन इन' : 'Sign in')}</Button>

          <p className="auth-page-footnote">{isHindi ? 'क्या आपका खाता नहीं है?' : "Don't have an account?"} <Link to="/signup">{isHindi ? 'खाता बनाएं' : 'Create account'}</Link></p>
        </form>
      </div>
    </div>
  )
}
