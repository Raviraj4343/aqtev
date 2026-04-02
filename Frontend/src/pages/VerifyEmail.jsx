import React, { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import api from '../utils/api'
import Button from '../components/ui/Button'
import { useLanguage } from '../contexts/LanguageContext'

export default function VerifyEmail(){
  const { language } = useLanguage()
  const isHindi = language === 'hi'
  const [search] = useSearchParams()
  const [status, setStatus] = useState('pending')
  const [message, setMessage] = useState(isHindi ? 'सत्यापन हो रहा है...' : 'Verifying...')
  const token = search.get('token')

  useEffect(()=>{
    if(!token){ setStatus('error'); setMessage(isHindi ? 'कोई सत्यापन टोकन उपलब्ध नहीं है' : 'No verification token provided'); return }
    let mounted = true
    api.verifyEmail(token).then(res=>{
      if(!mounted) return
      setStatus('success')
      setMessage(res?.message || (isHindi ? 'ईमेल सफलतापूर्वक सत्यापित हो गया। अब साइन इन करें।' : 'Email verified successfully. You can now sign in.'))
    }).catch(err=>{
      console.error('Verify error', err)
      setStatus('error')
      setMessage(err.payload?.message || err.message || (isHindi ? 'सत्यापन असफल रहा' : 'Verification failed'))
    })
    return ()=>{ mounted = false }
  }, [token, isHindi])

  return (
    <div style={{minHeight:'60vh',display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
      <div style={{maxWidth:680,textAlign:'center'}}>
        <h2>{status === 'pending' ? (isHindi ? 'सत्यापन हो रहा है...' : 'Verifying...') : (status === 'success' ? (isHindi ? 'सत्यापित' : 'Verified') : (isHindi ? 'सत्यापन असफल' : 'Verification failed'))}</h2>
        <p style={{color:'var(--color-muted)'}}>{message}</p>
        {status === 'success' ? <Link to="/signin"><Button>{isHindi ? 'साइन इन' : 'Sign in'}</Button></Link> : <Link to="/auth"><Button variant="ghost">{isHindi ? 'वापस' : 'Back'}</Button></Link>}
      </div>
    </div>
  )
}
