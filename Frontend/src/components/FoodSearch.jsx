import React, { useEffect, useMemo, useState } from 'react'
import Input from './ui/Input'
import * as api from '../utils/api'
import { useLanguage } from '../contexts/LanguageContext'

export default function FoodSearch({ onSelect, placeholder = 'Search foods...', foods = [] }){
  const { language } = useLanguage()
  const isHindi = language === 'hi'
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const indexedFoods = useMemo(() => {
    if (!Array.isArray(foods)) return []
    return foods.map((food) => ({
      item: food,
      term: `${String(food?.name || '').toLowerCase()} ${String(food?.nameHindi || '').toLowerCase()}`,
    }))
  }, [foods])

  useEffect(() => {
    if (!q || q.trim().length < 1) {
      setResults([])
      setError('')
      return
    }

    let active = true
    const t = setTimeout(async () => {
      setLoading(true)
      setError('')

      const term = q.trim().toLowerCase()
      const localMatches = indexedFoods
        .filter((entry) => entry.term.includes(term))
        .map((entry) => entry.item)
        .slice(0, 10)

      if (active && localMatches.length) {
        setResults(localMatches)
      }

      try {
        // Avoid unnecessary network roundtrips when local index already fills suggestions.
        if (localMatches.length >= 10 || term.length < 2) {
          setResults(localMatches)
          setLoading(false)
          return
        }

        const res = await api.searchFoods(q.trim())
        if (!active) return
        const remote = Array.isArray(res?.data) ? res.data : []

        // Merge local and remote results while preserving uniqueness by _id or name.
        const merged = []
        const seen = new Set()

        for (const item of [...remote, ...localMatches]) {
          const key = item?._id || item?.name
          if (!key || seen.has(key)) continue
          seen.add(key)
          merged.push(item)
          if (merged.length >= 10) break
        }

        setResults(merged)
      } catch (err) {
        if (!active) return
        setResults(localMatches)
        if (!localMatches.length) {
          setError(err?.payload?.message || err?.message || (isHindi ? 'खाद्य पदार्थ खोजे नहीं जा सके।' : 'Unable to search foods.'))
        }
      } finally {
        if (active) setLoading(false)
      }
    }, 250)

    return () => {
      active = false
      clearTimeout(t)
    }
  }, [q, indexedFoods, isHindi])

  const handleSelect = (food) => {
    if (onSelect) onSelect(food)
    setQ('')
    setResults([])
    setError('')
  }

  return (
    <div className="food-search">
      <Input
        id="food-search"
        name="food-search"
        value={q}
        onChange={e => setQ(e.target.value)}
        placeholder={placeholder === 'Search foods...' ? (isHindi ? 'खाद्य पदार्थ खोजें...' : placeholder) : placeholder}
      />

      {(loading || error || results.length > 0 || q.trim()) ? (
        <div className="suggestions">
          {loading ? <div className="muted suggestion-state">{isHindi ? 'खोज जारी है...' : 'Searching...'}</div> : null}
          {!loading && error ? <div className="muted suggestion-state">{error}</div> : null}
          {!loading && !error && q.trim() && results.length === 0 ? (
            <div className="muted suggestion-state">{isHindi ? 'कोई खाद्य पदार्थ नहीं मिला।' : 'No foods found.'}</div>
          ) : null}
          {results.map(r => {
            const meta = [
              r.nameHindi,
              `${r.caloriesPerUnit} kcal`,
              `${r.proteinPerUnit} g protein`,
              r.unit,
            ].filter(Boolean).join(' • ')

            return (
              <button key={r._id} type="button" className="suggestion" onClick={() => handleSelect(r)}>
                <div className="s-left">
                  <div className="s-name">{r.name}</div>
                  <div className="muted">{meta}</div>
                </div>
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
