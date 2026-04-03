import React, { useEffect, useState } from 'react'
import Input from './ui/Input'
import Button from './ui/Button'
import FoodSearch from './FoodSearch'
import { useLanguage } from '../contexts/LanguageContext'

const WATER_OPTIONS = ['', '<1L', '1-2L', '2-3L', '3L+']
const MEAL_OPTIONS = ['breakfast', 'lunch', 'dinner', 'snacks']

const formatLogDate = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function DailyLogEditor({
  date,
  log,
  loading,
  meals = [],
  vitals = { waterIntake: '', sleepHours: '', steps: '' },
  mealType = 'breakfast',
  onMealTypeChange,
  onAddFood,
  onVitalsChange,
  onSave,
}){
  const { language } = useLanguage()
  const isHindi = language === 'hi'
  const [status, setStatus] = useState('')
  const [saving, setSaving] = useState(false)
  const [pendingFood, setPendingFood] = useState(null)
  const [pendingQuantity, setPendingQuantity] = useState('1')

  useEffect(() => {
    setStatus('')
    setPendingFood(null)
    setPendingQuantity('1')
  }, [log, vitals])

  const handleSelectFood = (food) => {
    setPendingFood(food)
    setPendingQuantity('1')
    setStatus('')
  }

  const handleAddFood = () => {
    if (!pendingFood) return
    const quantity = Math.max(0.1, Number(pendingQuantity) || 1)
    if (onAddFood) onAddFood(pendingFood, mealType, quantity)
    setStatus(isHindi ? `${pendingFood.name} को ${mealType} में जोड़ा गया।` : `${pendingFood.name} added to ${mealType}.`)
    setPendingFood(null)
    setPendingQuantity('1')
  }

  const save = async () => {
    if (!onSave) return

    const payload = {
      date: formatLogDate(date),
      waterIntake: vitals.waterIntake || undefined,
      sleepHours: vitals.sleepHours === '' ? undefined : Number(vitals.sleepHours),
      steps: vitals.steps === '' ? undefined : Number(vitals.steps),
      meals: meals.map((meal) => ({
        type: meal.type,
        items: meal.items.map((item) => ({
          foodId: item.foodId,
          foodName: item.foodName,
          quantity: Number(item.quantity) || 1,
        })),
      })),
    }

    try {
      setSaving(true)
      setStatus('')
      await onSave(payload)
      setStatus(isHindi ? 'डेली लॉग सहेजा गया।' : 'Daily log saved.')
    } catch (err) {
      setStatus(err?.payload?.message || err?.message || (isHindi ? 'डेली लॉग सहेजा नहीं जा सका।' : 'Unable to save daily log.'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="muted">{isHindi ? 'लोड हो रहा है...' : 'Loading...'}</div>

  return (
    <div className="daily-editor">
      <div className="vitals">
        <div className="field">
          <select
            value={vitals.waterIntake}
            onChange={(e) => onVitalsChange && onVitalsChange({ ...vitals, waterIntake: e.target.value })}
            aria-label={isHindi ? 'पानी का सेवन' : 'Water intake'}
          >
            <option value="">{isHindi ? 'पानी' : 'Water'}</option>
            {WATER_OPTIONS.filter(Boolean).map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <div className="field-hint">{isHindi ? 'दिनभर का सबसे नज़दीकी रेंज चुनें।' : 'Choose the closest daily range.'}</div>
        </div>
        <Input label={isHindi ? 'नींद (घंटे)' : 'Sleep (hours)'} value={vitals.sleepHours} onChange={e => onVitalsChange && onVitalsChange({ ...vitals, sleepHours: e.target.value })} type="number" min="0" max="24" />
        <Input label={isHindi ? 'कदम' : 'Steps'} value={vitals.steps} onChange={e => onVitalsChange && onVitalsChange({ ...vitals, steps: e.target.value })} type="number" min="0" />
      </div>

      <div className="meals">
        <h4>{isHindi ? 'भोजन' : 'Meals'}</h4>
        <div className="feature-chip-row">
          {MEAL_OPTIONS.map((type) => (
            <button
              key={type}
              type="button"
              className={`feature-chip ${mealType === type ? 'active' : ''}`}
              onClick={() => onMealTypeChange && onMealTypeChange(type)}
            >
                {type === 'breakfast' ? (isHindi ? 'नाश्ता' : 'Breakfast') : type === 'lunch' ? (isHindi ? 'दोपहर का भोजन' : 'Lunch') : type === 'dinner' ? (isHindi ? 'रात का भोजन' : 'Dinner') : (isHindi ? 'स्नैक्स' : 'Snacks')}
            </button>
          ))}
        </div>

          <FoodSearch onSelect={handleSelectFood} placeholder={isHindi ? `${mealType === 'breakfast' ? 'नाश्ता' : mealType === 'lunch' ? 'दोपहर का भोजन' : mealType === 'dinner' ? 'रात का भोजन' : 'स्नैक्स'} के लिए खाद्य पदार्थ खोजें...` : `Search foods for ${mealType}...`} />

        {pendingFood ? (
          <div className="meal-add-card">
            <div className="meal-add-copy">
              <strong>{pendingFood.name}</strong>
              <span>
                {pendingFood.caloriesPerUnit} kcal • {pendingFood.proteinPerUnit || 0} {isHindi ? 'ग्राम प्रोटीन' : 'g protein'} • {isHindi ? 'प्रति 100mg' : 'per 100mg'}
              </span>
            </div>
            <div className="meal-add-controls">
              <input
                className="meal-qty-input"
                type="number"
                min="0.1"
                step="0.1"
                value={pendingQuantity}
                onChange={(e) => setPendingQuantity(e.target.value)}
                aria-label={isHindi ? `${pendingFood.name} की मात्रा` : `Quantity for ${pendingFood.name}`}
              />
              <button
                type="button"
                className="meal-add-btn"
                onClick={handleAddFood}
              >
                {isHindi ? 'जोड़ें' : 'Add'}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {status ? <div className="feature-inline-note">{status}</div> : null}

      <div className="actions" style={{ marginTop: 12 }}>
        <Button variant="primary" onClick={save} disabled={saving}>
          {saving ? (isHindi ? 'सहेजा जा रहा है...' : 'Saving...') : (isHindi ? 'सहेजें' : 'Save')}
        </Button>
      </div>
    </div>
  )
}
