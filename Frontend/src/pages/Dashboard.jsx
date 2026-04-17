import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
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

const getBmiCategory = (bmi, isHindi) => {
  const numeric = Number(bmi)
  if (!numeric) return isHindi ? 'प्रोफाइल डेटा की प्रतीक्षा' : 'Awaiting profile data'
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

const formatCount = (value = 0, label, pluralize = true) => `${value} ${label}${pluralize && value !== 1 ? 's' : ''}`

const formatRelativeDate = (value, isHindi) => {
  if (!value) return isHindi ? 'अभी' : 'Just now'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return isHindi ? 'अभी' : 'Just now'

  const diffMs = Date.now() - date.getTime()
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000))

  if (diffMinutes < 1) return isHindi ? 'अभी' : 'Just now'
  if (diffMinutes < 60) return isHindi ? `${diffMinutes}मि पहले` : `${diffMinutes}m ago`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return isHindi ? `${diffHours}घं पहले` : `${diffHours}h ago`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return isHindi ? `${diffDays}दिन पहले` : `${diffDays}d ago`

  return date.toLocaleDateString()
}

const getPostFameScore = (post = {}) => {
  const likes = Number(post.likeCount || 0)
  const comments = Number(post.commentCount || 0)
  const views = Number(post.viewsCount || 0)
  return likes * 5 + comments * 4 + views
}

const getAuthorPills = (author = {}, isHindi = false) => {
  const goalMap = {
    weight_loss: isHindi ? 'वेट लॉस' : 'Weight loss',
    muscle_gain: isHindi ? 'Muscle gain' : 'Muscle gain',
    maintain: isHindi ? 'Maintain' : 'Maintain'
  }
  const activityMap = {
    sedentary: isHindi ? 'लो एक्टिव' : 'Low active',
    light: isHindi ? 'लाइट एक्टिव' : 'Light active',
    moderate: isHindi ? 'मॉडरेट' : 'Moderate',
    active: isHindi ? 'एक्टिव' : 'Active'
  }
  const dietMap = {
    veg: isHindi ? 'Veg' : 'Veg',
    non_veg: isHindi ? 'Non-veg' : 'Non-veg',
    mixed: isHindi ? 'Mixed' : 'Mixed'
  }

  return [goalMap[author.goal], activityMap[author.activityLevel], dietMap[author.dietPreference]].filter(Boolean)
}

