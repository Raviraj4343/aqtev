import React from 'react'
import { Link } from 'react-router-dom'
import Button from '../components/ui/Button'
import Brand from '../components/Brand'
import { useLanguage } from '../contexts/LanguageContext'
import '../styles/global.css'

export default function Landing(){
  const { language } = useLanguage()
  const isHindi = language === 'hi'

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <main className="landing-main">
        <section className="hero">
          <h1 style={{ fontSize: 'var(--fs-xxl)', margin: 0 }}>
            <Brand textOnly inline /> {isHindi ? '— टीमों के लिए बनाया गया हेल्थ ट्रैकिंग प्लेटफॉर्म' : '— Health tracking built for teams'}
          </h1>
          <p style={{ color: 'var(--color-muted)', marginTop: 12, maxWidth: 680 }}>
            {isHindi
              ? <>
                  <Brand textOnly inline /> क्लिनिक, कोच और वेलनेस टीमों को भरोसेमंद दैनिक माप दर्ज करने,
                  समय के साथ प्रगति ट्रैक करने और निष्कर्षों को आसान, साझा किए जा सकने वाले एक्शन प्लान में बदलने में मदद करता है।
                  सुरक्षित और टीम-फ्रेंडली <Brand textOnly inline /> बेहतर क्लाइंट परिणामों के लिए बनाया गया है।
                </>
              : <>
                  <Brand textOnly inline /> helps clinics, coaches, and wellness teams capture reliable daily measurements,
                  track progress over time, and turn observations into simple, shareable action plans. Secure and
                  team-friendly, <Brand textOnly inline /> is built to support better client outcomes.
                </>
            }
          </p>

          <div style={{ display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap' }}>
            <Link to="/signup"><Button>{isHindi ? 'शुरू करें — मुफ्त' : 'Get started — free'}</Button></Link>
            <Link to="/signin"><Button variant="ghost">{isHindi ? 'डेमो देखें' : 'View demo'}</Button></Link>
          </div>

          <div style={{ marginTop: 36 }}>
            <p style={{ color: 'var(--color-muted)', maxWidth: 680 }}>
              {isHindi
                ? 'विश्वसनीय मॉनिटरिंग और स्पष्ट प्रोग्रेस रिपोर्टिंग के लिए केयर टीमों का भरोसा — बिना रोज़मर्रा के काम को जटिल बनाए।'
                : 'Trusted by care teams for dependable monitoring and clear progress reporting — without adding complexity to daily workflows.'}
            </p>
            <p style={{ color: 'var(--color-muted)', maxWidth: 560, marginTop: 12, marginBottom: 0 }}>
              {isHindi
                ? 'बिना अकाउंट बनाए तुरंत पोषण सारांश चाहिए? Track में आपने क्या खाया जोड़ें और दैनिक कैलोरी, प्रोटीन, फाइबर, विटामिन आदि देखें।'
                : 'Want a quick nutrition summary without creating an account? Use Track to add what you ate and see your daily calories, protein, fiber, vitamins, and more.'}
            </p>
            <div style={{ marginTop: 16 }}>
              <Link to="/guest-nutrition-check"><Button>{isHindi ? 'ट्रैक' : 'Track'}</Button></Link>
            </div>
          </div>
        </section>
      </main>

      <footer style={{ marginTop: 'auto', padding: 20, background: 'transparent', textAlign: 'center', color: 'var(--color-muted)' }}>
        © {new Date().getFullYear()} <Brand textOnly inline /> {isHindi ? '— देखभाल के साथ बनाया गया।' : '— Built with care.'}
      </footer>
    </div>
  )
}
