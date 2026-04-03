import React, { useEffect, useState } from 'react'
import Card from '../components/ui/Card'
import FoodSearch from '../components/FoodSearch'
import * as api from '../utils/api'
import { useLanguage } from '../contexts/LanguageContext'

const formatCategory = (value) => String(value || 'General').replace(/_/g, ' ')
const formatDiet = (value) => String(value || 'Mixed').replace(/_/g, ' ')

export default function Foods(){
  const { language } = useLanguage()
  const isHindi = language === 'hi'
  const [selected, setSelected] = useState(null)
  const [categories, setCategories] = useState([])
  const [activeCategory, setActiveCategory] = useState('')
  const [foods, setFoods] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    api.getFoodCategories()
      .then((categoriesResponse) => {
        if (!mounted) return
        setCategories(categoriesResponse?.data || [])
      })
      .catch(() => {})
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    let mounted = true
    setLoading(true)

    const query = { limit: 80 }
    if (activeCategory) query.category = activeCategory

    api.getAllFoods(query)
      .then((foodsResponse) => {
        if (!mounted) return
        setFoods(Array.isArray(foodsResponse?.data) ? foodsResponse.data : [])
      })
      .catch(() => {
        if (!mounted) return
        setFoods([])
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => { mounted = false }
  }, [activeCategory])

  const vitamins = Array.isArray(selected?.vitamins) ? selected.vitamins.join(', ') : ''

  return (
    <div className="page feature-page feature-foods">
      <section className="feature-hero card">
        <div className="feature-hero-copy">
          <span className="feature-eyebrow">{isHindi ? 'फूड्स' : 'Foods'}</span>
          <h1>{isHindi ? 'पोषण डेटा खोजें और देखें' : 'Search and browse nutrition data'}</h1>
          <p className="muted">
            {isHindi ? 'कैटेगरी के अनुसार खाद्य पदार्थ देखें, जल्दी खोजें और कैलोरी सहित पूरी जानकारी देखें।' : 'Browse foods by category, search quickly, and review calories plus full composition details.'}
          </p>
        </div>
        <div className="feature-hero-aside">
          <span className="feature-date-chip">{loading ? (isHindi ? 'कैटलॉग लोड हो रहा है' : 'Loading catalog') : (isHindi ? `${foods.length} खाद्य पदार्थ उपलब्ध` : `${foods.length} foods available`)}</span>
          <div className="feature-orbit feature-orbit-blue">
            <strong>{loading ? '-' : categories.length}</strong>
            <span>{isHindi ? 'कैटेगरी' : 'categories'}</span>
          </div>
        </div>
      </section>

      <section className="feature-layout">
        <Card className="feature-main-panel">
          <div className="feature-panel-head">
            <div>
              <h3>{isHindi ? 'खाद्य पदार्थ खोजें' : 'Search foods'}</h3>
              <p className="muted">{isHindi ? 'नाम से खोजकर कैलोरी, मैक्रो, कैल्शियम और विटामिन देखें।' : 'Search by food name to preview calories, macros, calcium, and vitamins.'}</p>
            </div>
          </div>
          <FoodSearch onSelect={(food) => setSelected(food)} />

          {selected ? (
            <div className="food-detail-panel">
              <h3>{selected.name}</h3>
              {selected.nameHindi ? <p className="muted">{selected.nameHindi}</p> : null}
              <div className="food-detail-grid">
                <div className="feature-list-row">
                  <div><strong>{isHindi ? 'कैलोरी' : 'Calories'}</strong><span>{isHindi ? 'प्रति' : 'Per'} {selected.unit}</span></div>
                  <div className="feature-list-metric">{selected.caloriesPerUnit} kcal</div>
                </div>
                <div className="feature-list-row">
                  <div><strong>{isHindi ? 'प्रोटीन' : 'Protein'}</strong><span>{isHindi ? 'प्रति' : 'Per'} {selected.unit}</span></div>
                  <div className="feature-list-metric">{selected.proteinPerUnit} g</div>
                </div>
                <div className="feature-list-row">
                  <div><strong>{isHindi ? 'कार्ब्स' : 'Carbs'}</strong><span>{isHindi ? 'प्रति' : 'Per'} {selected.unit}</span></div>
                  <div className="feature-list-metric">{selected.carbsPerUnit || 0} g</div>
                </div>
                <div className="feature-list-row">
                  <div><strong>{isHindi ? 'फैट्स' : 'Fats'}</strong><span>{isHindi ? 'प्रति' : 'Per'} {selected.unit}</span></div>
                  <div className="feature-list-metric">{selected.fatsPerUnit || 0} g</div>
                </div>
                <div className="feature-list-row">
                  <div><strong>{isHindi ? 'फाइबर' : 'Fiber'}</strong><span>{isHindi ? 'प्रति' : 'Per'} {selected.unit}</span></div>
                  <div className="feature-list-metric">{selected.fiberPerUnit || 0} g</div>
                </div>
                <div className="feature-list-row">
                  <div><strong>{isHindi ? 'कैल्शियम' : 'Calcium'}</strong><span>{isHindi ? 'प्रति' : 'Per'} {selected.unit}</span></div>
                  <div className="feature-list-metric">{selected.calciumPerUnit || 0} mg</div>
                </div>
                <div className="feature-list-row">
                  <div><strong>{isHindi ? 'कैटेगरी' : 'Category'}</strong><span>{isHindi ? 'कैटलॉग समूह' : 'Catalog group'}</span></div>
                  <div className="feature-list-metric">{formatCategory(selected.category)}</div>
                </div>
                <div className="feature-list-row">
                  <div><strong>{isHindi ? 'डाइट' : 'Diet'}</strong><span>{isHindi ? 'फूड पसंद प्रकार' : 'Food preference type'}</span></div>
                  <div className="feature-list-metric">{formatDiet(selected.dietType)}</div>
                </div>
              </div>
              {vitamins ? (
                <div className="feature-inline-note">{isHindi ? 'विटामिन:' : 'Vitamins:'} {vitamins}</div>
              ) : null}
            </div>
          ) : (
            <div className="feature-empty compact">
              <strong>{isHindi ? 'एक खाद्य पदार्थ चुनें' : 'Select a food'}</strong>
              <p className="muted">{isHindi ? 'ऊपर खोजकर कैलोरी, मैक्रो, कैल्शियम, विटामिन और कैटेगरी जानकारी देखें।' : 'Search above to preview calories, macros, calcium, vitamins, and category details.'}</p>
            </div>
          )}
        </Card>

        <Card className="feature-side-panel">
          <div className="feature-panel-head">
            <div>
              <h3>{isHindi ? 'कैटेगरी के अनुसार देखें' : 'Browse by category'}</h3>
              <p className="muted">{isHindi ? 'सूची को छोटा करने और जल्दी खोजने के लिए कैटेगरी चुनें।' : 'Use categories to narrow the list and find foods faster.'}</p>
            </div>
          </div>

          <div className="feature-chip-row">
            <button type="button" className={`feature-chip ${activeCategory === '' ? 'active' : ''}`} onClick={() => setActiveCategory('')}>{isHindi ? 'सभी' : 'All'}</button>
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                className={`feature-chip ${activeCategory === category ? 'active' : ''}`}
                onClick={() => setActiveCategory(category)}
              >
                {formatCategory(category)}
              </button>
            ))}
          </div>

          <div className="feature-stack-list foods-browser">
            {foods.slice(0, 8).map((food) => (
              <button key={food._id} type="button" className="feature-browser-row" onClick={() => setSelected(food)}>
                <div>
                  <strong>{food.name}</strong>
                  <span>{formatCategory(food.category)}</span>
                </div>
                <div className="feature-list-metric">{food.caloriesPerUnit} kcal</div>
              </button>
            ))}
          </div>
        </Card>
      </section>
    </div>
  )
}
