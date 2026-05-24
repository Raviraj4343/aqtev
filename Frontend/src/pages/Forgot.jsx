import React, { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import api from '../utils/api'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import { useLanguage } from '../contexts/LanguageContext'

export default function Forgot(){
  const CODE_LENGTH = 6
  const { language } = useLanguage()
  const isHindi = language === 'hi'
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [codeDigits, setCodeDigits] = useState(Array(CODE_LENGTH).fill(''))
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)
  const [step, setStep] = useState('request')
  const inputsRef = useRef([])

  const codeValue = codeDigits.join('')

  useEffect(() => {
    const stateEmail = location.state?.email
    const queryEmail = new URLSearchParams(location.search).get('email')
    const nextEmail = String(stateEmail || queryEmail || '').trim()
    if (nextEmail && nextEmail !== email) {
      setEmail(nextEmail)
    }
  }, [location.state, location.search, email])

  async function handleSendCode(e){
    e.preventDefault()
    setError(null)
    setMessage(null)
    if (!email) {
      window.alert(isHindi ? 'कृपया साइन इन स्क्रीन से अपना ईमेल दर्ज करें।' : 'Email is required. Please enter it on the sign-in screen.')
      return
    }
    setLoading(true)
    try{
      await api.requestPasswordResetCode(email)
      setStep('verify')
      setCodeDigits(Array(CODE_LENGTH).fill(''))
      setMessage(isHindi ? 'अगर यह ईमेल पंजीकृत है, तो 6-अंकीय कोड भेज दिया गया है।' : 'If this email is registered, a 6-digit code has been sent.')
      setTimeout(() => inputsRef.current[0]?.focus(), 50)
    }catch(err){
      setError(err.payload?.message || err.message || (isHindi ? 'रीसेट कोड भेजने में असफल' : 'Failed to send reset code'))
    }finally{ setLoading(false) }
  }

  async function handleReset(e){
    e.preventDefault()
    setError(null)
    setMessage(null)
    if (codeValue.length !== CODE_LENGTH) {
      return setError(isHindi ? 'कृपया 6-अंकीय कोड दर्ज करें' : 'Please enter the 6-digit code')
    }
    if (password.length < 6) {
      return setError(isHindi ? 'पासवर्ड कम से कम 6 अक्षरों का होना चाहिए' : 'Password must be at least 6 characters')
    }
    if (password !== confirm) {
      return setError(isHindi ? 'पासवर्ड मेल नहीं खाते' : 'Passwords do not match')
    }
    setLoading(true)
    try{
      await api.resetPasswordWithCode({ email, code: codeValue, password })
      setMessage(isHindi ? 'पासवर्ड सफलतापूर्वक रीसेट हो गया, अब साइन इन करें।' : 'Password reset successful — you can now sign in.')
      setTimeout(()=>navigate('/signin'), 1500)
    }catch(err){
      setError(err.payload?.message || err.message || (isHindi ? 'पासवर्ड रीसेट असफल रहा' : 'Failed to reset password'))
    }finally{ setLoading(false) }
  }

  function handleCodeChange(index, value){
    const digits = String(value || '').replace(/\D/g, '')
    const next = [...codeDigits]

    if (!digits){
      next[index] = ''
      setCodeDigits(next)
      return
    }

    next[index] = digits[digits.length - 1]
    setCodeDigits(next)
    if (index < CODE_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus()
    }
  }

  function handleCodeKeyDown(index, event){
    if (event.key === 'Backspace' && !codeDigits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus()
    }
    if (event.key === 'ArrowLeft' && index > 0) {
      inputsRef.current[index - 1]?.focus()
    }
    if (event.key === 'ArrowRight' && index < CODE_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus()
    }
  }

  function handleCodePaste(event){
    const pasted = event.clipboardData.getData('text')
    const digits = pasted.replace(/\D/g, '').slice(0, CODE_LENGTH)
    if (!digits) return
    const next = Array(CODE_LENGTH).fill('')
    digits.split('').forEach((digit, idx) => { next[idx] = digit })
    setCodeDigits(next)
    const lastIndex = Math.min(digits.length, CODE_LENGTH) - 1
    inputsRef.current[lastIndex]?.focus()
    event.preventDefault()
  }

  return (
    <div style={{minHeight:'80vh',display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
      <div style={{width:'100%',maxWidth:520,padding:12}}>
        <h2>{isHindi ? 'पासवर्ड भूल गए' : 'Forgot password'}</h2>
        <p style={{color:'var(--color-muted)'}}>
          {isHindi
            ? 'हम आपके पंजीकृत ईमेल पर 6-अंकीय रीसेट कोड भेजेंगे।'
            : 'We will send a 6-digit reset code to your registered email.'}
        </p>

        {step === 'request' ? (
          <form onSubmit={handleSendCode} style={{marginTop:16}}>
            <div className="otp-card" style={{marginTop:0}}>
              <div className="otp-header">
                <div>
                  <div className="otp-kicker">{isHindi ? 'ईमेल' : 'Email'}</div>
                  <div className="otp-email">{email || (isHindi ? 'ईमेल उपलब्ध नहीं' : 'Email missing')}</div>
                </div>
                <button type="button" className="otp-change" onClick={() => navigate('/signin')}>
                  {isHindi ? 'बदलें' : 'Change'}
                </button>
              </div>
              <div className="otp-helper">
                {isHindi ? 'कोड इसी ईमेल पर भेजा जाएगा।' : 'The code will be sent to this email.'}
              </div>
            </div>

            {error && <div style={{color:'var(--color-danger)', marginTop:8}}>{error}</div>}
            {message && <div style={{color:'var(--color-success)', marginTop:8}}>{message}</div>}

            <Button type="submit" className="btn-primary" style={{width:'100%',marginTop:16}} disabled={loading}>
              {loading ? (isHindi ? 'भेजा जा रहा है...' : 'Sending...') : (isHindi ? 'कोड भेजें' : 'Send code')}
            </Button>

            <p style={{fontSize:13,color:'var(--color-muted)',marginTop:12}}>
              {isHindi ? 'याद आ गया?' : 'Remembered?'} <Link to="/signin">{isHindi ? 'साइन इन' : 'Sign in'}</Link>
            </p>
          </form>
        ) : (
          <form onSubmit={handleReset} style={{marginTop:16}}>
            <div className="otp-card">
              <div className="otp-header">
                <div>
                  <div className="otp-kicker">{isHindi ? 'ईमेल' : 'Email'}</div>
                  <div className="otp-email">{email}</div>
                </div>
                <button type="button" className="otp-change" onClick={() => navigate('/signin')}>
                  {isHindi ? 'बदलें' : 'Change'}
                </button>
              </div>
              <div className="otp-inputs" onPaste={handleCodePaste}>
                {codeDigits.map((digit, index) => (
                  <input
                    key={index}
                    ref={el => { inputsRef.current[index] = el }}
                    className="otp-input"
                    inputMode="numeric"
                    autoComplete={index === 0 ? 'one-time-code' : 'off'}
                    maxLength={1}
                    value={digit}
                    onChange={e => handleCodeChange(index, e.target.value)}
                    onKeyDown={e => handleCodeKeyDown(index, e)}
                    aria-label={`${isHindi ? 'अंक' : 'Digit'} ${index + 1}`}
                  />
                ))}
              </div>
              <div className="otp-helper">
                {isHindi ? '6-अंकीय कोड दर्ज करें' : 'Enter the 6-digit code'}
              </div>
              <button type="button" className="otp-resend" onClick={handleSendCode} disabled={loading}>
                {loading ? (isHindi ? 'भेजा जा रहा है...' : 'Sending...') : (isHindi ? 'कोड पुनः भेजें' : 'Resend code')}
              </button>
            </div>

            <Input id="fp-password" label={isHindi ? 'नया पासवर्ड' : 'New password'} type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
            <Input id="fp-confirm" label={isHindi ? 'पासवर्ड की पुष्टि करें' : 'Confirm password'} type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} required />

            {error && <div style={{color:'var(--color-danger)', marginTop:8}}>{error}</div>}
            {message && <div style={{color:'var(--color-success)', marginTop:8}}>{message}</div>}

            <Button type="submit" className="btn-primary" style={{width:'100%',marginTop:16}} disabled={loading}>
              {loading ? (isHindi ? 'रीसेट हो रहा है...' : 'Resetting...') : (isHindi ? 'पासवर्ड रीसेट करें' : 'Reset password')}
            </Button>

            <p style={{fontSize:13,color:'var(--color-muted)',marginTop:12}}>
              {isHindi ? 'वापस जाएं' : 'Back to'} <Link to="/signin">{isHindi ? 'साइन इन' : 'Sign in'}</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
