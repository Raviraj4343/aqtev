import React, { useEffect, useRef, useState } from 'react'
import Button from './ui/Button'
import api from '../utils/api'
import { useAuth } from '../contexts/AuthContext'

const boxStyle = {
  width: 44,
  height: 52,
  margin: 6,
  fontSize: 20,
  textAlign: 'center',
  borderRadius: 8,
  border: '1px solid var(--color-muted)',
}

export default function VerificationModal({ email, password, autoLogin = false, onClose }){
  const [values, setValues] = useState(Array(6).fill(''))
  const inputs = useRef([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState(null)
  const auth = useAuth()

  useEffect(()=>{ if(inputs.current[0]) inputs.current[0].focus() }, [])

  function handleChange(i, v){
    if(v.length > 1) v = v.slice(-1)
    const next = [...values]
    next[i] = v.replace(/[^0-9a-zA-Z]/g,'')
    setValues(next)
    if(v && i < 5) inputs.current[i+1].focus()
  }

  async function handleVerify(){
    const code = values.join('').trim()
    if(!code){ setMsg('Enter the verification code'); return }
    setLoading(true); setMsg(null)
    try{
      await api.verifyCode(email, code)
      if(autoLogin && email && password){
        await auth.login({ email, password })
        setMsg('Email verified. Redirecting to dashboard...')
        setTimeout(()=> onClose && onClose({ verified: true, loggedIn: true }), 500)
      } else {
        setMsg('Email verified — you can sign in now.')
        setTimeout(()=> onClose && onClose({ verified: true, loggedIn: false }), 800)
      }
    }catch(err){
      setMsg(err.payload?.message || err.message || 'Verification failed')
    }finally{ setLoading(false) }
  }

  async function handleResend(){
    setLoading(true); setMsg(null)
    try{
      const res = await api.resendVerification(email)
      // API returns ApiResponse { statusCode, data, message }
      setMsg(res?.message || 'Verification email resent')
    }catch(err){
      setMsg(err.payload?.message || err.message || 'Resend failed')
    }finally{ setLoading(false) }
  }

  return (
    <div style={{position:'fixed',left:0,top:0,right:0,bottom:0,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(4,12,12,0.45)'}}>
      <div style={{width:'min(520px,94%)',background:'white',borderRadius:12,padding:20,boxShadow:'0 10px 40px rgba(2,6,23,0.2)'}}>
        <h3 style={{margin:0}}>Verify your email</h3>
        <p style={{color:'var(--color-muted)',marginTop:8}}>We've sent a verification link to <strong>{email}</strong>. You can paste the token here or click Resend.</p>

        <div style={{display:'flex',justifyContent:'center',marginTop:12}}>
          {values.map((v,i)=> (
            <input
              key={i}
              ref={el=>inputs.current[i]=el}
              value={v}
              onChange={e=>handleChange(i,e.target.value)}
              onKeyDown={e=>{ if(e.key==='Backspace' && !values[i] && i>0) inputs.current[i-1].focus() }}
              style={boxStyle}
              maxLength={1}
            />
          ))}
        </div>

        {/* no full-token paste in production UI; rely on email delivery and 6-box input */}

        {msg && <div style={{color:/verified|redirecting|resent/i.test(msg) ? '#17693a' : '#d14343',marginTop:12}}>{msg}</div>}

        <div style={{display:'flex',gap:12,marginTop:16,justifyContent:'flex-end'}}>
          <Button onClick={handleResend} disabled={loading} className="btn-ghost">Resend verification</Button>
          <Button onClick={handleVerify} disabled={loading} className="btn-primary">{loading ? 'Working...' : 'Verify'}</Button>
          <Button onClick={()=>onClose && onClose({ verified: false, loggedIn: false })}>Close</Button>
        </div>
      </div>
    </div>
  )
}
