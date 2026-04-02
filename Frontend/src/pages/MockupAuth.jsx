import React, { useState } from 'react'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import '../styles/global.css'

export default function MockupAuth(){
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  return (
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',height:'100vh'}}>
      <div style={{background:'linear-gradient(180deg,var(--color-primary),var(--color-primary-600))',color:'#fff,',display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
        <div style={{maxWidth:360,textAlign:'center'}}>
          <h2 style={{margin:0,fontSize:24}}>Welcome to <span className="brand-split"><span className="fit">Fit</span><span className="cek">Cek</span></span></h2>
          <p style={{opacity:0.92}}>Track, analyze and improve.</p>
          <div style={{marginTop:20,background:'rgba(255,255,255,0.04)',padding:20,borderRadius:12}}>
            <p style={{fontSize:14}}>Secure · Modern · Accurate</p>
          </div>
        </div>
      </div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'center'}}>
        <div style={{width:420,background:'var(--color-surface)',padding:24,borderRadius:12,boxShadow:'var(--shadow-1)'}}>
          <div style={{marginBottom:12}}>
            <h3 style={{margin:0}}>Sign in</h3>
            <p style={{color:'var(--color-muted)'}}>Sign in to continue to your account.</p>
          </div>

          <form onSubmit={(e)=>{e.preventDefault()}}>
            <Input id="m-email" label="Email address" type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
            <Input id="m-pass" label="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:8}}>
              <label style={{color:'var(--color-muted)',fontSize:13}}><input type="checkbox"/> Remember me</label>
              <a href="#" style={{color:'var(--color-primary)'}}>Forgot?</a>
            </div>
            <Button type="submit" style={{width:'100%',marginTop:16}}>Sign in</Button>
            <p style={{fontSize:13,color:'var(--color-muted)',marginTop:12}}>Don't have an account? <a href="#">Sign up</a></p>
          </form>
        </div>
      </div>
    </div>
  )
}
