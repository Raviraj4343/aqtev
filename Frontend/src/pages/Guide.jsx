import React, { useEffect, useMemo, useState } from 'react'
import Card from '../components/ui/Card'
import { useAuth } from '../contexts/AuthContext'
import * as api from '../utils/api'
import { useLanguage } from '../contexts/LanguageContext'

const prettify = (value = '') =>
  String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())

const getBmiMeta = (weightKg, heightCm, isHindi) => {
  if (!weightKg || !heightCm) return { value: null, category: isHindi ? 'अपूर्ण प्रोफ़ाइल' : 'Incomplete profile' }
  const bmi = weightKg / Math.pow(heightCm / 100, 2)
  const rounded = Number(bmi.toFixed(1))

  if (rounded < 18.5) return { value: rounded, category: isHindi ? 'कम वज़न' : 'Underweight' }
  if (rounded < 25) return { value: rounded, category: isHindi ? 'स्वस्थ श्रेणी' : 'Healthy range' }
  if (rounded < 30) return { value: rounded, category: isHindi ? 'अधिक वज़न' : 'Overweight' }
  return { value: rounded, category: isHindi ? 'मोटापा श्रेणी' : 'Obesity range' }
}

const getCalorieTarget = ({ age, gender, weightKg, heightCm, activityLevel, goal }) => {
  if (!age || !weightKg || !heightCm) return null

  let bmr
  if (gender === 'male') bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5
  else bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161

  const multiplier = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725
  }[activityLevel] || 1.2

  let target = bmr * multiplier
  if (goal === 'weight_loss') target -= 300
  if (goal === 'muscle_gain') target += 300

  return Math.round(target)
}

const getProteinTarget = (weightKg, goal) => {
  if (!weightKg) return null
  const factor = goal === 'muscle_gain' ? 1.5 : goal === 'weight_loss' ? 1.2 : 0.8
  return Math.round(weightKg * factor)
}

const getHydrationTarget = (weightKg, activityLevel) => {
  if (!weightKg) return 2200
  const base = weightKg * 35
  const activityBoost = activityLevel === 'active' ? 500 : activityLevel === 'moderate' ? 250 : 0
  return Math.round(base + activityBoost)
}

const waterToMl = (value) => {
  const map = { '<1L': 800, '1-2L': 1500, '2-3L': 2500, '3L+': 3200 }
  return map[value] || 0
}

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

const polarToCartesian = (cx, cy, radius, angle) => ({
  x: cx + radius * Math.cos(angle),
  y: cy + radius * Math.sin(angle)
})

const buildDietTags = (dailyDiet, meals) => {
  const mealNames = (meals || []).flatMap((meal) => (meal.items || []).map((item) => item.foodName))
  const combined = `${dailyDiet || ''} ${mealNames.join(' ')}`.toLowerCase()

  return {
    hasFruitVeg: /(fruit|vegetable|salad|greens|spinach|broccoli|apple|banana|orange|berries|carrot|tomato|cucumber)/.test(combined),
    hasProteinDense: /(egg|chicken|fish|paneer|tofu|dal|lentil|yogurt|curd|milk|soy|protein|beans)/.test(combined),
    hasWholeFoods: /(oats|brown rice|millet|roti|whole|dal|beans|fruit|vegetable|nuts|seeds)/.test(combined),
    hasProcessedFoods: /(fried|pizza|burger|chips|soda|cola|dessert|pastry|instant|noodle|sweet|bakery)/.test(combined)
  }
}

const getNutrientKey = (label = '') => {
  const text = String(label).toLowerCase()
  if (text.includes('protein')) return 'protein'
  if (text.includes('energy') || text.includes('calorie')) return 'energy'
  if (text.includes('fiber')) return 'fiber'
  return null
}

