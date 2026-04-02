import React, { useEffect, useState } from 'react'
import Card from '../components/ui/Card'
import api from '../utils/api'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'

const clampPercent = (value, max) => {
  if (value === null || value === undefined || Number.isNaN(Number(value)) || max <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((Number(value) / max) * 100)))
}

const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value))

const getBodyBalanceScore = (bmi) => {
  const numeric = Number(bmi)
  if (!numeric) return 0
  const idealBmi = 22
  return clamp(Math.round(100 - Math.abs(numeric - idealBmi) * 12))
}

const toTitle = (value = '') =>
  String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())

const formatTimelineDate = (isoDate, isHindi) => {
  if (!isoDate) return isHindi ? 'हाल ही में' : 'Recently'
  const now = new Date()
  const date = new Date(`${isoDate}T00:00:00`)
  if (Number.isNaN(date.getTime())) return isoDate

  const dayDiff = Math.floor((now.setHours(0, 0, 0, 0) - date.getTime()) / 86400000)
  if (dayDiff <= 0) return isHindi ? 'आज' : 'Today'
  if (dayDiff === 1) return isHindi ? 'कल' : 'Yesterday'
  return isHindi ? `${dayDiff} दिन पहले` : `${dayDiff}d ago`
}

const getBmiCategory = (bmi, isHindi) => {
  const numeric = Number(bmi)
  if (!numeric) return isHindi ? 'प्रोफ़ाइल डेटा की प्रतीक्षा' : 'Awaiting profile data'
  if (numeric < 18.5) return isHindi ? 'कम श्रेणी' : 'Lean range'
  if (numeric < 25) return isHindi ? 'संतुलित श्रेणी' : 'Balanced range'
  if (numeric < 30) return isHindi ? 'बढ़ी हुई श्रेणी' : 'Elevated range'
  return isHindi ? 'उच्च श्रेणी' : 'High range'
}

const formatValue = (value, suffix = '') => {
  if (value === null || value === undefined) return '-'
  return `${value}${suffix}`
}

const waterToLiters = (value) => {
  const map = { '<1L': 0.8, '1-2L': 1.5, '2-3L': 2.5, '3L+': 3.2 }
  return map[value] ?? null
}

