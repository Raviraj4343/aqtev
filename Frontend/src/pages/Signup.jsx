import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import api from '../utils/api'
import '../styles/global.css'
import Brand from '../components/Brand'
import VerificationModal from '../components/VerificationModal'
import { useLanguage } from '../contexts/LanguageContext'

export default function Signup(){
  const { language } = useLanguage()
  const isHindi = language === 'hi'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const [showVerify, setShowVerify] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState(null)

  async function handleSubmit(e){
    e.preventDefault()
    setError(null)
    if(password !== confirm){ setError(isHindi ? 'पासवर्ड मेल नहीं खाते' : 'Passwords do not match'); return }
    setLoading(true)
    try{
      const res = await api.signup({ name, email, password })
      setLoading(false)
      setError(null)
      // Show verification modal so user can paste token or resend
      setRegisteredEmail(res?.data?.email || email)
      setShowVerify(true)
    }catch(err){
      console.error('Signup error', err)
      setError(err.payload?.message || err.message || (isHindi ? 'साइन अप असफल रहा' : 'Signup failed'))
      setLoading(false)
    }
  }

  return (
    <div className="auth-page-shell">
      <div className="auth-page-card auth-page-card-simple">
        <span className="auth-page-kicker">{isHindi ? 'शुरू करें' : 'Get started'}</span>
        <h2>{isHindi ? 'खाता बनाएं' : 'Create account'}</h2>
        <p className="auth-page-copy">{isHindi ? 'अपना मुफ्त ट्रायल शुरू करें और AQTEV को एक्सप्लोर करें।' : 'Start your free trial and explore '} {!isHindi ? <Brand textOnly inline /> : null}{isHindi ? '' : '.'}</p>

        <form onSubmit={handleSubmit} className="auth-page-form">
          <Input id="su-name" label={isHindi ? 'पूरा नाम' : 'Full name'} value={name} onChange={e=>setName(e.target.value)} required />
          <Input id="su-email" label={isHindi ? 'ईमेल पता' : 'Email address'} type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
          <Input id="su-password" label={isHindi ? 'पासवर्ड' : 'Password'} type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
          <Input id="su-confirm" label={isHindi ? 'पासवर्ड की पुष्टि करें' : 'Confirm password'} type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} required />

          {error && <div className="auth-page-error">{error}</div>}

          <Button type="submit" className="btn-primary auth-submit-btn" disabled={loading}>{loading ? (isHindi ? 'बनाया जा रहा है...' : 'Creating...') : (isHindi ? 'खाता बनाएं' : 'Create account')}</Button>

          <p className="auth-page-footnote">{isHindi ? 'क्या पहले से खाता है?' : 'Already have an account?'} <Link to="/signin">{isHindi ? 'साइन इन' : 'Sign in'}</Link></p>
        </form>
      </div>
      {showVerify && (
        <VerificationModal
          email={registeredEmail}
          password={password}
          autoLogin
          onClose={(result)=>{
            setShowVerify(false)
            if(result?.loggedIn) {
              navigate('/dashboard')
              return
            }
            if(result?.verified) navigate('/signin')
          }}
        />
      )}
    </div>
  )
}
