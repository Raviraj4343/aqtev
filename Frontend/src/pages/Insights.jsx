import React, { useEffect, useState } from 'react'
import Card from '../components/ui/Card'
import * as api from '../utils/api'
import { useLanguage } from '../contexts/LanguageContext'

export default function Insights(){
  const { language } = useLanguage()
  const isHindi = language === 'hi'
  const [todayInsight, setTodayInsight] = useState(null)
  const [weeklySummary, setWeeklySummary] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    Promise.all([api.getTodayInsight(), api.getWeeklySummary()])
      .then(([todayResponse, weeklyResponse]) => {
        if (!mounted) return
        setTodayInsight(todayResponse?.data || null)
        setWeeklySummary(weeklyResponse?.data || null)
      })
      .catch(() => {})
      .finally(() => { if (mounted) setLoading(false) })

    return () => { mounted = false }
  }, [])

  const score = weeklySummary?.overallScore
  const scorePercent = typeof score === 'number' ? Math.max(0, Math.min(100, score)) : 0

  return (
    <div className="page feature-page feature-insights">
      <section className="feature-hero card">
        <div className="feature-hero-copy">
          <span className="feature-eyebrow">{isHindi ? 'इनसाइट्स' : 'Insights'}</span>
          <h1>{isHindi ? 'सारांश और सुझाव' : 'Summaries and recommendations'}</h1>
          <p className="muted">
            {isHindi ? 'आज की पोषण स्थिति और आपकी असली लॉग/प्रोफ़ाइल के आधार पर साप्ताहिक सारांश देखें।' : "See today's nutrition picture and a weekly health summary generated from your real logs and profile targets."}
          </p>
        </div>
        <div className="feature-hero-aside">
          <span className="feature-date-chip">{todayInsight?.date || (isHindi ? 'आज' : 'Today')}</span>
          <div className="feature-orbit feature-orbit-score">
            <strong>{loading ? '-' : score ?? '-'}</strong>
            <span>{typeof score === 'number' ? (isHindi ? 'साप्ताहिक स्कोर' : 'weekly score') : (isHindi ? 'डेटा की प्रतीक्षा' : 'waiting for data')}</span>
          </div>
        </div>
      </section>

      <section className="feature-layout">
        <Card className="feature-main-panel">
          <div className="feature-panel-head">
            <div>
              <h3>{isHindi ? 'आज की रिपोर्ट' : "Today's report"}</h3>
              <p className="muted">{isHindi ? 'आज अब तक आपने क्या लिया, उसका सरल सारांश।' : 'A simple view of what you have consumed so far today.'}</p>
            </div>
          </div>

          {todayInsight ? (
            <div className="feature-stack-list">
              <div className="feature-list-row">
                <div>
                  <strong>{isHindi ? 'आज ली गई कैलोरी' : 'Calories consumed today'}</strong>
                  <span>{isHindi ? 'आज के लॉग किए गए भोजन से' : "From today's logged meals"}</span>
                </div>
                <div className="feature-list-metric">{todayInsight.today?.calories ?? 0} kcal</div>
              </div>
              <div className="feature-list-row">
                <div>
                  <strong>{isHindi ? 'आज का प्रोटीन सेवन' : 'Protein intake today'}</strong>
                  <span>{isHindi ? 'आज के लॉग किए गए भोजन से' : "From today's logged meals"}</span>
                </div>
                <div className="feature-list-metric">{todayInsight.today?.protein ?? 0} g</div>
              </div>
            </div>
          ) : (
            <div className="feature-empty">
              <strong>{isHindi ? 'अभी कोई इनसाइट उपलब्ध नहीं है' : 'No insight available yet'}</strong>
              <p className="muted">{isHindi ? 'व्यक्तिगत सुझाव पाने के लिए प्रोफ़ाइल पूरी करें और दैनिक डेटा लॉग करें।' : 'Complete your profile and start logging daily data to generate personalized recommendations.'}</p>
            </div>
          )}
        </Card>

        <Card className="feature-side-panel">
          <div className="feature-panel-head">
            <div>
              <h3>{isHindi ? 'साप्ताहिक सारांश' : 'Weekly summary'}</h3>
              <p className="muted">{isHindi ? 'हाल की लॉग एंट्री के आधार पर त्वरित साप्ताहिक सारांश।' : 'A quick weekly overview based on your recent logs.'}</p>
            </div>
          </div>

          {weeklySummary ? (
            <>
              <div className="feature-score-track" aria-hidden="true">
                <span style={{ width: `${scorePercent}%` }} />
              </div>
              <div className="feature-stack-list">
                <div className="feature-list-row">
                  <div><strong>{isHindi ? 'लॉग किए गए दिन' : 'Days logged'}</strong><span>{isHindi ? 'वर्तमान विश्लेषण अवधि' : 'Current analysis window'}</span></div>
                  <div className="feature-list-metric">{weeklySummary.daysLogged ?? 0}</div>
                </div>
                <div className="feature-list-row">
                  <div><strong>{isHindi ? 'औसत कैलोरी' : 'Average calories'}</strong><span>{isHindi ? 'प्रति दिन' : 'Per day'}</span></div>
                  <div className="feature-list-metric">{weeklySummary.averages?.calories ?? 0}</div>
                </div>
                <div className="feature-list-row">
                  <div><strong>{isHindi ? 'औसत प्रोटीन' : 'Average protein'}</strong><span>{isHindi ? 'प्रति दिन' : 'Per day'}</span></div>
                  <div className="feature-list-metric">{weeklySummary.averages?.protein ?? 0} g</div>
                </div>
                <div className="feature-list-row">
                  <div><strong>{isHindi ? 'औसत नींद' : 'Average sleep'}</strong><span>{isHindi ? 'लॉग की गई रातें' : 'Logged nights'}</span></div>
                  <div className="feature-list-metric">{weeklySummary.averages?.sleep ?? '-'}</div>
                </div>
              </div>
            </>
          ) : (
            <div className="feature-empty">
              <strong>{isHindi ? 'कोई साप्ताहिक सारांश नहीं' : 'No weekly summary'}</strong>
              <p className="muted">{isHindi ? 'जैसे-जैसे लॉग बढ़ेंगे, यह सेक्शन कैलोरी, प्रोटीन और नींद के पैटर्न दिखाएगा।' : 'As your daily logs accumulate, this section will show patterns across calories, protein, and sleep.'}</p>
            </div>
          )}
        </Card>
      </section>
    </div>
  )
}
