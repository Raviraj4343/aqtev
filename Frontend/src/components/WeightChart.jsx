import React, { useMemo, useState } from 'react'

export default function WeightChart({ data = [], loading = false }){
  const [activePointId, setActivePointId] = useState(null)

  const normalized = useMemo(() => (
    (Array.isArray(data) ? data : [])
      .map((entry, index) => {
        const value = Number(entry?.weightKg)
        if (!Number.isFinite(value)) return null
        return {
          id: entry?._id || `${entry?.date || 'day'}-${index}`,
          date: String(entry?.date || ''),
          weightKg: value,
        }
      })
      .filter(Boolean)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  ), [data])

  if (loading) return <div className="muted">Loading chart...</div>
  if (!data || data.length === 0) return <div className="muted">No weight data yet.</div>
  if (!normalized.length) return <div className="muted">No weight data yet.</div>

  const width = 720
  const height = 250
  const padding = { top: 12, right: 12, bottom: 28, left: 12 }
  const innerWidth = width - padding.left - padding.right
  const innerHeight = height - padding.top - padding.bottom

  const minWeight = Math.min(...normalized.map((point) => point.weightKg))
  const maxWeight = Math.max(...normalized.map((point) => point.weightKg))
  const range = maxWeight - minWeight
  const pad = range < 0.001 ? 0.8 : range * 0.18
  const paddedMin = minWeight - pad
  const paddedMax = maxWeight + pad
  const yRange = paddedMax - paddedMin || 1

  const getX = (index) => {
    if (normalized.length === 1) return padding.left + innerWidth / 2
    return padding.left + (index / (normalized.length - 1)) * innerWidth
  }

  const getY = (value) => padding.top + ((paddedMax - value) / yRange) * innerHeight

  const points = normalized.map((point, index) => ({
    ...point,
    x: getX(index),
    y: getY(point.weightKg),
  }))

  const polylinePoints = points.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(' ')

  const formatDate = (value) => {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const latestPoint = points[points.length - 1]
  const activePoint = points.find((point) => point.id === activePointId) || latestPoint

  const verticalGridLines = 8
  const horizontalGridLines = 5
  const firstDate = points[0]?.date
  const lastDate = points[points.length - 1]?.date

  return (
    <div className="weight-chart simple" role="img" aria-label="Weight trend line chart">
      <svg viewBox={`0 0 ${width} ${height}`} className="weight-chart-svg" preserveAspectRatio="xMidYMid meet">
        {Array.from({ length: horizontalGridLines }).map((_, index) => {
          const y = padding.top + (index / (horizontalGridLines - 1)) * innerHeight
          return <line key={`h-${index}`} className="weight-grid-line" x1={padding.left} y1={y} x2={width - padding.right} y2={y} />
        })}

        {Array.from({ length: verticalGridLines }).map((_, index) => {
          const x = padding.left + (index / (verticalGridLines - 1)) * innerWidth
          return <line key={`v-${index}`} className="weight-grid-line" x1={x} y1={padding.top} x2={x} y2={height - padding.bottom} />
        })}

        <polyline className="weight-line" points={polylinePoints} />

        {points.map((point) => (
          <g key={point.id} onMouseEnter={() => setActivePointId(point.id)} onFocus={() => setActivePointId(point.id)}>
            <circle className={`weight-point ${activePoint.id === point.id ? 'active' : ''}`} cx={point.x} cy={point.y} r={activePoint.id === point.id ? 5.6 : 4.2} />
            <title>{`${formatDate(point.date)}: ${point.weightKg} kg`}</title>
          </g>
        ))}

        <text className="weight-x-label" x={padding.left} y={height - 8} textAnchor="start">{formatDate(firstDate)}</text>
        <text className="weight-x-label" x={width - padding.right} y={height - 8} textAnchor="end">{formatDate(lastDate)}</text>
      </svg>

      <div className="weight-chart-foot">
        <span>{formatDate(activePoint.date)}</span>
        <strong>{Number(activePoint.weightKg).toFixed(1)} kg</strong>
      </div>
    </div>
  )
}
