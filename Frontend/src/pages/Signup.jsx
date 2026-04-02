import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import api from '../utils/api'
import '../styles/global.css'
import Brand from '../components/Brand'
import VerificationModal from '../components/VerificationModal'

export default function Signup(){
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
    if(password !== confirm){ setError('Passwords do not match'); return }
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
      setError(err.payload?.message || err.message || 'Signup failed')
      setLoading(false)
    }
  }

  return (
    <div className="auth-page-shell">
      <div className="auth-page-card auth-page-card-simple">
        <span className="auth-page-kicker">Get started</span>
        <h2>Create account</h2>
        <p className="auth-page-copy">Start your free trial and explore <Brand textOnly inline />.</p>

        <form onSubmit={handleSubmit} className="auth-page-form">
          <Input id="su-name" label="Full name" value={name} onChange={e=>setName(e.target.value)} required />
          <Input id="su-email" label="Email address" type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
          <Input id="su-password" label="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
          <Input id="su-confirm" label="Confirm password" type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} required />

          {error && <div className="auth-page-error">{error}</div>}

          <Button type="submit" className="btn-primary auth-submit-btn" disabled={loading}>{loading ? 'Creating...' : 'Create account'}</Button>

          <p className="auth-page-footnote">Already have an account? <Link to="/signin">Sign in</Link></p>
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
