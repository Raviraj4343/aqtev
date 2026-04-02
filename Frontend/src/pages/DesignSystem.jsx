import React from 'react'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import { useLanguage } from '../contexts/LanguageContext'

export default function DesignSystem(){
  const { language } = useLanguage()
  const isHindi = language === 'hi'
  return (
    <div style={{padding:24}}>
      <h1>{isHindi ? 'डिज़ाइन सिस्टम — टोकन्स और कॉम्पोनेंट्स' : 'Design system — tokens & components'}</h1>

      <section style={{marginTop:20}}>
        <h2>{isHindi ? 'बटन' : 'Buttons'}</h2>
        <div style={{display:'flex',gap:12}}>
          <Button>{isHindi ? 'प्राइमरी' : 'Primary'}</Button>
          <Button variant="ghost">{isHindi ? 'घोस्ट' : 'Ghost'}</Button>
          <Button disabled>{isHindi ? 'डिसेबल्ड' : 'Disabled'}</Button>
        </div>
      </section>

      <section style={{marginTop:20}}>
        <h2>{isHindi ? 'इनपुट' : 'Inputs'}</h2>
        <div style={{maxWidth:420}}>
          <Input id="ds-email" label={isHindi ? 'ईमेल' : 'Email'} type="email" value="" onChange={()=>{}} />
        </div>
      </section>

      <section style={{marginTop:20}}>
        <h2>{isHindi ? 'कार्ड' : 'Cards'}</h2>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <Card title={isHindi ? 'कार्ड शीर्षक' : 'Card title'}>{isHindi ? 'कार्ड बॉडी सामग्री' : 'Card body content'}</Card>
          <Card>{isHindi ? 'सरल कार्ड' : 'Simple card'}</Card>
        </div>
      </section>

    </div>
  )
}
