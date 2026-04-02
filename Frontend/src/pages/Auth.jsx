import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../utils/api'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Brand from '../components/Brand'
import { useLocation } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'

export default function Auth(){
  const { language } = useLanguage()
  const isHindi = language === 'hi'
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const initialMessage = location.state?.message || null
  const [infoMessage, setInfoMessage] = useState(initialMessage)

  return (
    <div className="auth-root">
      <div className="auth-split">
        <div className="auth-panel auth-form">
          <div className="auth-brand"><Brand to="/" /></div>
          <h2>{isHindi ? 'वापसी पर स्वागत है' : 'Welcome back'}</h2>
          <p className="muted">{isHindi ? 'अपने खाते में जारी रखने के लिए साइन इन करें।' : 'Sign in to continue to your account.'}</p>

          {infoMessage && (
            <div style={{background:'var(--color-surface)',padding:12,borderRadius:8,marginBottom:8}}>
              {infoMessage}
              <div style={{marginTop:8}}>
                <Input id="resend" label={isHindi ? 'सत्यापन दोबारा भेजने के लिए ईमेल' : 'Email to resend verification'} type="email" value={email} onChange={e=>setEmail(e.target.value)} />
                <div style={{marginTop:8}}>
                  <Button type="button" onClick={async ()=>{
                    try{
                      await api.resendVerification(email)
                      setInfoMessage(isHindi ? 'सत्यापन ईमेल दोबारा भेजा गया, इनबॉक्स देखें' : 'Verification email resent — check your inbox')
                    }catch(err){
                      setInfoMessage(err.payload?.message || err.message || (isHindi ? 'दोबारा भेजा नहीं जा सका' : 'Unable to resend'))
                    }
                  }}>{isHindi ? 'सत्यापन दोबारा भेजें' : 'Resend verification'}</Button>
                </div>
              </div>
            </div>
          )}

          <form className="auth-box" onSubmit={async e => {
            e.preventDefault()
            setError(null)
            setLoading(true)
            try{
              const res = await api.login({ email, password })
              // save access token (server also sets cookies)
              if(res?.data?.accessToken) api.saveToken(res.data.accessToken)
              setLoading(false)
              navigate('/dashboard')
            }catch(err){
              setLoading(false)
              setError(err.payload?.message || err.message || (isHindi ? 'लॉगिन असफल रहा' : 'Login failed'))
            }
          }}>
            <Input id="email" type="email" label={isHindi ? 'ईमेल पता' : 'Email address'} value={email} onChange={e=>setEmail(e.target.value)} required />
            <Input id="password" type="password" label={isHindi ? 'पासवर्ड' : 'Password'} value={password} onChange={e=>setPassword(e.target.value)} required />

            <div className="actions">
              <label className="checkbox"><input type="checkbox" /> {isHindi ? 'मुझे याद रखें' : 'Remember me'}</label>
              <Link to="/forgot" className="muted-link">{isHindi ? 'भूल गए?' : 'Forgot?'}</Link>
            </div>

            {error && <div style={{color:'#b91c1c',marginBottom:8}}>{error}</div>}

            <Button type="submit" disabled={loading}>{loading ? (isHindi ? 'साइन इन हो रहा है...' : 'Signing in...') : (isHindi ? 'साइन इन' : 'Sign in')}</Button>

            <p className="muted small">{isHindi ? 'क्या खाता नहीं है?' : "Don't have an account?"} <Link to="/signup">{isHindi ? 'साइन अप' : 'Sign up'}</Link></p>
          </form>
        </div>

        <div className="auth-panel auth-visual">
          <div className="visual-gradient" aria-hidden></div>
          <div className="visual-copy">
            <h3>{isHindi ? 'टीमों के लिए बनाया गया' : 'Built for teams'}</h3>
            <p>{isHindi ? 'आपकी टीम को तेज़ी से काम करने में मदद के लिए इनसाइट्स और वर्कफ़्लो।' : 'Insights and workflows to help your team move faster.'}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
