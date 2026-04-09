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
  const [dailyHistory, setDailyHistory] = useState([])
  const [trend, setTrend] = useState(null)
  const [weekly, setWeekly] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ weightKg: '' })
  const [status, setStatus] = useState('')
  const [activeChartKey, setActiveChartKey] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const [historyResponse, weeklyResponse, dailyHistoryResponse] = await Promise.all([
        api.getWeightHistory({ days: 30 }),
        api.getWeeklyWeightSummary(),
        api.getHistoryLogs({ days: 30, summary: true })
      ])
      const historyData = historyResponse?.data || {}
      setHistory(historyData.logs || [])
      setTrend(historyData.trend || null)
      setWeekly(weeklyResponse?.data || null)
      setDailyHistory(Array.isArray(dailyHistoryResponse?.data) ? dailyHistoryResponse.data : [])
    } catch (e) {
      setHistory([])
      setDailyHistory([])
      setTrend(null)
      setWeekly(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const latestWeight = history.length ? history[history.length - 1]?.weightKg : null

  const metricTrendData = useMemo(() => {
    const rows = Array.isArray(dailyHistory) ? dailyHistory : []
    return {
      calories: rows.map((entry, index) => ({
        _id: `cal-${entry?.date || index}`,
        date: entry?.date,
        totalCalories: Number(entry?.totalCalories) || 0,
      })),
      protein: rows.map((entry, index) => ({
        _id: `pro-${entry?.date || index}`,
        date: entry?.date,
        totalProtein: Number(entry?.totalProtein) || 0,
      })),
      steps: rows.map((entry, index) => ({
        _id: `steps-${entry?.date || index}`,
        date: entry?.date,
        steps: Number(entry?.steps) || 0,
      }))
    }
  }, [dailyHistory])

  const averages = useMemo(() => {
    if (!dailyHistory.length) return { calories: null, protein: null, steps: null }

    const totals = dailyHistory.reduce((acc, row) => ({
      calories: acc.calories + (Number(row?.totalCalories) || 0),
      protein: acc.protein + (Number(row?.totalProtein) || 0),
      steps: acc.steps + (Number(row?.steps) || 0),
    }), { calories: 0, protein: 0, steps: 0 })

    return {
      calories: Math.round(totals.calories / dailyHistory.length),
      protein: Math.round(totals.protein / dailyHistory.length),
      steps: Math.round(totals.steps / dailyHistory.length),
    }
  }, [dailyHistory])

  const chartConfigs = useMemo(() => ([
    {
      key: 'weight',
      title: isHindi ? 'वज़न ट्रेंड' : 'Weight trend',
      data: history,
      metricKey: 'weightKg',
      unit: 'kg',
      seriesLabel: isHindi ? 'वज़न' : 'Weight',
      emptyText: isHindi ? 'अभी वज़न डेटा नहीं है।' : 'No weight data yet.',
      decimals: 1,
    },
    {
      key: 'calories',
      title: isHindi ? 'कैलोरी ट्रेंड' : 'Calorie trend',
      data: metricTrendData.calories,
      metricKey: 'totalCalories',
      unit: 'kcal',
      seriesLabel: isHindi ? 'कैलोरी' : 'Calories',
      emptyText: isHindi ? 'अभी कैलोरी डेटा नहीं है।' : 'No calorie data yet.',
      decimals: 0,
    },
    {
      key: 'protein',
      title: isHindi ? 'प्रोटीन ट्रेंड' : 'Protein trend',
      data: metricTrendData.protein,
      metricKey: 'totalProtein',
      unit: 'g',
      seriesLabel: isHindi ? 'प्रोटीन' : 'Protein',
      emptyText: isHindi ? 'अभी प्रोटीन डेटा नहीं है।' : 'No protein data yet.',
      decimals: 0,
    },
    {
      key: 'steps',
      title: isHindi ? 'स्टेप्स ट्रेंड' : 'Steps trend',
      data: metricTrendData.steps,
      metricKey: 'steps',
      unit: isHindi ? 'कदम' : 'steps',
      seriesLabel: isHindi ? 'स्टेप्स' : 'Steps',
      emptyText: isHindi ? 'अभी स्टेप्स डेटा नहीं है।' : 'No steps data yet.',
      decimals: 0,
    }
  ]), [history, isHindi, metricTrendData])

  const activeChart = chartConfigs.find((chart) => chart.key === activeChartKey) || null
  const primaryChart = chartConfigs[0] || null
  const activeChartProps = activeChart
    ? {
        data: activeChart.data,
        metricKey: activeChart.metricKey,
        unit: activeChart.unit,
        seriesLabel: activeChart.seriesLabel,
        emptyText: activeChart.emptyText,
        decimals: activeChart.decimals,
      }
    : null

  const summary = useMemo(() => [
    { label: isHindi ? 'नवीनतम वज़न' : 'Latest weight', value: latestWeight ?? '-', suffix: latestWeight ? 'kg' : '' },
    { label: isHindi ? 'साप्ताहिक बदलाव' : 'Weekly change', value: weekly?.weeklyChange ?? '-', suffix: weekly?.weeklyChange || weekly?.weeklyChange === 0 ? 'kg' : '' },
    { label: isHindi ? 'औसत कैलोरी' : 'Avg calories', value: averages.calories ?? '-', suffix: 'kcal/day' },
    { label: isHindi ? 'औसत प्रोटीन' : 'Avg protein', value: averages.protein ?? '-', suffix: 'g/day' },
    { label: isHindi ? 'औसत कदम' : 'Avg steps', value: averages.steps ?? '-', suffix: isHindi ? 'कदम/दिन' : 'steps/day' },
  ], [averages, isHindi, latestWeight, weekly])

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
        weightKg: Number(form.weightKg)
      })
      setForm({ weightKg: '' })
      setStatus(isHindi ? 'वज़न सफलतापूर्वक सहेजा गया।' : 'Weight saved successfully.')
      await load()
    } catch (err) {
      setStatus(err?.payload?.message || err.message || (isHindi ? 'वज़न सहेजा नहीं जा सका।' : 'Unable to save weight.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page feature-page feature-weight trend-page">
      <section className="card trend-header">
        <div className="trend-header-copy">
          <span className="feature-eyebrow">{isHindi ? 'ट्रेंड' : 'Trend'}</span>
          <h1>{isHindi ? 'प्रगति ट्रेंड' : 'Progress trends'}</h1>
          <p className="muted">
            {isHindi ? 'वज़न, कैलोरी, प्रोटीन और कदम को एक जगह ट्रैक करें।' : 'Track weight, calories, protein, and steps in one place.'}
          </p>
        </div>
        <span className="feature-date-chip">{isHindi ? 'पिछले 30 दिन' : 'Last 30 days'}</span>
      </section>

      <div className="trend-divider" aria-hidden="true" />

      <section className="trend-summary-grid">
        {summary.map((item) => (
          <Card key={item.label} className="trend-stat-card">
            <span className="feature-stat-label">{item.label}</span>
            <strong className="feature-stat-value">{loading ? '-' : item.value}</strong>
            <span className="feature-stat-note">{item.suffix}</span>
          </Card>
        ))}
      </section>

      <div className="trend-divider" aria-hidden="true" />

      <section className="card trend-charts-shell">
        <div className="feature-panel-head">
          <div>
            <h3>{isHindi ? 'ट्रेंड चार्ट' : 'Trend charts'}</h3>
            <p className="muted">{isHindi ? 'किसी भी चार्ट पर क्लिक करके विस्तृत दृश्य देखें।' : 'Click any chart to open an expanded view.'}</p>
          </div>
        </div>

        <div
          className="trend-metric-card trend-metric-clickable"
          role="button"
          tabIndex={0}
          onClick={() => setActiveChartKey('weight')}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              setActiveChartKey('weight')
            }
          }}
          aria-label={isHindi ? 'वज़न ट्रेंड बड़ा देखें' : 'Open weight trend in popup'}
        >
          <h4>{isHindi ? 'वज़न ट्रेंड' : 'Weight trend'}</h4>
          {primaryChart ? (
            <WeightChart
              data={primaryChart.data}
              loading={loading}
              metricKey={primaryChart.metricKey}
              unit={primaryChart.unit}
              seriesLabel={primaryChart.seriesLabel}
              emptyText={primaryChart.emptyText}
              decimals={primaryChart.decimals}
            />
          ) : null}
        </div>

        <div className="trend-metric-grid">
          {chartConfigs.slice(1).map((chart) => {
            const { key, title, ...chartProps } = chart
            return (
              <div
                key={key}
                className="trend-metric-card trend-metric-clickable"
                role="button"
                tabIndex={0}
                onClick={() => setActiveChartKey(key)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    setActiveChartKey(key)
                  }
                }}
                aria-label={isHindi ? `${title} बड़ा देखें` : `Open ${title} in popup`}
              >
                <h4>{title}</h4>
                <WeightChart {...chartProps} loading={loading} />
              </div>
            )
          })}
        </div>

        {trend?.message ? <div className="feature-inline-note">{trend.message}</div> : null}
      </section>

      <div className="trend-divider" aria-hidden="true" />

      <section className="card trend-quick-log">
        <div className="feature-panel-head">
          <div>
            <h3>{isHindi ? 'त्वरित वज़न लॉग' : 'Quick weight log'}</h3>
            <p className="muted">{isHindi ? 'आज का वज़न दर्ज करें।' : 'Log today\'s weight.'}</p>
          </div>
        </div>

        <form className="trend-quick-log-form" onSubmit={handleSubmit}>
          <Input
            id="weight-kg"
            label={isHindi ? 'वज़न (किग्रा)' : 'Weight (kg)'}
            type="number"
            value={form.weightKg}
            onChange={(e) => setForm((prev) => ({ ...prev, weightKg: e.target.value }))}
          />
          <Button type="submit" disabled={saving}>{saving ? (isHindi ? 'सहेजा जा रहा है...' : 'Saving...') : (isHindi ? 'वज़न सहेजें' : 'Save weight')}</Button>
        </form>

        {status ? <div className="feature-inline-note">{status}</div> : null}
        {weekly?.message ? <div className="feature-inline-note">{weekly.message}</div> : null}
      </section>

      {activeChart ? (
        <div className="trend-modal-backdrop" role="presentation" onClick={() => setActiveChartKey(null)}>
          <div
            className="trend-modal-card card"
            role="dialog"
            aria-modal="true"
            aria-label={activeChart.title}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="trend-modal-head">
              <div>
                <h3>{activeChart.title}</h3>
                <p className="muted">{isHindi ? 'पॉइंट पर hover करें और क्लिक से चयन लॉक करें।' : 'Hover points and click to lock selection.'}</p>
              </div>
              <button
                type="button"
                className="trend-modal-close"
                onClick={() => setActiveChartKey(null)}
                aria-label={isHindi ? 'पॉपअप बंद करें' : 'Close popup'}
              >
                ×
              </button>
            </div>

            {activeChartProps ? <WeightChart {...activeChartProps} loading={loading} height={340} /> : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
