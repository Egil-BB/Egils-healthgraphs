import { useState, useEffect, useRef } from 'react'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Legend, Filler
} from 'chart.js'
import annotationPlugin from 'chartjs-plugin-annotation'
import { Line } from 'react-chartjs-2'
import { getAllMeasurements, getAllMedications } from '../db/db'
import { getDailyAverages, getMovingAverage, fillDateGaps, daysAgo, formatDateSv } from '../utils/bp'

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Legend, Filler, annotationPlugin
)

const PERIODS = [
  { label: '1 mån', days: 30 },
  { label: '3 mån', days: 90 },
  { label: '6 mån', days: 180 },
  { label: 'Allt', days: 9999 }
]

export default function GraphView({ refreshKey }) {
  const [measurements, setMeasurements] = useState([])
  const [medications, setMedications] = useState([])
  const [period, setPeriod] = useState(1) // index into PERIODS
  const [showMovingAvg, setShowMovingAvg] = useState(true)
  const [showPulse, setShowPulse] = useState(false)

  useEffect(() => {
    async function load() {
      const [ms, meds] = await Promise.all([getAllMeasurements(), getAllMedications()])
      setMeasurements(ms.sort((a, b) => a.timestamp.localeCompare(b.timestamp)))
      setMedications(meds.sort((a, b) => a.startDate.localeCompare(b.startDate)))
    }
    load()
  }, [refreshKey])

  if (measurements.length === 0) {
    return (
      <div className="view-content">
        <div className="empty-state">
          <div className="empty-icon">📈</div>
          <p>Inga mätningar att visa.<br />Registrera blodtryck för att se din graf.</p>
        </div>
      </div>
    )
  }

  const selectedDays = PERIODS[period].days
  const fromDate = selectedDays < 9999 ? daysAgo(selectedDays) : measurements[0]?.date || daysAgo(30)
  const toDate = new Date().toISOString().slice(0, 10)

  const filtered = measurements.filter(m => m.date >= fromDate && m.date <= toDate)
  const daily = getDailyAverages(filtered)
  const filled = fillDateGaps(daily, fromDate, toDate)
  const movingAvg = getMovingAverage(daily, 14)
  const movingAvgMap = Object.fromEntries(movingAvg.map(d => [d.date, d]))

  const labels = filled.map(d => {
    const dt = new Date(d.date + 'T12:00:00')
    return dt.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })
  })

  // Medication annotations
  const annotations = {}
  const medColors = ['#7c3aed', '#b45309', '#0f766e', '#be185d', '#1d4ed8']

  medications.forEach((med, i) => {
    const idx = filled.findIndex(d => d.date >= med.startDate)
    if (idx < 0) return
    annotations[`med_${i}`] = {
      type: 'line',
      xMin: idx,
      xMax: idx,
      borderColor: medColors[i % medColors.length],
      borderWidth: 2,
      borderDash: [6, 3],
      label: {
        display: true,
        content: med.name,
        position: 'start',
        backgroundColor: medColors[i % medColors.length],
        color: 'white',
        font: { size: 11 },
        padding: { x: 6, y: 3 },
        borderRadius: 4,
        yAdjust: 10
      }
    }
  })

  // Target zone annotations
  annotations.target130 = {
    type: 'line', yMin: 130, yMax: 130,
    borderColor: 'rgba(22, 163, 74, 0.5)', borderWidth: 1, borderDash: [4, 4],
    label: { display: true, content: '130', position: 'end', font: { size: 10 }, color: '#16a34a', backgroundColor: 'transparent' }
  }
  annotations.target140 = {
    type: 'line', yMin: 140, yMax: 140,
    borderColor: 'rgba(220, 38, 38, 0.5)', borderWidth: 1, borderDash: [4, 4],
    label: { display: true, content: '140', position: 'end', font: { size: 10 }, color: '#dc2626', backgroundColor: 'transparent' }
  }
  annotations.target80 = {
    type: 'line', yMin: 80, yMax: 80,
    borderColor: 'rgba(22, 163, 74, 0.3)', borderWidth: 1, borderDash: [3, 3],
    label: { display: true, content: '80', position: 'start', font: { size: 10 }, color: '#16a34a', backgroundColor: 'transparent' }
  }
  annotations.target90 = {
    type: 'line', yMin: 90, yMax: 90,
    borderColor: 'rgba(220, 38, 38, 0.3)', borderWidth: 1, borderDash: [3, 3],
    label: { display: true, content: '90', position: 'start', font: { size: 10 }, color: '#dc2626', backgroundColor: 'transparent' }
  }

  const datasets = [
    {
      label: 'Systoliskt',
      data: filled.map(d => d.avgSys),
      borderColor: '#1d4ed8',
      backgroundColor: 'rgba(29, 78, 216, 0.08)',
      borderWidth: 2,
      pointRadius: filled.map(d => d.count > 0 ? 3 : 0),
      pointHoverRadius: 6,
      spanGaps: false,
      tension: 0.2,
      fill: false,
      order: 2
    },
    {
      label: 'Diastoliskt',
      data: filled.map(d => d.avgDia),
      borderColor: '#0891b2',
      backgroundColor: 'rgba(8, 145, 178, 0.08)',
      borderWidth: 2,
      pointRadius: filled.map(d => d.count > 0 ? 3 : 0),
      pointHoverRadius: 6,
      spanGaps: false,
      tension: 0.2,
      fill: false,
      order: 2
    }
  ]

  if (showMovingAvg) {
    datasets.push({
      label: 'Medel SYS (14d)',
      data: filled.map(d => movingAvgMap[d.date]?.avgSys ?? null),
      borderColor: '#1d4ed8',
      backgroundColor: 'transparent',
      borderWidth: 2.5,
      borderDash: [8, 4],
      pointRadius: 0,
      spanGaps: true,
      tension: 0.4,
      order: 1
    }, {
      label: 'Medel DIA (14d)',
      data: filled.map(d => movingAvgMap[d.date]?.avgDia ?? null),
      borderColor: '#0891b2',
      backgroundColor: 'transparent',
      borderWidth: 2.5,
      borderDash: [8, 4],
      pointRadius: 0,
      spanGaps: true,
      tension: 0.4,
      order: 1
    })
  }

  if (showPulse) {
    datasets.push({
      label: 'Puls',
      data: filled.map(d => {
        const dayMs = filtered.filter(m => m.date === d.date && m.pulse)
        return dayMs.length > 0 ? Math.round(dayMs.reduce((s, m) => s + m.pulse, 0) / dayMs.length) : null
      }),
      borderColor: '#e11d48',
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      pointRadius: 2,
      spanGaps: false,
      tension: 0.2,
      yAxisID: 'pulse',
      order: 3
    })
  }

  const chartData = { labels, datasets }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        position: 'bottom',
        labels: { boxWidth: 16, font: { size: 12 }, padding: 12 }
      },
      tooltip: {
        callbacks: {
          title: (items) => {
            const idx = items[0]?.dataIndex
            return filled[idx] ? formatDateSv(filled[idx].date) : ''
          },
          afterBody: (items) => {
            const idx = items[0]?.dataIndex
            const d = filled[idx]
            if (d && d.count > 0) {
              const parts = [`Antal mätningar: ${d.count}`]
              if (d.reliable) parts.push('✓ Tillförlitligt (morgon + kväll)')
              return parts
            }
            return []
          }
        }
      },
      annotation: { annotations }
    },
    scales: {
      x: {
        ticks: {
          maxTicksLimit: 8,
          font: { size: 11 },
          maxRotation: 30
        },
        grid: { color: 'rgba(0,0,0,0.06)' }
      },
      y: {
        min: 50,
        max: 200,
        title: { display: true, text: 'mmHg', font: { size: 11 } },
        ticks: { font: { size: 11 } },
        grid: { color: 'rgba(0,0,0,0.06)' }
      },
      ...(showPulse ? {
        pulse: {
          position: 'right',
          min: 30,
          max: 160,
          title: { display: true, text: 'Puls', font: { size: 11 } },
          ticks: { font: { size: 11 } },
          grid: { drawOnChartArea: false }
        }
      } : {})
    }
  }

  // Summary stats for this period
  const sysValues = filtered.map(m => m.sys)
  const diaValues = filtered.map(m => m.dia)
  const avgSys = sysValues.length ? Math.round(sysValues.reduce((a, b) => a + b, 0) / sysValues.length) : null
  const avgDia = diaValues.length ? Math.round(diaValues.reduce((a, b) => a + b, 0) / diaValues.length) : null
  const minSys = sysValues.length ? Math.min(...sysValues) : null
  const maxSys = sysValues.length ? Math.max(...sysValues) : null

  return (
    <div className="view-content">
      {/* Period selector */}
      <div className="card">
        <div className="period-selector">
          {PERIODS.map((p, i) => (
            <button
              key={i}
              className={`period-btn ${period === i ? 'period-btn-active' : ''}`}
              onClick={() => setPeriod(i)}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="toggle-row">
          <label className="toggle-label">
            <input type="checkbox" checked={showMovingAvg} onChange={e => setShowMovingAvg(e.target.checked)} />
            14-dagars medelvärde
          </label>
          <label className="toggle-label">
            <input type="checkbox" checked={showPulse} onChange={e => setShowPulse(e.target.checked)} />
            Puls
          </label>
        </div>
      </div>

      {/* Chart */}
      <div className="card chart-card">
        <div className="chart-wrapper">
          <Line data={chartData} options={chartOptions} />
        </div>
        <div className="chart-legend-zones">
          <span className="zone-chip" style={{ background: '#dcfce7', color: '#16a34a' }}>--- 130 optimal</span>
          <span className="zone-chip" style={{ background: '#fee2e2', color: '#dc2626' }}>--- 140 förhöjt</span>
        </div>
      </div>

      {/* Summary stats */}
      {filtered.length > 0 && (
        <div className="card">
          <h3 className="card-title">Sammanfattning – {PERIODS[period].label}</h3>
          <div className="stats-grid">
            <StatBox label="Medel" value={avgSys && avgDia ? `${avgSys}/${avgDia}` : '–'} unit="mmHg" />
            <StatBox label="Lägst SYS" value={minSys ?? '–'} unit="mmHg" />
            <StatBox label="Högst SYS" value={maxSys ?? '–'} unit="mmHg" />
            <StatBox label="Mätningar" value={filtered.length} unit="st" />
          </div>
        </div>
      )}
    </div>
  )
}

function StatBox({ label, value, unit }) {
  return (
    <div className="stat-box">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
      <span className="stat-unit">{unit}</span>
    </div>
  )
}
