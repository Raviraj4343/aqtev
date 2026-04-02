import React, { useEffect, useMemo, useState } from 'react'
import Card from '../components/ui/Card'
import FoodSearch from '../components/FoodSearch'
import { useLanguage } from '../contexts/LanguageContext'
import * as api from '../utils/api'

const MEAL_OPTIONS = ['breakfast', 'lunch', 'dinner', 'snacks']

const makeEntryId = () => `guest-food-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const formatMeal = (value) => value.charAt(0).toUpperCase() + value.slice(1)

const collectVitaminSummary = (items) => {
  const counts = new Map()

  items.forEach((item) => {
    const vitamins = Array.isArray(item.vitamins) ? item.vitamins : []
    vitamins.forEach((vitamin) => {
      counts.set(vitamin, (counts.get(vitamin) || 0) + (item.quantity || 1))
    })
  })

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }))
}

export default function GuestNutritionCheck(){
  const { language } = useLanguage()
  const isHindi = language === 'hi'
  const [mealType, setMealType] = useState('breakfast')
  const [pendingFood, setPendingFood] = useState(null)
  const [pendingQuantity, setPendingQuantity] = useState('1')
  const [entries, setEntries] = useState([])
  const [showReport, setShowReport] = useState(false)
  const [foods, setFoods] = useState([])

  useEffect(() => {
    let mounted = true
    api.getAllFoods()
      .then((res) => {
        if (!mounted) return
        setFoods(Array.isArray(res?.data) ? res.data : [])
      })
      .catch(() => {
        if (!mounted) return
        setFoods([])
      })

    return () => {
      mounted = false
    }
  }, [])

  const handleSelectFood = (food) => {
    setPendingFood(food)
    setPendingQuantity('1')
  }

  const handleAddFood = () => {
    if (!pendingFood) return

    const quantity = Math.max(1, Number(pendingQuantity) || 1)

    setEntries((prev) => [
      ...prev,
      {
        id: makeEntryId(),
        mealType,
        name: pendingFood.name,
        nameHindi: pendingFood.nameHindi,
        quantity,
        unit: pendingFood.unit,
        caloriesPerUnit: Number(pendingFood.caloriesPerUnit) || 0,
        proteinPerUnit: Number(pendingFood.proteinPerUnit) || 0,
        carbsPerUnit: Number(pendingFood.carbsPerUnit) || 0,
        fatsPerUnit: Number(pendingFood.fatsPerUnit) || 0,
        fiberPerUnit: Number(pendingFood.fiberPerUnit) || 0,
        calciumPerUnit: Number(pendingFood.calciumPerUnit) || 0,
        vitamins: Array.isArray(pendingFood.vitamins) ? pendingFood.vitamins : [],
      },
    ])

    setPendingFood(null)
    setPendingQuantity('1')
    setShowReport(false)
  }

  const handleRemove = (id) => {
    setEntries((prev) => prev.filter((item) => item.id !== id))
    setShowReport(false)
  }

  const groupedEntries = useMemo(() => (
    MEAL_OPTIONS.map((type) => ({
      type,
      items: entries.filter((item) => item.mealType === type),
    })).filter((group) => group.items.length > 0)
  ), [entries])

  const totals = useMemo(() => {
    const base = entries.reduce((acc, item) => {
      acc.calories += item.caloriesPerUnit * item.quantity
      acc.protein += item.proteinPerUnit * item.quantity
      acc.carbs += item.carbsPerUnit * item.quantity
      acc.fats += item.fatsPerUnit * item.quantity
      acc.fiber += item.fiberPerUnit * item.quantity
      acc.calcium += item.calciumPerUnit * item.quantity
      return acc
    }, {
      calories: 0,
      protein: 0,
      carbs: 0,
      fats: 0,
      fiber: 0,
      calcium: 0,
    })

    return {
      calories: Math.round(base.calories),
      protein: Number(base.protein.toFixed(1)),
      carbs: Number(base.carbs.toFixed(1)),
      fats: Number(base.fats.toFixed(1)),
      fiber: Number(base.fiber.toFixed(1)),
      calcium: Number(base.calcium.toFixed(1)),
    }
  }, [entries])

  const vitaminSummary = useMemo(() => collectVitaminSummary(entries), [entries])

  const totalItems = entries.length
  const totalMeals = groupedEntries.length

  const handleAnalyze = () => {
    if (entries.length === 0) return
    setShowReport(true)
  }

  const mealLabel = (type) => {
    if (!isHindi) return formatMeal(type)
    if (type === 'breakfast') return 'नाश्ता'
    if (type === 'lunch') return 'दोपहर का भोजन'
    if (type === 'dinner') return 'रात का भोजन'
    return 'स्नैक्स'
  }

  return (
    <div className="page feature-page guest-check-page">
      <section className="guest-check-hero card">
        <div className="guest-check-copy">
          <span className="feature-eyebrow">{isHindi ? 'गेस्ट न्यूट्रिशन चेक' : 'Guest Nutrition Check'}</span>
          <h1>{isHindi ? 'अपने पूरे दिन का सेवन ट्रैक करें।' : 'Track your whole day intake.'}</h1>
          <p className="muted">
            {isHindi ? 'एक आसान फ्लो में भोजन जोड़ें। दिन पूरा होने पर Analyze क्लिक करके रिपोर्ट देखें।' : 'Add foods meal by meal in one simple flow. When your day is complete, click Analyze to open the final report in a popup.'}
          </p>
        </div>
        <div className="guest-check-orbit">
          <strong>{totalItems}</strong>
          <span>{isHindi ? 'आज जोड़े गए खाद्य पदार्थ' : 'foods added today'}</span>
        </div>
      </section>

      <section className="feature-layout feature-layout-wide">
        <Card className="feature-main-panel guest-check-main">
          <div className="feature-panel-head">
            <div>
              <h3>{isHindi ? 'जो आपने खाया वह जोड़ें' : 'Add what you ate'}</h3>
              <p className="muted">{isHindi ? 'मील चुनें, खाद्य पदार्थ खोजें, मात्रा चुनें और पूरे दिन का लॉग बनाएं।' : 'Pick a meal, search your foods, choose quantity, then build your full-day log.'}</p>
            </div>
          </div>

          <div className="feature-chip-row">
            {MEAL_OPTIONS.map((type) => (
              <button
                key={type}
                type="button"
                className={`feature-chip ${mealType === type ? 'active' : ''}`}
                onClick={() => setMealType(type)}
              >
                  {mealLabel(type)}
              </button>
            ))}
          </div>

            <FoodSearch foods={foods} onSelect={handleSelectFood} placeholder={isHindi ? `${mealLabel(mealType)} के लिए खाद्य पदार्थ खोजें...` : `Search foods for ${formatMeal(mealType)}...`} />

          {pendingFood ? (
            <div className="guest-pending-card">
              <div>
                <strong>{pendingFood.name}</strong>
                <span>
                  {pendingFood.caloriesPerUnit} kcal • {pendingFood.proteinPerUnit || 0} {isHindi ? 'ग्राम प्रोटीन' : 'g protein'} • {isHindi ? 'प्रति' : 'per'} {pendingFood.unit}
                </span>
              </div>
              <div className="guest-pending-actions">
                <input
                  type="number"
                  min="1"
                  value={pendingQuantity}
                  onChange={(e) => setPendingQuantity(e.target.value)}
                  className="meal-qty-input"
                  aria-label={isHindi ? `${pendingFood.name} की मात्रा` : `Quantity for ${pendingFood.name}`}
                />
                <button type="button" className="btn-primary guest-add-btn" onClick={handleAddFood}>{isHindi ? 'दिन में जोड़ें' : 'Add To Day'}</button>
              </div>
            </div>
          ) : null}

          <div className="guest-meal-stack">
            {groupedEntries.length > 0 ? groupedEntries.map((group) => (
              <div key={group.type} className="guest-meal-card">
                <div className="guest-meal-head">
                  <strong>{mealLabel(group.type)}</strong>
                  <span>{group.items.length} {isHindi ? 'आइटम' : `item${group.items.length === 1 ? '' : 's'}`}</span>
                </div>
                <div className="guest-meal-items">
                  {group.items.map((item) => (
                    <div key={item.id} className="guest-entry-row">
                      <div>
                        <strong>{item.name}</strong>
                        <span>
                          {isHindi ? 'मात्रा' : 'Qty'} {item.quantity} • {Math.round(item.caloriesPerUnit * item.quantity)} kcal • {Number((item.proteinPerUnit * item.quantity).toFixed(1))} {isHindi ? 'ग्राम प्रोटीन' : 'g protein'}
                        </span>
                      </div>
                      <button type="button" className="guest-remove-btn" onClick={() => handleRemove(item.id)}>{isHindi ? 'हटाएं' : 'Remove'}</button>
                    </div>
                  ))}
                </div>
              </div>
            )) : (
              <div className="feature-empty compact">
                <strong>{isHindi ? 'अभी कोई खाद्य पदार्थ नहीं जोड़ा गया' : 'No foods added yet'}</strong>
                <p className="muted">{isHindi ? 'नाश्ता, दोपहर का भोजन, रात का भोजन या स्नैक्स से शुरू करें।' : 'Start with breakfast, lunch, dinner, or snacks and build your day from the search above.'}</p>
              </div>
            )}
          </div>
        </Card>

        <Card className="feature-side-panel guest-check-side">
          <div className="feature-panel-head">
            <div>
              <h3>{isHindi ? 'विश्लेषण के लिए तैयार?' : 'Ready to analyze?'}</h3>
              <p className="muted">{isHindi ? 'Analyze क्लिक करने के बाद पूरे दिन का पोषण परिणाम दिखेगा।' : 'We will show the full-day nutrition result only after you click Analyze.'}</p>
            </div>
          </div>

          <div className="guest-preview-grid">
            <div className="guest-preview-card">
              <span>{isHindi ? 'लॉग किए गए मील' : 'Meals logged'}</span>
              <strong>{totalMeals}</strong>
            </div>
            <div className="guest-preview-card">
              <span>{isHindi ? 'फूड एंट्री' : 'Food entries'}</span>
              <strong>{totalItems}</strong>
            </div>
          </div>

          <div className="feature-empty compact">
            <strong>{isHindi ? 'आगे क्या होगा' : 'What happens next'}</strong>
            <p className="muted">{isHindi ? 'पॉपअप रिपोर्ट में कैलोरी, प्रोटीन, कार्ब्स, फैट्स, फाइबर, कैल्शियम और विटामिन दिखेंगे।' : 'The popup report will show calories, protein, carbs, fats, fiber, calcium, vitamin highlights, and meal-by-meal composition.'}</p>
          </div>
        </Card>
      </section>

      <div className="guest-action-bar">
        <div className="guest-action-bar-copy">
          <strong>{isHindi ? 'दिन का विश्लेषण करने के लिए तैयार?' : 'Ready to analyze your day?'}</strong>
          <span>{totalMeals} {isHindi ? 'मील लॉग' : `meal${totalMeals === 1 ? '' : 's'} logged`} • {totalItems} {isHindi ? 'फूड आइटम' : `food item${totalItems === 1 ? '' : 's'}`}</span>
        </div>
        <button
          type="button"
          className="btn-primary guest-submit-btn"
          disabled={entries.length === 0}
          onClick={handleAnalyze}
        >
          {isHindi ? 'विश्लेषण करें' : 'Analyze'}
        </button>
      </div>

      {showReport ? (
        <div className="confirm-modal-backdrop" onClick={() => setShowReport(false)}>
          <div
            className="confirm-modal guest-report-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="guest-report-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="confirm-modal-close"
              aria-label={isHindi ? 'पोषण रिपोर्ट बंद करें' : 'Close nutrition report'}
              onClick={() => setShowReport(false)}
            >
              ×
            </button>

            <div className="confirm-modal-head">
              <span className="confirm-modal-eyebrow">{isHindi ? 'पोषण रिपोर्ट' : 'Nutrition Report'}</span>
              <h3 id="guest-report-title">{isHindi ? 'आपकी दैनिक संरचना रिपोर्ट' : 'Your daily composition report'}</h3>
              <p className="muted">
                {isHindi ? 'जोड़े गए खाद्य पदार्थों के आधार पर पूरे दिन का पोषण विवरण यहाँ देखें।' : 'Here is the full-day nutrition breakdown from the foods you added, including totals and meal-by-meal composition.'}
              </p>
            </div>

            <div className="confirm-modal-body guest-report-body">
              <div className="guest-summary-grid">
                <div className="guest-summary-card">
                  <span>{isHindi ? 'कैलोरी' : 'Calories'}</span>
                  <strong>{totals.calories}</strong>
                  <small>kcal</small>
                </div>
                <div className="guest-summary-card">
                  <span>{isHindi ? 'प्रोटीन' : 'Protein'}</span>
                  <strong>{totals.protein}</strong>
                  <small>g</small>
                </div>
                <div className="guest-summary-card">
                  <span>{isHindi ? 'कार्ब्स' : 'Carbs'}</span>
                  <strong>{totals.carbs}</strong>
                  <small>g</small>
                </div>
                <div className="guest-summary-card">
                  <span>{isHindi ? 'फैट्स' : 'Fats'}</span>
                  <strong>{totals.fats}</strong>
                  <small>g</small>
                </div>
                <div className="guest-summary-card">
                  <span>{isHindi ? 'फाइबर' : 'Fiber'}</span>
                  <strong>{totals.fiber}</strong>
                  <small>g</small>
                </div>
                <div className="guest-summary-card">
                  <span>{isHindi ? 'कैल्शियम' : 'Calcium'}</span>
                  <strong>{totals.calcium}</strong>
                  <small>mg</small>
                </div>
              </div>

              <div className="guest-vitamin-list">
                <strong>{isHindi ? 'विटामिन हाइलाइट्स' : 'Vitamin highlights'}</strong>
                {vitaminSummary.length > 0 ? vitaminSummary.slice(0, 8).map((vitamin) => (
                  <div key={vitamin.name} className="guest-vitamin-row">
                    <span>{vitamin.name}</span>
                    <span>{vitamin.count} {isHindi ? 'सर्विंग संकेत' : 'serving signal'}</span>
                  </div>
                )) : (
                  <p className="muted">{isHindi ? 'इस दिन के खाद्य पदार्थों में विटामिन डेटा उपलब्ध नहीं है।' : 'No vitamin data was detected for the foods in this day.'}</p>
                )}
              </div>

              <div className="guest-meal-stack guest-report-stack">
                {groupedEntries.map((group) => (
                  <div key={group.type} className="guest-meal-card">
                    <div className="guest-meal-head">
                      <strong>{mealLabel(group.type)}</strong>
                      <span>{group.items.length} {isHindi ? 'आइटम' : `item${group.items.length === 1 ? '' : 's'}`}</span>
                    </div>
                    <div className="guest-meal-items">
                      {group.items.map((item) => (
                        <div key={item.id} className="guest-entry-row">
                          <div>
                            <strong>{item.name}</strong>
                            <span>
                              {isHindi ? 'मात्रा' : 'Qty'} {item.quantity} • {Math.round(item.caloriesPerUnit * item.quantity)} kcal • {Number((item.proteinPerUnit * item.quantity).toFixed(1))} {isHindi ? 'ग्राम प्रोटीन' : 'g protein'}
                            </span>
                          </div>
                          <div className="guest-entry-metrics">
                            <span>{Number((item.carbsPerUnit * item.quantity).toFixed(1))} {isHindi ? 'ग्राम कार्ब्स' : 'g carbs'}</span>
                            <span>{Number((item.fatsPerUnit * item.quantity).toFixed(1))} {isHindi ? 'ग्राम फैट्स' : 'g fats'}</span>
                            <span>{Number((item.fiberPerUnit * item.quantity).toFixed(1))} {isHindi ? 'ग्राम फाइबर' : 'g fiber'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      ) : null}
    </div>
  )
}
