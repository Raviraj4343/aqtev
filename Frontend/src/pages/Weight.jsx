import React, { useEffect, useMemo, useState } from 'react'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import * as api from '../utils/api'
import WeightChart from '../components/WeightChart'
import { useLanguage } from '../contexts/LanguageContext'

export default function Weight(){
  const { language } = useLanguage()
  const isHindi = language === 'hi'
  const [history, setHistory] = useState([])
  const [trend, setTrend] = useState(null)
  const [weekly, setWeekly] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ weightKg: '', note: '' })
  const [status, setStatus] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const [historyResponse, weeklyResponse] = await Promise.all([
        api.getWeightHistory({ days: 30 }),
        api.getWeeklyWeightSummary()
      ])
      const historyData = historyResponse?.data || {}
      setHistory(historyData.logs || [])
      setTrend(historyData.trend || null)
      setWeekly(weeklyResponse?.data || null)
    } catch (e) {
      setHistory([])
      setTrend(null)
      setWeekly(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const latestWeight = history.length ? history[history.length - 1]?.weightKg : null

  const summary = useMemo(() => [
    { label: isHindi ? 'नवीनतम वज़न' : 'Latest weight', value: latestWeight ?? '-', suffix: latestWeight ? 'kg' : '' },
    { label: isHindi ? 'एंट्री' : 'Entries', value: history.length, suffix: isHindi ? '30 दिन' : '30 days' },
    { label: isHindi ? 'साप्ताहिक बदलाव' : 'Weekly change', value: weekly?.weeklyChange ?? '-', suffix: weekly?.weeklyChange || weekly?.weeklyChange === 0 ? 'kg' : '' }
  ], [history.length, isHindi, latestWeight, weekly])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.weightKg) {
      setStatus(isHindi ? 'सहेजने के लिए सही वज़न दर्ज करें।' : 'Enter a valid weight to save.')
      return
    }

    setSaving(true)
    setStatus('')
    try {
      await api.logWeight({
        weightKg: Number(form.weightKg),
        note: form.note || undefined
      })
      setForm({ weightKg: '', note: '' })
      setStatus(isHindi ? 'वज़न सफलतापूर्वक सहेजा गया।' : 'Weight saved successfully.')
      await load()
    } catch (err) {
      setStatus(err?.payload?.message || err.message || (isHindi ? 'वज़न सहेजा नहीं जा सका।' : 'Unable to save weight.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page feature-page feature-weight">
      <section className="feature-hero card">
        <div className="feature-hero-copy">
          <span className="feature-eyebrow">{isHindi ? 'वज़न' : 'Weight'}</span>
          <h1>{isHindi ? 'समय के साथ लॉग और रुझान' : 'Logs and trends over time'}</h1>
          <p className="muted">
            {isHindi ? 'अपनी प्रगति लाइन सरल रखें, साप्ताहिक बदलाव देखें और आज का माप यहीं जोड़ें।' : 'Keep your trend line simple, see your weekly change, and add today\'s measurement without leaving the page.'}
          </p>
        </div>
        <div className="feature-hero-aside">
          <span className="feature-date-chip">{isHindi ? 'पिछले 30 दिन' : 'Last 30 days'}</span>
          <div className="feature-orbit feature-orbit-green">
            <strong>{loading ? '-' : latestWeight ?? '-'}</strong>
            <span>{latestWeight ? (isHindi ? 'वर्तमान किग्रा' : 'kg current') : (isHindi ? 'अभी कोई एंट्री नहीं' : 'no entries yet')}</span>
          </div>
        </div>
      </section>

      <section className="feature-summary-grid feature-summary-grid-compact">
        {summary.map((item) => (
          <Card key={item.label} className="feature-stat-card">
            <span className="feature-stat-label">{item.label}</span>
            <strong className="feature-stat-value">{loading ? '-' : item.value}</strong>
            <span className="feature-stat-note">{item.suffix}</span>
          </Card>
        ))}
      </section>

      <section className="feature-layout">
        <Card className="feature-main-panel">
          <div className="feature-panel-head">
            <div>
              <h3>{isHindi ? 'ट्रेंड दृश्य' : 'Trend view'}</h3>
              <p className="muted">{isHindi ? 'हाल की एंट्री और साप्ताहिक बदलाव एक नज़र में देखें।' : 'Review your recent entries and weekly movement at a glance.'}</p>
            </div>
          </div>
          <WeightChart data={history} loading={loading} />
          {trend?.message ? <div className="feature-inline-note">{trend.message}</div> : null}
        </Card>

        <Card className="feature-side-panel">
          <div className="feature-panel-head">
            <div>
              <h3>{isHindi ? 'आज का वज़न लॉग करें' : "Log today's weight"}</h3>
              <p className="muted">{isHindi ? 'आज की रीडिंग जोड़ें और प्रगति अपडेट रखें।' : "Add today's reading and keep your progress up to date."}</p>
            </div>
          </div>

          <form className="feature-form-stack" onSubmit={handleSubmit}>
            <Input
              id="weight-kg"
              label={isHindi ? 'वज़न (किग्रा)' : 'Weight (kg)'}
              type="number"
              value={form.weightKg}
              onChange={(e) => setForm((prev) => ({ ...prev, weightKg: e.target.value }))}
            />
            <Input
              id="weight-note"
              label={isHindi ? 'नोट (वैकल्पिक)' : 'Note (optional)'}
              value={form.note}
              onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
            />
            <Button type="submit" disabled={saving}>{saving ? (isHindi ? 'सहेजा जा रहा है...' : 'Saving...') : (isHindi ? 'वज़न सहेजें' : 'Save weight')}</Button>
          </form>

          {status ? <div className="feature-inline-note">{status}</div> : null}
          {weekly?.message ? <div className="feature-empty compact"><strong>{isHindi ? 'साप्ताहिक सारांश' : 'Weekly summary'}</strong><p className="muted">{weekly.message}</p></div> : null}
        </Card>
      </section>
    </div>
  )
}
