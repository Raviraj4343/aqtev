import React from 'react'
import { Link } from 'react-router-dom'
import logo from '../logo/app_logo.png'
import '../styles/global.css'

export default function Brand({ to, showLogo = true, textOnly = false, inline = false }){
  const content = textOnly ? (
    <span className={inline ? 'brand-split inline' : 'brand-split'}>
      <span className="fit">Fit</span><span className="cek">Cek</span>
    </span>
  ) : (
    <>
      {showLogo && <img src={logo} alt="FitCek" className="app-logo" />}
      <span className={inline ? 'brand-text inline' : 'brand-text'}>
        <span className="fit">Fit</span><span className="cek">Cek</span>
      </span>
    </>
  )

  if(to){
    return <Link to={to} className={inline ? 'brand link inline' : 'brand link'}>{content}</Link>
  }

  return <span className={inline ? 'brand inline' : 'brand'}>{content}</span>
}
