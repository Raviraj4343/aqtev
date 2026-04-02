import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../utils/api'
import { useAuth } from '../contexts/AuthContext'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import '../styles/global.css'
import Brand from '../components/Brand'
import VerificationModal from '../components/VerificationModal'

export default function SignIn(){
  const auth = useAuth()
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
        setError(err.payload?.message || err.message || 'Sign in failed')
      }
    }
  }

  return (
    <div className="auth-page-shell">
      <div className="auth-page-card auth-page-card-simple">
        <span className="auth-page-kicker">Welcome back</span>
        <h2>Sign in to <Brand textOnly inline /></h2>
        <p className="auth-page-copy">Enter your credentials to access your dashboard.</p>

        <form onSubmit={handleSubmit} className="auth-page-form">
          <Input id="si-email" label="Email address" type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
          <Input id="si-password" label="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} required />

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
            <label className="auth-page-checkbox"><input type="checkbox"/> Remember me</label>
            <Link to="/forgot" className="auth-page-link">Forgot password?</Link>
          </div>

          <Button type="submit" className="btn-primary auth-submit-btn" disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</Button>

          <p className="auth-page-footnote">Don't have an account? <Link to="/signup">Create account</Link></p>
        </form>
      </div>
    </div>
  )
}