export default function Guide() {
  const { user } = useAuth() || {}
  const { language } = useLanguage()
  const isHindi = language === 'hi'
  const [todayLog, setTodayLog] = useState(null)
  const [realtimePlan, setRealtimePlan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeRadarIndex, setActiveRadarIndex] = useState(0)
  const [boostFoodsByNutrient, setBoostFoodsByNutrient] = useState({})
  const [foodGuideLoading, setFoodGuideLoading] = useState(false)
  const [foodGuideError, setFoodGuideError] = useState('')
  const [activeFoodGuide, setActiveFoodGuide] = useState(null)

  const resolvedGoal = ['weight_loss', 'muscle_gain', 'maintain'].includes(user?.goal)
    ? user.goal
    : 'maintain'

  useEffect(() => {
    let mounted = true

    api.getTodayLog()
      .then((res) => {
        if (!mounted) return
        setTodayLog(res?.data || null)
      })
      .catch(() => {
        if (mounted) setTodayLog(null)
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => { mounted = false }
  }, [])

  useEffect(() => {
    if (loading) return undefined

    let cancelled = false
    const timer = setTimeout(async () => {
      const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
      const requestPlan = () => api.getGuideActionPlan({ goal: resolvedGoal })

      try {
        let res = await requestPlan()
        let plan = res?.data?.plan || null

        if (!plan || !Array.isArray(plan?.actionPlan) || !plan.actionPlan.length) {
          await wait(800)
          res = await requestPlan()
          plan = res?.data?.plan || null
        }

        if (cancelled) return
        setRealtimePlan(plan && typeof plan === 'object' ? plan : null)
      } catch {
        if (!cancelled) setRealtimePlan(null)
      }
    }, 500)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [loading, resolvedGoal])

  useEffect(() => {
    if (!activeFoodGuide) return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setActiveFoodGuide(null)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeFoodGuide])

  useEffect(() => {
    if (!activeFoodGuide?.nutrientKey) return
    if (boostFoodsByNutrient[activeFoodGuide.nutrientKey]) return

    let cancelled = false

    async function loadBoostFoods() {
      setFoodGuideLoading(true)
      setFoodGuideError('')

      try {
        const diet = user?.dietPreference === 'veg' ? 'veg' : undefined
        const res = await api.getBoostFoods({
          nutrient: activeFoodGuide.nutrientKey,
          diet,
          limit: 6
        })

        if (cancelled) return
        const list = Array.isArray(res?.data) ? res.data : []
        setBoostFoodsByNutrient((prev) => ({
          ...prev,
          [activeFoodGuide.nutrientKey]: list
        }))
      } catch {
        if (cancelled) return
        setFoodGuideError(isHindi ? 'अभी फूड सुझाव लोड नहीं हो सके।' : 'Unable to load food suggestions right now.')
      } finally {
        if (!cancelled) setFoodGuideLoading(false)
      }
    }

    loadBoostFoods()
    return () => { cancelled = true }
  }, [activeFoodGuide?.nutrientKey, boostFoodsByNutrient, isHindi, user?.dietPreference])

  const report = useMemo(() => {
    const profile = {
      age: user?.age,
      gender: user?.gender,
      heightCm: user?.heightCm,
      weightKg: user?.weightKg,
      activityLevel: user?.activityLevel,
      goal: resolvedGoal,
      dietPreference: user?.dietPreference
    }

    const bmi = getBmiMeta(profile.weightKg, profile.heightCm, isHindi)
    const calorieTarget = getCalorieTarget(profile)
    const proteinTarget = getProteinTarget(profile.weightKg, profile.goal)
    const hydrationTarget = getHydrationTarget(profile.weightKg, profile.activityLevel)

    const actualCalories = todayLog?.totalCalories ?? 0
    const actualProtein = todayLog?.totalProtein ?? 0
    const steps = todayLog?.steps ?? null
    const sleepHours = todayLog?.sleepHours ?? null
    const waterMl = waterToMl(todayLog?.waterIntake)
    const calorieGap = calorieTarget ? Math.max(0, calorieTarget - actualCalories) : 0
    const proteinGap = proteinTarget ? Math.max(0, proteinTarget - actualProtein) : 0
    const hydrationGap = Math.max(0, hydrationTarget - waterMl)
    const sleepGap = sleepHours === null ? 8 : Math.max(0, 8 - sleepHours)
    const stepsGap = steps === null ? 8000 : Math.max(0, 8000 - steps)
    const dietSignals = buildDietTags('', todayLog?.meals || [])

    const nutrientGaps = [
      {
        label: 'Protein',
        current: `${Math.round(actualProtein)} g`,
        target: proteinTarget ? `${proteinTarget} g` : 'Set profile',
        severity: clamp(proteinTarget ? Math.round((proteinGap / proteinTarget) * 100) : 0, 0, 100),
        note: proteinGap > 0 ? `${Math.round(proteinGap)} g short of your target.` : 'Target reached for today.'
      },
      {
        label: 'Energy',
        current: `${Math.round(actualCalories)} kcal`,
        target: calorieTarget ? `${calorieTarget} kcal` : 'Set profile',
        severity: clamp(calorieTarget ? Math.round((calorieGap / calorieTarget) * 100) : 0, 0, 100),
        note: calorieGap > 0 ? `${Math.round(calorieGap)} kcal still needed for your plan.` : 'Intake is in a strong range.'
      },
      {
        label: 'Hydration',
        current: waterMl ? `${Math.round(waterMl / 1000 * 10) / 10} L` : 'Not logged',
        target: `${Math.round(hydrationTarget / 100) / 10} L`,
        severity: clamp(Math.round((hydrationGap / hydrationTarget) * 100), 0, 100),
        note: hydrationGap > 0 ? 'Hydration looks light for your body size and activity.' : 'Hydration is on track.'
      }
    ]

    if (!dietSignals.hasFruitVeg) {
      nutrientGaps.push({
        label: 'Fiber and micros',
        current: 'Low',
        target: '4+ servings',
        severity: 76,
        note: 'Add fruit, vegetables, legumes, and whole grains to improve fiber, potassium, and folate coverage.'
      })
    } else if (profile.dietPreference === 'veg') {
      nutrientGaps.push({
        label: 'B12 and iron',
        current: dietSignals.hasProteinDense ? 'Some support' : 'Watch closely',
        target: 'Regular sources',
        severity: dietSignals.hasProteinDense ? 42 : 72,
        note: 'Vegetarian eating usually needs more deliberate B12, iron, and high-quality protein planning.'
      })
    }

    // Match backend computeHealthReport scoring exactly:
    // BMI 25 + Nutrition 30 + Activity 20 + Sleep 15 + Hydration 10 = 100.
    const bmiValue = Number(bmi.value || 0)
    let bmiScore = 0
    if (bmiValue >= 20 && bmiValue <= 24.9) bmiScore = 25
    else if (bmiValue < 18.5) bmiScore = clamp((bmiValue / 18.5) * 25, 0, 24)
    else bmiScore = clamp((1 - (bmiValue - 24.9) / 10) * 25, 0, 25)

    const calorieDiffPct = calorieTarget > 0 ? (actualCalories - calorieTarget) / calorieTarget : 0
    let calorieScore = 0
    if (Math.abs(calorieDiffPct) <= 0.1) calorieScore = 15
    else if (calorieDiffPct < -0.3 || calorieDiffPct > 0.3) calorieScore = 5
    else calorieScore = clamp(15 - Math.abs(calorieDiffPct) * 50, 5, 15)

    let proteinScore = 0
    if (!proteinTarget || proteinTarget <= 0) proteinScore = 7.5
    else if (proteinGap <= 0) proteinScore = 15
    else proteinScore = clamp(15 * Math.max(0, 1 - proteinGap / proteinTarget), 0, 15)

    const nutritionScore = calorieScore + proteinScore

    const activityLevelMultiplier = {
      sedentary: 0.6,
      light: 0.8,
      moderate: 1.0,
      active: 1.1
    }[profile.activityLevel] || 0.6

    let stepsScore = 0
    if (steps === null || steps === undefined) stepsScore = 6
    else if (steps < 3000) stepsScore = 2
    else if (steps < 7000) stepsScore = 8
    else stepsScore = 15

    const activityScore = clamp(stepsScore * activityLevelMultiplier, 0, 20)

    let sleepScore = 0
    if (sleepHours === null || sleepHours === undefined) sleepScore = 7
    else if (sleepHours < 5) sleepScore = 2
    else if (sleepHours < 7) sleepScore = 9
    else if (sleepHours <= 9) sleepScore = 15
    else sleepScore = 10

    const hydrationScoreMap = { '<1L': 2, '1-2L': 6, '2-3L': 8, '3L+': 10 }
    const hydrationScore = hydrationScoreMap[todayLog?.waterIntake] ?? 6

    const baseScore = Math.round(
      bmiScore + nutritionScore + activityScore + sleepScore + hydrationScore
    )

    return {
      bmi,
      calorieTarget,
      proteinTarget,
      hydrationTarget,
      actualCalories,
      actualProtein,
      sleepHours,
      steps,
      waterLabel: todayLog?.waterIntake || (isHindi ? 'लॉग नहीं हुआ' : 'Not logged'),
      nutrientGaps,
      score: clamp(baseScore, 0, 100)
    }
  }, [isHindi, resolvedGoal, todayLog, user])

  const summaryCards = [
    {
      label: 'BMI',
      value: report.bmi.value ?? '-',
      note: report.bmi.category
    },
    {
      label: 'Calorie need',
      value: report.calorieTarget ?? '-',
      note: isHindi ? 'अनुमानित दैनिक लक्ष्य' : 'Estimated daily target'
    },
    {
      label: isHindi ? 'प्रोटीन लक्ष्य' : 'Protein target',
      value: report.proteinTarget ?? '-',
      note: isHindi ? 'दैनिक रिकवरी लक्ष्य' : 'Daily recovery goal'
    },
    {
      label: isHindi ? 'गाइड स्कोर' : 'Guide score',
      value: report.score,
      note: isHindi ? 'तैयारी का स्नैपशॉट' : 'Readiness snapshot'
    }
  ]

  const focusLine = [
    user?.activityLevel ? prettify(user.activityLevel) : (isHindi ? 'गतिविधि अनुपलब्ध' : 'Activity missing'),
    user?.dietPreference ? prettify(user.dietPreference) : (isHindi ? 'डाइट अनुपलब्ध' : 'Diet missing'),
    user?.weightKg ? `${user.weightKg} kg` : (isHindi ? 'वज़न अनुपलब्ध' : 'Weight missing')
  ].join(' • ')

  const radarItems = report.nutrientGaps.map((gap, index) => ({
    ...gap,
    index,
    aligned: Math.max(8, 100 - gap.severity),
    shortLabel: gap.label === 'Fiber and micros' ? (isHindi ? 'फाइबर' : 'Fiber') : gap.label
  }))

  const radarCenter = 140
  const radarRadius = 82
  const radarLevels = [0.2, 0.4, 0.6, 0.8, 1]
  const radarPoints = radarItems.map((item, index) => {
    const angle = (-Math.PI / 2) + (index / Math.max(radarItems.length, 1)) * Math.PI * 2
    const plot = polarToCartesian(radarCenter, radarCenter, radarRadius * (item.aligned / 100), angle)
    const labelPosition = polarToCartesian(radarCenter, radarCenter, radarRadius + 18, angle)
    const axis = polarToCartesian(radarCenter, radarCenter, radarRadius, angle)

    return {
      ...item,
      index,
      plot,
      labelPosition,
      axis
    }
  })

  const radarPolygon = radarPoints.map((point) => `${point.plot.x},${point.plot.y}`).join(' ')
  const activeRadarPoint = radarPoints[activeRadarIndex] || radarPoints[0] || null
  const aiActionPlan = Array.isArray(realtimePlan?.actionPlan) ? realtimePlan.actionPlan : []
  const visibleRecommendations = aiActionPlan.map((text, index) => {
    if (text && typeof text === 'object') {
      return {
        title: text.title || (isHindi ? `एक्शन ${index + 1}` : `Action ${index + 1}`),
        body: text.body || ''
      }
    }
    return { title: isHindi ? `एक्शन ${index + 1}` : `Action ${index + 1}`, body: String(text || '') }
  })

  const aiRiskFlags = Array.isArray(realtimePlan?.riskFlags) ? realtimePlan.riskFlags : []
  const aiNutritionFocus = Array.isArray(realtimePlan?.nutritionFocus) ? realtimePlan.nutritionFocus : []
  const aiTrainingFocus = Array.isArray(realtimePlan?.trainingFocus) ? realtimePlan.trainingFocus : []
  const aiRecoveryFocus = Array.isArray(realtimePlan?.recoveryFocus) ? realtimePlan.recoveryFocus : []
  const suggestedFoods = activeFoodGuide?.nutrientKey
    ? (boostFoodsByNutrient[activeFoodGuide.nutrientKey] || [])
    : []

  const openFoodGuide = (gap) => {
    const nutrientKey = getNutrientKey(gap?.label)
    if (!nutrientKey) return
    setActiveFoodGuide({ label: gap.label, nutrientKey })
  }

  return (
    <div className="page feature-page guide-page">
      <section className="guide-hero card">
        <div className="guide-hero-copy">
          <span className="feature-eyebrow">{isHindi ? 'गाइड' : 'Guide'}</span>
          <h1>{isHindi ? 'आपका व्यक्तिगत स्वास्थ्य गाइड' : 'Your personalized health guide'}</h1>
          <p className="muted">
            {isHindi ? 'प्रोफ़ाइल संकेत, आज की डाइट, गतिविधि और स्वास्थ्य संदर्भ का व्यावहारिक विश्लेषण।' : 'Analyze profile signals, today\'s diet, activity, and medical context in one elegant view with practical next steps.'}
          </p>

          <div className="guide-hero-badges">
            <span className="dashboard-badge">{user?.goal ? prettify(resolvedGoal) : (isHindi ? 'प्रोफ़ाइल में लक्ष्य सेट करें' : 'Set your goal in profile')}</span>
            <span className="dashboard-badge">{loading ? (isHindi ? 'आज का लॉग लोड हो रहा है' : 'Loading today’s log') : (isHindi ? 'आपके वास्तविक डेटा से तैयार' : 'Built from your real app data')}</span>
          </div>
          <div className="guide-hero-meta">{focusLine}</div>
        </div>

        <div className="guide-hero-visual">
          <div className="guide-score-orbit" aria-hidden="true">
            <div className="guide-score-core">
              <span>{isHindi ? 'गाइड स्कोर' : 'Guide score'}</span>
              <strong>{report.score}</strong>
              <small>{isHindi ? '100 में से' : 'out of 100'}</small>
            </div>
          </div>
          <div className="guide-score-caption">
            <strong>{report.bmi.category}</strong>
            <span>{isHindi ? 'BMI, कैलोरी आवश्यकता और रिकवरी संकेतों का त्वरित स्नैपशॉट।' : 'BMI, calorie needs, intake quality, and recovery signals rolled into one quick snapshot.'}</span>
          </div>
        </div>
      </section>

      <section className="feature-summary-grid">
        {summaryCards.map((card) => (
          <Card key={card.label} className="feature-stat-card">
            <span className="feature-stat-label">{card.label}</span>
            <strong className="feature-stat-value">{card.value}</strong>
            <span className="feature-stat-note">{card.note}</span>
          </Card>
        ))}
      </section>

      <section className="guide-report-grid">
        <Card className="guide-report-panel">
          <div className="feature-panel-head">
            <div>
              <h3>Today&apos;s priorities</h3>
              <p className="muted">{isHindi ? 'आज आपकी पोषण प्राथमिकताएँ कितनी संतुलित हैं, इसका त्वरित स्पाइडर दृश्य।' : 'A quick spider view of how aligned your key nutrition priorities are today.'}</p>
            </div>
          </div>

          <div className="guide-radar-shell">
            <div className="guide-radar-card">
              {activeRadarPoint ? (
                <div className="guide-radar-tooltip">
                  <strong>{activeRadarPoint.label}</strong>
                  <span>{activeRadarPoint.current} / {activeRadarPoint.target}</span>
                </div>
              ) : null}
              <svg
                viewBox="0 0 280 280"
                className="guide-radar-chart"
                role="img"
                aria-label={isHindi ? 'मुख्य पोषण प्राथमिकताओं का संरेखण दिखाने वाला स्पाइडर चार्ट' : 'Spider chart showing alignment across your key nutrition priorities'}
              >
                {radarLevels.map((level) => {
                  const ringPoints = radarItems.map((_, index) => {
                    const angle = (-Math.PI / 2) + (index / Math.max(radarItems.length, 1)) * Math.PI * 2
                    const point = polarToCartesian(radarCenter, radarCenter, radarRadius * level, angle)
                    return `${point.x},${point.y}`
                  }).join(' ')

                  return <polygon key={level} points={ringPoints} className="guide-radar-ring" />
                })}

                {radarPoints.map((point) => (
                  <line
                    key={point.label}
                    x1={radarCenter}
                    y1={radarCenter}
                    x2={point.axis.x}
                    y2={point.axis.y}
                    className="guide-radar-axis"
                  />
                ))}

                <polygon points={radarPolygon} className="guide-radar-area" />

                {radarPoints.map((point) => (
                  <circle
                    key={`${point.label}-dot`}
                    cx={point.plot.x}
                    cy={point.plot.y}
                    r={activeRadarIndex === point.index ? '7' : '5'}
                    className={`guide-radar-dot ${activeRadarIndex === point.index ? 'active' : ''}`}
                    onMouseEnter={() => setActiveRadarIndex(point.index)}
                  />
                ))}

                {radarPoints.map((point) => (
                  <circle
                    key={`${point.label}-hover`}
                    cx={point.plot.x}
                    cy={point.plot.y}
                    r="16"
                    className="guide-radar-hit"
                    onMouseEnter={() => setActiveRadarIndex(point.index)}
                    onFocus={() => setActiveRadarIndex(point.index)}
                    tabIndex="0"
                    role="button"
                    aria-label={isHindi ? `${point.label}: ${point.current} में से ${point.target}, ${point.aligned}% संरेखित` : `${point.label}: ${point.current} out of ${point.target}, ${point.aligned}% aligned`}
                  />
                ))}

                {radarPoints.map((point) => (
                  <text
                    key={`${point.label}-text`}
                    x={point.labelPosition.x}
                    y={point.labelPosition.y}
                    textAnchor="middle"
                    className={`guide-radar-label ${activeRadarIndex === point.index ? 'active' : ''}`}
                    onMouseEnter={() => setActiveRadarIndex(point.index)}
                  >
                    {point.shortLabel}
                  </text>
                ))}
              </svg>
            </div>

            <div className="guide-radar-legend">
              {radarItems.map((item) => (
                <div
                  key={item.label}
                  className={`guide-radar-legend-item ${activeRadarIndex === item.index ? 'active' : ''} ${getNutrientKey(item.label) ? 'actionable' : ''}`}
                  role={getNutrientKey(item.label) ? 'button' : undefined}
                  aria-label={getNutrientKey(item.label) ? (isHindi ? `${item.label} बढ़ाने के लिए फूड सुझाव देखें` : `View food ideas to boost ${item.label}`) : undefined}
                  onMouseEnter={() => setActiveRadarIndex(item.index)}
                  onFocus={() => setActiveRadarIndex(item.index)}
                  onClick={() => openFoodGuide(item)}
                  onKeyDown={(event) => {
                    if (!getNutrientKey(item.label)) return
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      openFoodGuide(item)
                    }
                  }}
                  tabIndex="0"
                >
                  <div className="guide-radar-legend-top">
                    <strong>{item.label}</strong>
                    <div className="guide-radar-legend-meta">
                      <span>{item.current} / {item.target}</span>
                      <div className="guide-gap-severity">{item.aligned}%</div>
                    </div>
                  </div>
                  {getNutrientKey(item.label) ? <small>{isHindi ? 'फूड बूस्टर देखने के लिए टैप करें' : 'Tap to view food boosters'}</small> : null}
                  <div className="guide-radar-legend-track" aria-hidden="true">
                    <span style={{ width: `${item.aligned}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </Card>

        <Card className="guide-report-panel">
          <div className="feature-panel-head">
            <div>
              <h3>Action plan</h3>
              <p className="muted">{isHindi ? 'आपके वर्तमान लक्ष्य के लिए छोटे और व्यावहारिक अगले कदम।' : 'Short, practical next steps for your current goal.'}</p>
            </div>
          </div>

          <div className="guide-recommendations guide-recommendations-stack">
            {visibleRecommendations.map((item, idx) => (
              <div key={`${item.title}-${idx}`} className="guide-recommendation-card">
                <span>{item.title || `Action ${idx + 1}`}</span>
                <strong>{item.body}</strong>
              </div>
            ))}
          </div>

          {aiRiskFlags.length ? (
            <div className="guide-recommendations guide-recommendations-stack" style={{ marginTop: 14 }}>
              {aiRiskFlags.map((item, idx) => (
                <div key={`risk-${idx}`} className="guide-recommendation-card">
                  <span>{isHindi ? 'जोखिम संकेत' : 'Risk flag'}</span>
                  <strong>{item}</strong>
                </div>
              ))}
            </div>
          ) : null}

          {aiNutritionFocus.length || aiTrainingFocus.length || aiRecoveryFocus.length ? (
            <div className="guide-kpi-stack" style={{ marginTop: 14 }}>
              {aiNutritionFocus.length ? (
                <div className="guide-kpi-card">
                  <span>{isHindi ? 'पोषण फोकस' : 'Nutrition focus'}</span>
                  <strong>{aiNutritionFocus[0]}</strong>
                </div>
              ) : null}
              {aiTrainingFocus.length ? (
                <div className="guide-kpi-card">
                  <span>{isHindi ? 'ट्रेनिंग फोकस' : 'Training focus'}</span>
                  <strong>{aiTrainingFocus[0]}</strong>
                </div>
              ) : null}
              {aiRecoveryFocus.length ? (
                <div className="guide-kpi-card">
                  <span>{isHindi ? 'रिकवरी फोकस' : 'Recovery focus'}</span>
                  <strong>{aiRecoveryFocus[0]}</strong>
                </div>
              ) : null}
            </div>
          ) : null}
        </Card>
      </section>

      {activeFoodGuide ? (
        <div className="dashboard-modal-backdrop" onClick={() => setActiveFoodGuide(null)} aria-hidden="true">
          <div
            className="dashboard-modal guide-food-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="guide-food-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="dashboard-modal-close"
              aria-label={isHindi ? 'फूड सुझाव बंद करें' : 'Close food suggestions'}
              onClick={() => setActiveFoodGuide(null)}
            >
              ×
            </button>

            <div className="dashboard-modal-head">
              <span className="dashboard-eyebrow">{isHindi ? 'न्यूट्रिशन बूस्ट' : 'Nutrition Boost'}</span>
              <h3 id="guide-food-modal-title">{isHindi ? `${activeFoodGuide.label} बढ़ाने वाले खाद्य पदार्थ` : `Foods to boost ${activeFoodGuide.label}`}</h3>
              <p className="muted">
                {isHindi ? 'सुझाव आपकी फूड लाइब्रेरी से आते हैं और इस पोषक तत्व के लिए रैंक किए गए हैं।' : 'Suggestions come from your app food library and are ranked for this nutrient.'}
              </p>
            </div>

            <div className="dashboard-modal-body">
              <div className="dashboard-modal-highlight">
                <span>{isHindi ? 'डाइट पसंद' : 'Diet preference'}</span>
                <strong>{prettify(user?.dietPreference || 'mixed')}</strong>
              </div>

              {foodGuideLoading ? <p className="muted">{isHindi ? 'फूड सुझाव लोड हो रहे हैं...' : 'Loading food suggestions...'}</p> : null}
              {foodGuideError ? <p className="muted">{foodGuideError}</p> : null}

              {!foodGuideLoading && !foodGuideError ? (
                <div className="guide-food-list">
                  {suggestedFoods.length ? suggestedFoods.map((food) => (
                    <div className="guide-food-item" key={`${activeFoodGuide.nutrientKey}-${food.name}`}>
                      <div>
                        <strong>{food.name}</strong>
                        <span>{food.nameHindi || (isHindi ? 'आपकी फूड लाइब्रेरी में लोकप्रिय' : 'Popular in your food library')}</span>
                      </div>
                      <div className="guide-food-metric">
                        <em>{food.highlight || '-'}</em>
                        <small>{food.category} · {food.dietType === 'non_veg' ? (isHindi ? 'मांसाहारी' : 'non-veg') : (isHindi ? 'शाकाहारी' : 'veg')}</small>
                      </div>
                    </div>
                  )) : <p className="muted">{isHindi ? 'इस पोषक तत्व के लिए अभी उपयुक्त सुझाव नहीं मिले।' : 'No strong matches found yet for this nutrient.'}</p>}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