export default function Dashboard(){
  const { language } = useLanguage()
  const isHindi = language === 'hi'
  const { user } = useAuth() || {}
  const [stats, setStats] = useState({ bmi: null, requiredCalories: null, requiredProtein: null })
  const [today, setToday] = useState({ calories: 0, protein: 0 })
  const [activityItems, setActivityItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeBoostMetric, setActiveBoostMetric] = useState(null)
  const [boostFoodsByNutrient, setBoostFoodsByNutrient] = useState({})
  const [boostLoading, setBoostLoading] = useState(false)
  const [boostError, setBoostError] = useState('')
  const [summaryRows, setSummaryRows] = useState([])

  useEffect(() => {
    let mounted = true

    async function load(){
      try {
        const [res, todayRes, historyRes, weightRes] = await Promise.all([
          api.getHealthStats(),
          api.getTodayInsight().catch(() => null),
          api.getHistoryLogs().catch(() => null),
          api.getWeightHistory({ days: 7 }).catch(() => null)
        ])
        if (!mounted) return
        const data = res?.data || {}
        const todayData = todayRes?.data?.today || {}
        const logs = Array.isArray(historyRes?.data) ? historyRes.data : []
        const latestLog = logs[0] || null
        const weightLogs = Array.isArray(weightRes?.data?.logs) ? weightRes.data.logs : []
        const latestWeight = weightLogs.length ? weightLogs[weightLogs.length - 1] : null

        const timeline = []

        if (latestLog) {
          const mealCount = Array.isArray(latestLog.meals)
            ? latestLog.meals.reduce((sum, meal) => sum + (Array.isArray(meal.items) ? meal.items.length : 0), 0)
            : 0

          timeline.push({
            id: `log-${latestLog.date}`,
            text: isHindi
              ? `${Math.round(latestLog.totalCalories || 0)} kcal और ${Math.round(latestLog.totalProtein || 0)} ग्राम प्रोटीन लॉग किया${mealCount ? ` (${mealCount} फूड एंट्री)` : ''}।`
              : `Logged ${Math.round(latestLog.totalCalories || 0)} kcal and ${Math.round(latestLog.totalProtein || 0)} g protein${mealCount ? ` across ${mealCount} food entries` : ''}.`,
            time: formatTimelineDate(latestLog.date, isHindi)
          })

          if (latestLog.steps) {
            timeline.push({
              id: `steps-${latestLog.date}`,
              text: isHindi ? `${latestLog.steps.toLocaleString()} कदम रिकॉर्ड किए।` : `Recorded ${latestLog.steps.toLocaleString()} steps.`,
              time: formatTimelineDate(latestLog.date, isHindi)
            })
          }

          if (latestLog.sleepHours !== null && latestLog.sleepHours !== undefined) {
            timeline.push({
              id: `sleep-${latestLog.date}`,
              text: isHindi ? `${latestLog.sleepHours} घंटे की नींद लॉग की।` : `Logged ${latestLog.sleepHours} hours of sleep.`,
              time: formatTimelineDate(latestLog.date, isHindi)
            })
          }

          if (latestLog.waterIntake) {
            timeline.push({
              id: `water-${latestLog.date}`,
              text: isHindi ? `पानी का सेवन ${toTitle(latestLog.waterIntake)} सेट किया गया।` : `Water intake set to ${toTitle(latestLog.waterIntake)}.`,
              time: formatTimelineDate(latestLog.date, isHindi)
            })
          }
        }

        if (latestWeight?.weightKg) {
          timeline.push({
            id: `weight-${latestWeight.date}`,
            text: isHindi ? `वज़न ${latestWeight.weightKg} किग्रा अपडेट किया गया।` : `Weight updated to ${latestWeight.weightKg} kg.`,
            time: formatTimelineDate(latestWeight.date, isHindi)
          })
        }

        setActivityItems(timeline.slice(0, 4))

        const loggedDays = logs.length
        const avgCalories = loggedDays
          ? Math.round(logs.reduce((sum, log) => sum + Number(log?.totalCalories || 0), 0) / loggedDays)
          : 0
        const avgProtein = loggedDays
          ? Math.round(logs.reduce((sum, log) => sum + Number(log?.totalProtein || 0), 0) / loggedDays)
          : 0
        const avgFiber = loggedDays
          ? Math.round(logs.reduce((sum, log) => sum + Number(log?.totalFiber || 0), 0) / loggedDays)
          : 0

        const waterValues = logs
          .map((log) => waterToLiters(log?.waterIntake))
          .filter((value) => value !== null)
        const avgWater = waterValues.length
          ? Math.round((waterValues.reduce((sum, value) => sum + value, 0) / waterValues.length) * 10) / 10
          : null

        const sleepValues = logs
          .map((log) => Number(log?.sleepHours))
          .filter((value) => Number.isFinite(value) && value > 0)
        const avgSleep = sleepValues.length
          ? Math.round((sleepValues.reduce((sum, value) => sum + value, 0) / sleepValues.length) * 10) / 10
          : null

        const stepValues = logs
          .map((log) => Number(log?.steps))
          .filter((value) => Number.isFinite(value) && value > 0)
        const avgSteps = stepValues.length
          ? Math.round(stepValues.reduce((sum, value) => sum + value, 0) / stepValues.length)
          : null

        setSummaryRows([
          { label: isHindi ? 'औसत कैलोरी' : 'Average calories', note: isHindi ? 'प्रति दिन' : 'Per day', value: loggedDays ? `${avgCalories}` : '-' },
          { label: isHindi ? 'औसत प्रोटीन' : 'Average protein', note: isHindi ? 'प्रति दिन' : 'Per day', value: loggedDays ? `${avgProtein} g` : '-' },
          { label: isHindi ? 'औसत नींद' : 'Average sleep', note: isHindi ? 'लॉग की गई रातें' : 'Logged nights', value: avgSleep !== null ? `${avgSleep} h` : '-' },
          { label: isHindi ? 'औसत पानी' : 'Average water', note: isHindi ? 'लॉग किए गए दिन' : 'Logged days', value: avgWater !== null ? `${avgWater} L` : '-' },
          { label: isHindi ? 'औसत फाइबर' : 'Average fiber', note: isHindi ? 'प्रति दिन' : 'Per day', value: loggedDays ? `${avgFiber} g` : '-' },
          { label: isHindi ? 'औसत कदम' : 'Average steps', note: isHindi ? 'लॉग किए गए दिन' : 'Logged days', value: avgSteps !== null ? `${avgSteps}` : '-' }
        ])

        setStats({
          bmi: data.bmi ?? null,
          requiredCalories: data.requiredCalories ?? null,
          requiredProtein: data.requiredProtein ?? null
        })
        setToday({
          calories: todayData.calories ?? 0,
          protein: todayData.protein ?? 0
        })
      } catch (e) {
        // keep graceful empty state
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => { mounted = false }
  }, [isHindi])

  const metricCards = [
    {
      id: 'bmi',
      label: 'BMI',
      value: loading ? '-' : formatValue(stats.bmi),
      note: getBmiCategory(stats.bmi, isHindi),
      accent: 'teal',
      progress: getBodyBalanceScore(stats.bmi)
    },
    {
      id: 'calories',
      label: isHindi ? 'दैनिक कैलोरी' : 'Daily Calories',
      value: loading ? '-' : formatValue(stats.requiredCalories),
      note: isHindi ? 'अनुमानित दैनिक लक्ष्य' : 'Estimated daily target',
      accent: 'blue',
      progress: stats.requiredCalories ? clampPercent(today.calories, stats.requiredCalories) : 0
    },
    {
      id: 'protein',
      label: isHindi ? 'प्रोटीन लक्ष्य' : 'Protein Goal',
      value: loading ? '-' : formatValue(stats.requiredProtein, 'g'),
      note: isHindi ? 'सुझाया गया दैनिक सेवन' : 'Suggested daily intake',
      accent: 'green',
      progress: stats.requiredProtein ? clampPercent(today.protein, stats.requiredProtein) : 0
    }
  ]

  const calorieGap = Math.max(0, (stats.requiredCalories || 0) - (today.calories || 0))

  useEffect(() => {
    if (!activeBoostMetric?.nutrient) return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setActiveBoostMetric(null)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeBoostMetric?.nutrient])

  useEffect(() => {
    const nutrient = activeBoostMetric?.nutrient
    if (!nutrient) return
    if (boostFoodsByNutrient[nutrient]) return

    let cancelled = false

    async function loadBoostFoods() {
      setBoostLoading(true)
      setBoostError('')

      try {
        const diet = user?.dietPreference === 'veg' ? 'veg' : undefined
        const res = await api.getBoostFoods({ nutrient, diet, limit: 6 })
        if (cancelled) return
        const list = Array.isArray(res?.data) ? res.data : []
        setBoostFoodsByNutrient((prev) => ({ ...prev, [nutrient]: list }))
      } catch {
        if (!cancelled) setBoostError(isHindi ? 'अभी फूड सुझाव लोड नहीं हो सके।' : 'Unable to load food suggestions right now.')
      } finally {
        if (!cancelled) setBoostLoading(false)
      }
    }

    loadBoostFoods()
    return () => { cancelled = true }
  }, [activeBoostMetric?.nutrient, boostFoodsByNutrient, user?.dietPreference])

  const boostFoods = activeBoostMetric?.nutrient
    ? (boostFoodsByNutrient[activeBoostMetric.nutrient] || [])
    : []

  return (
    <div className="page dashboard dashboard-page">
      <section className="dashboard-hero card">
        <div className="dashboard-hero-copy">
          <span className="dashboard-eyebrow">{isHindi ? 'दैनिक सारांश' : 'Daily overview'}</span>
          <h1>{isHindi ? 'डैशबोर्ड' : 'Dashboard'}</h1>
          <p className="muted">
            {isHindi ? 'आपके स्वास्थ्य लक्ष्य, प्रोफ़ाइल संकेत और आज किन चीज़ों पर ध्यान दें, इसका साफ़ दृश्य।' : 'A clean view of your health targets, profile signals, and what deserves attention today.'}
          </p>

          <div className="dashboard-hero-badges">
            <span className="dashboard-badge">{metricCards[0].note}</span>
            <span className="dashboard-badge">{isHindi ? 'सरल और केंद्रित प्रगति ट्रैकिंग' : 'Simple, focused progress tracking'}</span>
          </div>
        </div>

        <div className="dashboard-hero-visual" aria-hidden="true">
          <div className="dashboard-orbit">
            <div className="dashboard-orbit-core">
              <span className="dashboard-orbit-label">{isHindi ? 'आज' : 'Today'}</span>
              <strong>{loading ? '-' : formatValue(today.calories)}</strong>
              <span className="dashboard-orbit-caption">{isHindi ? 'कैलोरी' : 'calories'}</span>
            </div>
          </div>
          <div className="dashboard-hero-mini-stats">
            <button
              type="button"
              className="dashboard-hero-mini-btn"
              onClick={() => setActiveBoostMetric({
                nutrient: 'energy',
                title: isHindi ? 'बची हुई कैलोरी' : 'Calorie remaining',
                remaining: isHindi ? `${Math.round(calorieGap)} kcal शेष` : `${Math.round(calorieGap)} kcal remaining`
              })}
            >
              <span>{isHindi ? 'शेष कैलोरी' : 'Calorie Remaining'}</span>
              <strong>{loading ? '-' : formatValue(Math.round(calorieGap), ' kcal')}</strong>
            </button>
            <button
              type="button"
              className="dashboard-hero-mini-btn"
              onClick={() => setActiveBoostMetric({
                nutrient: 'protein',
                title: isHindi ? 'आज लिया गया प्रोटीन' : 'Protein consumed today',
                remaining: stats.requiredProtein
                  ? (isHindi ? `${Math.round(today.protein || 0)} g / ${Math.round(stats.requiredProtein)} g लक्ष्य` : `${Math.round(today.protein || 0)} g / ${Math.round(stats.requiredProtein)} g target`)
                  : (isHindi ? `${Math.round(today.protein || 0)} g आज लॉग` : `${Math.round(today.protein || 0)} g logged today`)
              })}
            >
              <span>{isHindi ? 'प्रोटीन सेवन' : 'Protein Consumed'}</span>
              <strong>{loading ? '-' : formatValue(Math.round(today.protein || 0), 'g')}</strong>
            </button>
          </div>
        </div>
      </section>

      <section className="stats-grid dashboard-metrics">
        {metricCards.map((metric) => (
          <Card key={metric.id} className={`stat-card stat-card-${metric.accent}`}>
            <div className="stat-row">
              <div className="stat-icon" aria-hidden="true">
                <span className="stat-icon-dot" />
              </div>
              <div className="stat-copy">
                <div className="stat-label">{metric.label}</div>
                <div className="stat-value">{metric.value}</div>
                <div className="stat-note">{metric.note}</div>
              </div>
            </div>
            <div className="stat-progress" aria-hidden="true">
              <span style={{ width: `${metric.progress}%` }} />
            </div>
          </Card>
        ))}
      </section>

      <section className="dashboard-grid dashboard-layout">
        <Card className="activity-card dashboard-panel">
          <div className="dashboard-panel-header">
            <div>
              <h3>{isHindi ? 'हाल की गतिविधि' : 'Recent activity'}</h3>
              <p className="muted">{isHindi ? 'आपकी नवीनतम लॉग एक ही जगह।' : 'Your latest logs in one place.'}</p>
            </div>
          </div>

          <div className="dashboard-callout">
            <strong>{isHindi ? 'टाइमलाइन' : 'Timeline'}</strong>
            {activityItems.length ? (
              <ul className="activity-list">
                {activityItems.map((item) => (
                  <li key={item.id} className="activity-item">
                    <div className="activity-text">{item.text}</div>
                    <div className="activity-time">{item.time}</div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">
                {isHindi ? 'अभी कोई हाल की गतिविधि उपलब्ध नहीं है। लॉग शुरू करने पर टाइमलाइन यहाँ दिखेगी।' : 'No recent activity is available yet. Once you start logging meals, weight, or daily data, your timeline will appear here.'}
              </p>
            )}
          </div>
        </Card>

        <Card className="subs-card dashboard-panel dashboard-profile-panel">
          <div className="dashboard-panel-header">
            <div>
              <h3>{isHindi ? 'सारांश' : 'Summary'}</h3>
              <p className="muted">{isHindi ? 'हाल के दैनिक औसत एक नज़र में।' : 'Your recent daily averages at a glance.'}</p>
            </div>
          </div>

          <div className="dashboard-summary-list dashboard-summary-metric-list">
            {summaryRows.map((row) => (
              <div className="dashboard-summary-item dashboard-summary-metric" key={row.label}>
                <div>
                  <strong>{row.label}</strong>
                  <span>{row.note}</span>
                </div>
                <em>{row.value}</em>
              </div>
            ))}
          </div>
        </Card>
      </section>

      {activeBoostMetric ? (
        <div className="dashboard-modal-backdrop" onClick={() => setActiveBoostMetric(null)} aria-hidden="true">
          <div
            className="dashboard-modal guide-food-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dashboard-boost-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="dashboard-modal-close"
              aria-label={isHindi ? 'फूड सुझाव बंद करें' : 'Close food suggestions'}
              onClick={() => setActiveBoostMetric(null)}
            >
              ×
            </button>

            <div className="dashboard-modal-head">
              <span className="dashboard-eyebrow">{isHindi ? 'क्विक फूड बूस्ट' : 'Quick Food Boost'}</span>
              <h3 id="dashboard-boost-title">{activeBoostMetric.title}</h3>
              <p className="muted">{activeBoostMetric.remaining}</p>
            </div>

            <div className="dashboard-modal-body">
              {boostLoading ? <p className="muted">{isHindi ? 'फूड सुझाव लोड हो रहे हैं...' : 'Loading food suggestions...'}</p> : null}
              {boostError ? <p className="muted">{boostError}</p> : null}

              {!boostLoading && !boostError ? (
                <div className="guide-food-list">
                  {boostFoods.length ? boostFoods.map((food) => (
                    <div className="guide-food-item" key={`${activeBoostMetric.nutrient}-${food.name}`}>
                      <div>
                        <strong>{food.name}</strong>
                        <span>{food.nameHindi || (isHindi ? 'आपकी फूड लाइब्रेरी में लोकप्रिय' : 'Popular in your food library')}</span>
                      </div>
                      <div className="guide-food-metric">
                        <em>{food.highlight || '-'}</em>
                        <small>{food.category} · {food.dietType === 'non_veg' ? (isHindi ? 'मांसाहारी' : 'non-veg') : (isHindi ? 'शाकाहारी' : 'veg')}</small>
                      </div>
                    </div>
                  )) : <p className="muted">{isHindi ? 'अभी उपयुक्त सुझाव नहीं मिले।' : 'No strong matches found right now.'}</p>}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
