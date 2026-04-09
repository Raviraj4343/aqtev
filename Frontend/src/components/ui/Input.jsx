import React, { useState } from 'react'

function EyeOpenIcon(){
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M2 12s3.8-6 10-6 10 6 10 6-3.8 6-10 6-10-6-10-6z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

function EyeClosedIcon(){
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M2 12s3.8-6 10-6c2.3 0 4.1.8 5.6 1.9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M22 12s-3.8 6-10 6c-2.3 0-4.1-.8-5.6-1.9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 4l16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function Input({ id, label, type = 'text', value, onChange, required = false, name, placeholder = ' ', hint = '', className = '', ...props }){
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === 'password'
  const inputType = isPassword && showPassword ? 'text' : type
  const ariaLabel = label || name || undefined
  const resolvedPlaceholder = label ? ' ' : placeholder
  const fieldClassName = ['field', className, isPassword ? 'has-password-toggle' : ''].filter(Boolean).join(' ')

  return (
    <div className={fieldClassName}>
      <input id={id} name={name} type={inputType} value={value} onChange={onChange} placeholder={resolvedPlaceholder} required={required} aria-label={ariaLabel} aria-required={required} {...props} />
      {label && <label htmlFor={id}>{label}</label>}
      {isPassword ? (
        <button
          type="button"
          className="field-password-toggle"
          onClick={() => setShowPassword(prev => !prev)}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          aria-pressed={showPassword}
        >
          {showPassword ? <EyeClosedIcon /> : <EyeOpenIcon />}
        </button>
      ) : null}
      {hint ? <div className="field-hint">{hint}</div> : null}
    </div>
  )
}
