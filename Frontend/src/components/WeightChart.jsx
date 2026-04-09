import React, { useMemo, useState } from 'react'

const formatMetricValue = (value, decimals = 1) => {
  if (!Number.isFinite(Number(value))) return '-'
  const numeric = Number(value)
  return decimals > 0 ? numeric.toFixed(decimals) : String(Math.round(numeric))
}

export default function WeightChart({
  data = [],
  loading = false,
  metricKey = 'weightKg',
  unit = 'kg',
  seriesLabel = 'Weight',
  emptyText = 'No data yet.',
  decimals = 1,
  height = 250,
}){
  const [hoveredPointId, setHoveredPointId] = useState(null)
  const [selectedPointId, setSelectedPointId] = useState(null)

  const normalized = useMemo(() => (
    (Array.isArray(data) ? data : [])
      .map((entry, index) => {
        const value = Number(entry?.[metricKey])
        if (!Number.isFinite(value)) return null
        return {
          id: entry?._id || `${entry?.date || 'day'}-${index}`,
          date: String(entry?.date || ''),
          value,
        }
      })
      .filter(Boolean)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  ), [data, metricKey])

  if (loading) return <div className="muted">Loading chart...</div>
  if (!data || data.length === 0) return <div className="muted">{emptyText}</div>
  if (!normalized.length) return <div className="muted">{emptyText}</div>

  const width = 720
  const padding = { top: 12, right: 12, bottom: 28, left: 12 }
  const innerWidth = width - padding.left - padding.right
  const innerHeight = height - padding.top - padding.bottom

  const minWeight = Math.min(...normalized.map((point) => point.value))
  const maxWeight = Math.max(...normalized.map((point) => point.value))
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
    y: getY(point.value),
  }))

  const polylinePoints = points.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(' ')

  const formatDate = (value) => {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const latestPoint = points[points.length - 1]
  const activePoint =
    points.find((point) => point.id === selectedPointId)
    || points.find((point) => point.id === hoveredPointId)
    || latestPoint

  const verticalGridLines = 8
  const horizontalGridLines = 5
  const firstDate = points[0]?.date
  const lastDate = points[points.length - 1]?.date

  const handlePointToggle = (pointId) => {
    setSelectedPointId((prev) => (prev === pointId ? null : pointId))
  }

  return (
    <div className="weight-chart simple" role="img" aria-label={`${seriesLabel} trend line chart`}>
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
          <g
            key={point.id}
            onMouseEnter={() => setHoveredPointId(point.id)}
            onMouseLeave={() => setHoveredPointId(null)}
            onFocus={() => setHoveredPointId(point.id)}
            onBlur={() => setHoveredPointId(null)}
            onClick={() => handlePointToggle(point.id)}
            tabIndex={0}
            role="button"
            aria-label={`${seriesLabel} ${formatDate(point.date)} ${formatMetricValue(point.value, decimals)} ${unit}`}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                handlePointToggle(point.id)
              }
            }}
          >
            <circle
              className={`weight-point ${activePoint.id === point.id ? 'active' : ''} ${hoveredPointId === point.id ? 'hovered' : ''} ${selectedPointId === point.id ? 'selected' : ''}`}
              cx={point.x}
              cy={point.y}
              r={activePoint.id === point.id ? 5.6 : 4.2}
            />
            <title>{`${formatDate(point.date)}: ${formatMetricValue(point.value, decimals)} ${unit}`}</title>
          </g>
        ))}

        <text className="weight-x-label" x={padding.left} y={height - 8} textAnchor="start">{formatDate(firstDate)}</text>
        <text className="weight-x-label" x={width - padding.right} y={height - 8} textAnchor="end">{formatDate(lastDate)}</text>
      </svg>

      <div className="weight-chart-foot">
        <span>{formatDate(activePoint.date)}</span>
        <strong>{formatMetricValue(activePoint.value, decimals)} {unit}</strong>
      </div>
    </div>
  )
}