export default function Dashboard(){
  const { language } = useLanguage()
  const isHindi = language === 'hi'
  const { user } = useAuth() || {}
  const [stats, setStats] = useState({ bmi: null, requiredCalories: null, requiredProtein: null })
  const [today, setToday] = useState({ calories: 0, protein: 0 })
  const [loading, setLoading] = useState(true)
  const [activeBoostMetric, setActiveBoostMetric] = useState(null)
  const [boostFoodsByNutrient, setBoostFoodsByNutrient] = useState({})
  const [boostLoading, setBoostLoading] = useState(false)
  const [boostError, setBoostError] = useState('')
  const [summaryRows, setSummaryRows] = useState([])
  const [featuredPost, setFeaturedPost] = useState(null)

  const buildSummaryRows = (logs = []) => {
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

    return [
      { label: isHindi ? 'औसत कैलोरी' : 'Average calories', note: isHindi ? 'प्रति दिन' : 'Per day', value: loggedDays ? `${avgCalories}` : '-' },
      { label: isHindi ? 'औसत प्रोटीन' : 'Average protein', note: isHindi ? 'प्रति दिन' : 'Per day', value: loggedDays ? `${avgProtein} g` : '-' },
      { label: isHindi ? 'औसत नींद' : 'Average sleep', note: isHindi ? 'लॉग की गई रातें' : 'Logged nights', value: avgSleep !== null ? `${avgSleep} h` : '-' },
      { label: isHindi ? 'औसत पानी' : 'Average water', note: isHindi ? 'लॉग किए गए दिन' : 'Logged days', value: avgWater !== null ? `${avgWater} L` : '-' },
      { label: isHindi ? 'औसत फाइबर' : 'Average fiber', note: isHindi ? 'प्रति दिन' : 'Per day', value: loggedDays ? `${avgFiber} g` : '-' },
      { label: isHindi ? 'औसत कदम' : 'Average steps', note: isHindi ? 'लॉग किए गए दिन' : 'Logged days', value: avgSteps !== null ? `${avgSteps}` : '-' }
    ]
  }

  useEffect(() => {
    let mounted = true

    async function load(){
      try {
        const [res, todayRes, postsRes] = await Promise.all([
          api.getHealthStats(),
          api.getTodayInsight().catch(() => null),
          api.getPosts().catch(() => null)
        ])
        if (!mounted) return

        const data = res?.data || {}
        const todayData = todayRes?.data?.today || {}

        setStats({
          bmi: data.bmi ?? null,
          requiredCalories: data.requiredCalories ?? null,
          requiredProtein: data.requiredProtein ?? null
        })
        setToday({
          calories: todayData.calories ?? 0,
          protein: todayData.protein ?? 0
        })

        const posts = Array.isArray(postsRes?.data) ? postsRes.data : []
        const topPost = posts.length
          ? [...posts]
            .sort((a, b) => {
              const scoreDiff = getPostFameScore(b) - getPostFameScore(a)
              if (scoreDiff !== 0) return scoreDiff
              return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
            })[0]
          : null
        setFeaturedPost(topPost)
        setLoading(false)

        const historyRes = await api.getHistoryLogs({ days: 7, summary: 1 }).catch(() => null)
        if (!mounted) return

        const logs = Array.isArray(historyRes?.data) ? historyRes.data : []
        setSummaryRows(buildSummaryRows(logs))
      } catch {
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
  }, [activeBoostMetric?.nutrient, boostFoodsByNutrient, user?.dietPreference, isHindi])

  const boostFoods = activeBoostMetric?.nutrient
    ? (boostFoodsByNutrient[activeBoostMetric.nutrient] || [])
    : []
  const visibleSummaryRows = summaryRows.length ? summaryRows : buildSummaryRows([])

  return (
    <div className="page dashboard dashboard-page">
      <section className="dashboard-hero card">
        <div className="dashboard-hero-copy">
          <span className="dashboard-eyebrow">{isHindi ? 'दैनिक सारांश' : 'Daily overview'}</span>
          <h1>{isHindi ? 'डैशबोर्ड' : 'Dashboard'}</h1>
          <p className="muted">
            {isHindi ? 'आपके स्वास्थ्य लक्ष्य, प्रोफाइल संकेत और आज किन चीज़ों पर ध्यान दें, इसका साफ़ दृश्य।' : 'A clean view of your health targets, profile signals, and what deserves attention today.'}
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

      <section className="dashboard-lower-layout">
        <Card className="dashboard-panel dashboard-main-focus-card">
          <div className="dashboard-panel-header">
            <div>
              <h3>{isHindi ? 'हेल्थ पोस्ट' : 'Health Posts'}</h3>
              <p className="muted">{isHindi ? 'कम्युनिटी पोस्ट और हेल्थ अपडेट्स तक जल्दी पहुँच।' : 'Quick access to community posts and health updates.'}</p>
            </div>
            <Link to="/posts" className="btn-ghost dashboard-posts-header-link">{isHindi ? 'पोस्ट देखें' : 'View posts'}</Link>
          </div>

          <div className="dashboard-community-card">
            {featuredPost ? (
              <Link to="/posts" className="dashboard-featured-post-link" aria-label={isHindi ? 'पोस्ट खोलें' : 'Open post'}>
                <article className="dashboard-featured-post">
                  <div className="dashboard-featured-post-author">
                    <div className="dashboard-featured-post-avatar" aria-hidden="true">
                      {featuredPost.author?.avatarUrl ? (
                        <img src={featuredPost.author.avatarUrl} alt="" />
                      ) : (
                        <span>{(featuredPost.author?.name || 'U').charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="dashboard-featured-post-author-copy">
                      <strong>{featuredPost.author?.name || (isHindi ? 'कम्युनिटी सदस्य' : 'Community member')}</strong>
                      <div className="dashboard-featured-post-author-pills">
                        {getAuthorPills(featuredPost.author, isHindi).slice(0, 2).map((pill) => (
                          <span key={pill}>{pill}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="dashboard-featured-post-head">
                    <strong>{featuredPost.title || (isHindi ? 'ट्रेंडिंग पोस्ट' : 'Trending post')}</strong>
                    <span>{formatRelativeDate(featuredPost.createdAt, isHindi)}</span>
                  </div>
                  <p>{featuredPost.description || (isHindi ? 'इस पोस्ट को देखें और समुदाय से जुड़ें।' : 'Open this post and engage with the community.')}</p>
                  <div className="dashboard-featured-post-meta">
                    <span>{formatCount(Number(featuredPost.likeCount || 0), isHindi ? 'लाइक' : 'like', !isHindi)}</span>
                    <span>{formatCount(Number(featuredPost.commentCount || 0), isHindi ? 'कमेंट' : 'comment', !isHindi)}</span>
                    <span>{formatCount(Number(featuredPost.viewsCount || 0), isHindi ? 'व्यू' : 'view', !isHindi)}</span>
                  </div>
                </article>
              </Link>
            ) : (
              <p className="muted">{isHindi ? 'अभी कोई पोस्ट उपलब्ध नहीं है। पहला पोस्ट बनाकर फ़ीड शुरू करें।' : 'No posts are available yet. Publish the first one to start the feed.'}</p>
            )}
          </div>
        </Card>

        <div className="dashboard-right-rail">
          <Card className="subs-card dashboard-panel dashboard-profile-panel dashboard-summary-rail-card">
          <div className="dashboard-panel-header">
            <div>
              <h3>{isHindi ? 'सारांश' : 'Summary'}</h3>
              <p className="muted">{isHindi ? 'दाहिनी ओर एक कॉम्पैक्ट स्नैपशॉट।' : 'A compact snapshot on the right side.'}</p>
            </div>
          </div>

          <div className="dashboard-summary-list dashboard-summary-metric-list dashboard-summary-compact-list">
            {visibleSummaryRows.map((row) => (
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

        </div>
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
