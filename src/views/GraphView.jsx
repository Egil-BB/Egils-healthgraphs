import { useState, useEffect } from 'react'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement, BarElement,
  Title, Tooltip, Legend, Filler
} from 'chart.js'
import annotationPlugin from 'chartjs-plugin-annotation'
import { Line, Bar } from 'react-chartjs-2'
import {
  getAllMeasurements, getAllMedications, getAllLabs, getAllWeights,
  getAllLifestyle, getProfile, getAllGutEntries
} from '../db/db'
import { getDailyAverages, getMovingAverage, fillDateGaps, daysAgo, formatDateSv } from '../utils/bp'
import { getScoreLabel } from '../utils/lifestyle'
import { getMedGraphTargets } from '../utils/medications'

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, BarElement,
  Title, Tooltip, Legend, Filler, annotationPlugin
)

const GRAPH_TABS = [
  { id: 'bp', label: 'Blodtryck' },
  { id: 'cholesterol', label: 'Kolesterol' },
  { id: 'glucose', label: 'Socker' },
  { id: 'weight', label: 'Vikt' },
  { id: 'lifestyle', label: 'Levnadsvanor' },
  { id: 'gut', label: 'Tarm' },
  { id: 'combined', label: 'Kombinerad' },
]

const PERIODS = [
  { label: '1 mån', days: 30 },
  { label: '3 mån', days: 90 },
  { label: '6 mån', days: 180 },
  { label: 'Allt', days: 9999 }
]

function dateLabel(dateStr, shortYear) {
  const dt = new Date(dateStr + 'T12:00:00')
  return dt.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', year: shortYear ? '2-digit' : undefined })
}

// ── Blood pressure graph ──────────────────────────────────────────────────────

function BPGraph({ measurements, medications, period, setPeriod }) {
  const [showMovingAvg, setShowMovingAvg] = useState(true)
  const [showPulse, setShowPulse] = useState(false)

  if (measurements.length === 0) {
    return <EmptyState icon="📈" text="Inga blodtrycksmätningar att visa." />
  }

  const selectedDays = PERIODS[period].days
  const fromDate = selectedDays < 9999 ? daysAgo(selectedDays) : measurements[0]?.date || daysAgo(30)
  const toDate = new Date().toISOString().slice(0, 10)

  const filtered = measurements.filter(m => m.date >= fromDate && m.date <= toDate)
  const daily = getDailyAverages(filtered)
  const filled = fillDateGaps(daily, fromDate, toDate)
  const movingAvg = getMovingAverage(daily, 14)
  const movingAvgMap = Object.fromEntries(movingAvg.map(d => [d.date, d]))

  const labels = filled.map(d => dateLabel(d.date))

  const annotations = {}
  const medColors = ['#7c3aed', '#b45309', '#0f766e', '#be185d', '#1d4ed8']

  // Only BP meds on this graph
  medications.filter(med => getMedGraphTargets(med.name).includes('bp')).forEach((med, i) => {
    const idx = filled.findIndex(d => d.date >= med.startDate)
    if (idx < 0) return
    annotations[`med_${i}`] = {
      type: 'line', xMin: idx, xMax: idx,
      borderColor: medColors[i % medColors.length], borderWidth: 2, borderDash: [6, 3],
      label: {
        display: true, content: med.name, position: 'start',
        backgroundColor: medColors[i % medColors.length], color: 'white',
        font: { size: 11 }, padding: { x: 6, y: 3 }, borderRadius: 4, yAdjust: 10
      }
    }
  })

  // Systolic reference lines
  annotations.t130 = { type: 'line', yMin: 130, yMax: 130, borderColor: 'rgba(22,163,74,0.5)', borderWidth: 1, borderDash: [4, 4], label: { display: true, content: '130', position: 'end', font: { size: 10 }, color: '#16a34a', backgroundColor: 'transparent' } }
  annotations.t140 = { type: 'line', yMin: 140, yMax: 140, borderColor: 'rgba(220,38,38,0.5)', borderWidth: 1, borderDash: [4, 4], label: { display: true, content: '140', position: 'end', font: { size: 10 }, color: '#dc2626', backgroundColor: 'transparent' } }
  // Diastolic reference lines
  annotations.d80 = { type: 'line', yMin: 80, yMax: 80, borderColor: 'rgba(22,163,74,0.35)', borderWidth: 1, borderDash: [3, 5], label: { display: true, content: '80', position: 'start', font: { size: 10 }, color: '#16a34a', backgroundColor: 'transparent' } }
  annotations.d90 = { type: 'line', yMin: 90, yMax: 90, borderColor: 'rgba(220,38,38,0.35)', borderWidth: 1, borderDash: [3, 5], label: { display: true, content: '90', position: 'start', font: { size: 10 }, color: '#dc2626', backgroundColor: 'transparent' } }

  const datasets = [
    { label: 'Systoliskt', data: filled.map(d => d.avgSys), borderColor: '#1d4ed8', backgroundColor: 'rgba(29,78,216,0.08)', borderWidth: 2, pointRadius: filled.map(d => d.count > 0 ? 3 : 0), pointHoverRadius: 6, spanGaps: false, tension: 0.2, fill: false, order: 2 },
    { label: 'Diastoliskt', data: filled.map(d => d.avgDia), borderColor: '#0891b2', backgroundColor: 'rgba(8,145,178,0.08)', borderWidth: 2, pointRadius: filled.map(d => d.count > 0 ? 3 : 0), pointHoverRadius: 6, spanGaps: false, tension: 0.2, fill: false, order: 2 }
  ]

  if (showMovingAvg) {
    datasets.push(
      { label: 'Medel SYS (14d)', data: filled.map(d => movingAvgMap[d.date]?.avgSys ?? null), borderColor: '#1d4ed8', backgroundColor: 'transparent', borderWidth: 2.5, borderDash: [8, 4], pointRadius: 0, spanGaps: true, tension: 0.4, order: 1 },
      { label: 'Medel DIA (14d)', data: filled.map(d => movingAvgMap[d.date]?.avgDia ?? null), borderColor: '#0891b2', backgroundColor: 'transparent', borderWidth: 2.5, borderDash: [8, 4], pointRadius: 0, spanGaps: true, tension: 0.4, order: 1 }
    )
  }

  if (showPulse) {
    datasets.push({ label: 'Puls', data: filled.map(d => { const ms = filtered.filter(m => m.date === d.date && m.pulse); return ms.length ? Math.round(ms.reduce((s, m) => s + m.pulse, 0) / ms.length) : null }), borderColor: '#e11d48', backgroundColor: 'transparent', borderWidth: 1.5, pointRadius: 2, spanGaps: false, tension: 0.2, yAxisID: 'pulse', order: 3 })
  }

  const options = {
    responsive: true, maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { position: 'bottom', labels: { boxWidth: 16, font: { size: 12 }, padding: 12 } },
      tooltip: { callbacks: { title: items => { const idx = items[0]?.dataIndex; return filled[idx] ? formatDateSv(filled[idx].date) : '' }, afterBody: items => { const d = filled[items[0]?.dataIndex]; return d?.count > 0 ? [`Mätningar: ${d.count}${d.reliable ? ' ✓' : ''}`] : [] } } },
      annotation: { annotations }
    },
    scales: {
      x: { ticks: { maxTicksLimit: 8, font: { size: 11 }, maxRotation: 30 }, grid: { color: 'rgba(0,0,0,0.06)' } },
      y: { min: 50, max: 200, title: { display: true, text: 'mmHg', font: { size: 11 } }, ticks: { font: { size: 11 } }, grid: { color: 'rgba(0,0,0,0.06)' } },
      ...(showPulse ? { pulse: { position: 'right', min: 30, max: 160, title: { display: true, text: 'Puls', font: { size: 11 } }, ticks: { font: { size: 11 } }, grid: { drawOnChartArea: false } } } : {})
    }
  }

  const sysValues = filtered.map(m => m.sys)
  const diaValues = filtered.map(m => m.dia)
  const avgSys = sysValues.length ? Math.round(sysValues.reduce((a, b) => a + b, 0) / sysValues.length) : null
  const avgDia = diaValues.length ? Math.round(diaValues.reduce((a, b) => a + b, 0) / diaValues.length) : null

  return (
    <>
      <div className="card">
        <div className="period-selector">
          {PERIODS.map((p, i) => (
            <button key={i} className={`period-btn ${period === i ? 'period-btn-active' : ''}`} onClick={() => setPeriod(i)}>{p.label}</button>
          ))}
        </div>
        <div className="toggle-row">
          <label className="toggle-label"><input type="checkbox" checked={showMovingAvg} onChange={e => setShowMovingAvg(e.target.checked)} /> 14-dagars medelvärde</label>
          <label className="toggle-label"><input type="checkbox" checked={showPulse} onChange={e => setShowPulse(e.target.checked)} /> Puls</label>
        </div>
      </div>
      <div className="card chart-card">
        <div className="chart-wrapper"><Line data={{ labels, datasets }} options={options} /></div>
        <div className="chart-legend-zones">
          <span className="zone-chip" style={{ background: '#dcfce7', color: '#16a34a' }}>--- 130/80 optimal</span>
          <span className="zone-chip" style={{ background: '#fee2e2', color: '#dc2626' }}>--- 140/90 förhöjt</span>
        </div>
      </div>
      {filtered.length > 0 && (
        <div className="card">
          <h3 className="card-title">Sammanfattning – {PERIODS[period].label}</h3>
          <div className="stats-grid">
            <StatBox label="Medel" value={avgSys && avgDia ? `${avgSys}/${avgDia}` : '–'} unit="mmHg" />
            <StatBox label="Lägst SYS" value={sysValues.length ? Math.min(...sysValues) : '–'} unit="mmHg" />
            <StatBox label="Högst SYS" value={sysValues.length ? Math.max(...sysValues) : '–'} unit="mmHg" />
            <StatBox label="Mätningar" value={filtered.length} unit="st" />
          </div>
        </div>
      )}
    </>
  )
}

// ── Cholesterol graph ─────────────────────────────────────────────────────────

function CholesterolGraph({ labs, medications }) {
  const byDate = {}
  for (const lab of labs) {
    if (!byDate[lab.date]) byDate[lab.date] = {}
    byDate[lab.date][lab.type] = lab.value
  }

  const points = Object.entries(byDate).map(([date, vals]) => {
    let nonHdl = null
    if (vals.nonHdl != null) nonHdl = vals.nonHdl
    else if (vals.totalCholesterol != null && vals.hdl != null) nonHdl = parseFloat((vals.totalCholesterol - vals.hdl).toFixed(2))
    else if (vals.totalCholesterol != null) nonHdl = parseFloat((vals.totalCholesterol - 1.3).toFixed(2))
    return nonHdl != null ? { date, nonHdl } : null
  }).filter(Boolean).sort((a, b) => a.date.localeCompare(b.date))

  if (points.length === 0) {
    return <EmptyState icon="💉" text="Inga kolesterolvärden registrerade. Lägg till totalkolesterol och HDL under Provsvar." />
  }

  const labels = points.map(p => dateLabel(p.date, points.length > 6))
  const cholMeds = medications.filter(m => getMedGraphTargets(m.name).includes('cholesterol'))
  const medColors = ['#7c3aed', '#b45309', '#0f766e']

  const annotations = {}
  cholMeds.forEach((med, i) => {
    const idx = points.findIndex(p => p.date >= med.startDate)
    if (idx < 0) return
    annotations[`chol_${i}`] = {
      type: 'line', xMin: idx, xMax: idx,
      borderColor: medColors[i % medColors.length], borderWidth: 2, borderDash: [6, 3],
      label: { display: true, content: med.name, position: 'start', backgroundColor: medColors[i % medColors.length], color: 'white', font: { size: 11 }, padding: { x: 6, y: 3 }, borderRadius: 4 }
    }
  })
  annotations.refLine = { type: 'line', yMin: 3.4, yMax: 3.4, borderColor: 'rgba(220,38,38,0.5)', borderWidth: 1.5, borderDash: [5, 5], label: { display: true, content: '3,4', position: 'end', font: { size: 10 }, color: '#dc2626', backgroundColor: 'transparent' } }

  const datasets = [
    { label: 'Non-HDL', data: points.map(p => p.nonHdl), borderColor: '#7c3aed', backgroundColor: 'rgba(124,58,237,0.1)', borderWidth: 2.5, pointRadius: 5, pointHoverRadius: 7, tension: 0.2, fill: false },
    { label: 'Gräns 3,4', data: points.map(() => 3.4), borderColor: 'rgba(220,38,38,0.4)', borderDash: [5, 5], borderWidth: 1.5, pointRadius: 0, tension: 0 }
  ]

  const options = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { boxWidth: 14, font: { size: 12 }, padding: 10 } },
      tooltip: { callbacks: { label: item => item.datasetIndex === 0 ? `Non-HDL: ${item.raw} mmol/L` : 'Gräns 3,4 mmol/L' } },
      annotation: { annotations }
    },
    scales: {
      x: { ticks: { font: { size: 11 }, maxRotation: 30 }, grid: { color: 'rgba(0,0,0,0.06)' } },
      y: { title: { display: true, text: 'mmol/L', font: { size: 11 } }, ticks: { font: { size: 11 } }, grid: { color: 'rgba(0,0,0,0.06)' } }
    }
  }

  const latest = points[points.length - 1]
  const isHigh = latest.nonHdl > 3.4

  return (
    <div className="card chart-card">
      <div className="chol-header">
        <span className="card-title">Non-HDL-kolesterol</span>
        <span style={{ color: isHigh ? '#dc2626' : '#16a34a', fontWeight: 700 }}>
          Senast: {latest.nonHdl} mmol/L {isHigh ? '↑' : '✓'}
        </span>
      </div>
      <p className="card-desc">Non-HDL = totalkolesterol − HDL. Mål: &lt;3,4 mmol/L. Statiner och ezetimib markeras.</p>
      <div className="chart-wrapper"><Line data={{ labels, datasets }} options={options} /></div>
    </div>
  )
}

// ── Glucose graph ─────────────────────────────────────────────────────────────

function GlucoseGraph({ labs, medications }) {
  const glucosePoints = labs
    .filter(l => l.type === 'glucose')
    .sort((a, b) => a.date.localeCompare(b.date))

  const hba1cPoints = labs
    .filter(l => l.type === 'hba1c')
    .sort((a, b) => a.date.localeCompare(b.date))

  if (glucosePoints.length === 0 && hba1cPoints.length === 0) {
    return <EmptyState icon="🩸" text="Inga sockervärden registrerade. Lägg till P-Glukos eller HbA1c under Provsvar." />
  }

  const allDates = [...new Set([...glucosePoints.map(p => p.date), ...hba1cPoints.map(p => p.date)])].sort()
  const labels = allDates.map(d => dateLabel(d, allDates.length > 6))

  const glucoseByDate = Object.fromEntries(glucosePoints.map(p => [p.date, p.value]))
  const hba1cByDate = Object.fromEntries(hba1cPoints.map(p => [p.date, p.value]))

  const datasets = []
  if (glucosePoints.length > 0) {
    datasets.push({
      label: 'P-Glukos (mmol/L)',
      data: allDates.map(d => glucoseByDate[d] ?? null),
      borderColor: '#dc2626',
      backgroundColor: 'rgba(220,38,38,0.1)',
      borderWidth: 2.5, pointRadius: 5, pointHoverRadius: 7, tension: 0.2, spanGaps: false, fill: false
    })
  }
  if (hba1cPoints.length > 0) {
    datasets.push({
      label: 'HbA1c (mmol/mol)',
      data: allDates.map(d => hba1cByDate[d] ?? null),
      borderColor: '#ea580c',
      backgroundColor: 'transparent',
      borderWidth: 2, borderDash: [6, 3], pointRadius: 4, tension: 0.2, spanGaps: false,
      yAxisID: 'hba1c'
    })
  }

  const glucoseMeds = medications.filter(m => getMedGraphTargets(m.name).includes('glucose'))
  const medColors = ['#7c3aed', '#b45309', '#0f766e', '#be185d']
  const annotations = {}
  glucoseMeds.forEach((med, i) => {
    const idx = allDates.findIndex(d => d >= med.startDate)
    if (idx < 0) return
    annotations[`glu_${i}`] = {
      type: 'line', xMin: idx, xMax: idx,
      borderColor: medColors[i % medColors.length], borderWidth: 2, borderDash: [6, 3],
      label: { display: true, content: med.name, position: 'start', backgroundColor: medColors[i % medColors.length], color: 'white', font: { size: 11 }, padding: { x: 6, y: 3 }, borderRadius: 4 }
    }
  })
  if (glucosePoints.length > 0) {
    annotations.gluRef = { type: 'line', yMin: 6.1, yMax: 6.1, borderColor: 'rgba(220,38,38,0.4)', borderWidth: 1.5, borderDash: [5, 5], label: { display: true, content: '6,1', position: 'end', font: { size: 10 }, color: '#dc2626', backgroundColor: 'transparent' } }
  }

  const options = {
    responsive: true, maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { position: 'bottom', labels: { boxWidth: 14, font: { size: 12 }, padding: 10 } },
      annotation: { annotations }
    },
    scales: {
      x: { ticks: { font: { size: 11 }, maxRotation: 30 }, grid: { color: 'rgba(0,0,0,0.06)' } },
      y: { title: { display: true, text: 'mmol/L', font: { size: 11 } }, ticks: { font: { size: 11 } }, grid: { color: 'rgba(0,0,0,0.06)' } },
      ...(hba1cPoints.length > 0 ? { hba1c: { position: 'right', title: { display: true, text: 'mmol/mol', font: { size: 11 } }, ticks: { font: { size: 11 } }, grid: { drawOnChartArea: false } } } : {})
    }
  }

  const latestGlu = glucosePoints.length ? glucosePoints[glucosePoints.length - 1] : null
  const latestHba1c = hba1cPoints.length ? hba1cPoints[hba1cPoints.length - 1] : null

  return (
    <div className="card chart-card">
      <div className="chol-header">
        <span className="card-title">Blodsocker</span>
        <span style={{ fontWeight: 700, fontSize: 13 }}>
          {latestGlu && <span style={{ color: latestGlu.value > 6.1 ? '#dc2626' : '#16a34a' }}>Glukos: {latestGlu.value} </span>}
          {latestHba1c && <span style={{ color: latestHba1c.value > 48 ? '#dc2626' : '#16a34a' }}>HbA1c: {latestHba1c.value}</span>}
        </span>
      </div>
      <p className="card-desc">Fasteplasmaglukos mål &lt;6,1 mmol/L · HbA1c mål &lt;48 mmol/mol. Diabetesmediciner markeras.</p>
      <div className="chart-wrapper"><Line data={{ labels, datasets }} options={options} /></div>
    </div>
  )
}

// ── Weight graph ──────────────────────────────────────────────────────────────

function WeightGraph({ weights, heightCm, medications }) {
  if (weights.length === 0) {
    return <EmptyState icon="⚖️" text="Inga vikter registrerade. Lägg till vikt under Registrera → Vikt." />
  }

  const sorted = [...weights].sort((a, b) => a.date.localeCompare(b.date))
  const labels = sorted.map(w => dateLabel(w.date, sorted.length > 6))

  const datasets = [
    {
      label: 'Vikt (kg)',
      data: sorted.map(w => w.weight),
      borderColor: '#0891b2',
      backgroundColor: 'rgba(8,145,178,0.1)',
      borderWidth: 2.5, pointRadius: 5, pointHoverRadius: 7, tension: 0.2, fill: true
    }
  ]

  const bmiData = heightCm ? sorted.map(w => parseFloat((w.weight / Math.pow(heightCm / 100, 2)).toFixed(1))) : []
  if (bmiData.length) {
    datasets.push({ label: 'BMI', data: bmiData, borderColor: '#ea580c', backgroundColor: 'transparent', borderWidth: 2, borderDash: [6, 3], pointRadius: 3, tension: 0.2, yAxisID: 'bmi' })
  }

  const weightMeds = medications.filter(m => getMedGraphTargets(m.name).includes('weight'))
  const medColors = ['#7c3aed', '#b45309', '#0f766e', '#be185d']
  const annotations = {}
  weightMeds.forEach((med, i) => {
    const idx = sorted.findIndex(w => w.date >= med.startDate)
    if (idx < 0) return
    annotations[`wt_${i}`] = {
      type: 'line', xMin: idx, xMax: idx,
      borderColor: medColors[i % medColors.length], borderWidth: 2, borderDash: [6, 3],
      label: { display: true, content: med.name, position: 'start', backgroundColor: medColors[i % medColors.length], color: 'white', font: { size: 11 }, padding: { x: 6, y: 3 }, borderRadius: 4 }
    }
  })

  const options = {
    responsive: true, maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { position: 'bottom', labels: { boxWidth: 14, font: { size: 12 }, padding: 10 } },
      tooltip: { callbacks: { label: item => item.dataset.label === 'BMI' ? `BMI: ${item.raw}` : `Vikt: ${item.raw} kg` } },
      annotation: { annotations }
    },
    scales: {
      x: { ticks: { font: { size: 11 }, maxRotation: 30 }, grid: { color: 'rgba(0,0,0,0.06)' } },
      y: { title: { display: true, text: 'kg', font: { size: 11 } }, ticks: { font: { size: 11 } }, grid: { color: 'rgba(0,0,0,0.06)' } },
      ...(bmiData.length ? { bmi: { position: 'right', min: 10, max: 50, title: { display: true, text: 'BMI', font: { size: 11 } }, ticks: { font: { size: 11 } }, grid: { drawOnChartArea: false } } } : {})
    }
  }

  const latest = sorted[sorted.length - 1]
  const latestBmi = heightCm ? (latest.weight / Math.pow(heightCm / 100, 2)).toFixed(1) : null

  return (
    <div className="card chart-card">
      <div className="chol-header">
        <span className="card-title">Viktkurva</span>
        <span style={{ color: '#0891b2', fontWeight: 700 }}>
          Senast: {latest.weight} kg{latestBmi ? ` · BMI ${latestBmi}` : ''}
        </span>
      </div>
      {!heightCm && <p className="card-hint" style={{ color: '#ca8a04' }}>⚠ Ange längd i Inställningar för att se BMI-kurva.</p>}
      <div className="chart-wrapper"><Line data={{ labels, datasets }} options={options} /></div>
    </div>
  )
}

// ── Lifestyle score graph ─────────────────────────────────────────────────────

function LifestyleGraph({ lifestyle }) {
  if (lifestyle.length === 0) {
    return <EmptyState icon="🏃" text="Inga levnadsvanor registrerade. Fyll i enkäten under Registrera → Levnadsvanor." />
  }

  const sorted = [...lifestyle].sort((a, b) => a.date.localeCompare(b.date))
  const labels = sorted.map(e => dateLabel(e.date, true))
  const scores = sorted.map(e => e.score)
  const colors = scores.map(s => getScoreLabel(s).color)

  const datasets = [{
    label: 'Levnadspoäng',
    data: scores,
    backgroundColor: colors.map(c => c + 'cc'),
    borderColor: colors,
    borderWidth: 2,
    borderRadius: 6,
  }]

  const options = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: item => `${item.raw}p – ${getScoreLabel(item.raw).label}` } }
    },
    scales: {
      x: { ticks: { font: { size: 11 }, maxRotation: 30 }, grid: { color: 'rgba(0,0,0,0.06)' } },
      y: { min: 0, max: 100, title: { display: true, text: 'Poäng', font: { size: 11 } }, ticks: { font: { size: 11 } }, grid: { color: 'rgba(0,0,0,0.06)' } }
    }
  }

  const latest = sorted[sorted.length - 1]
  const latestLabel = getScoreLabel(latest.score)

  return (
    <div className="card chart-card">
      <div className="chol-header">
        <span className="card-title">Levnadsvanor</span>
        <span style={{ color: latestLabel.color, fontWeight: 700 }}>
          Senast: {latest.score}p – {latestLabel.label}
        </span>
      </div>
      <div className="chart-wrapper"><Bar data={{ labels, datasets }} options={options} /></div>
    </div>
  )
}

// ── Gut diary graph ────────────────────────────────────────────────────────────

const BRISTOL_COLORS = {
  1: '#92400e', 2: '#b45309', 3: '#16a34a', 4: '#16a34a',
  5: '#ca8a04', 6: '#dc2626', 7: '#dc2626'
}

function GutGraph({ gutEntries }) {
  if (gutEntries.length === 0) {
    return <EmptyState icon="📔" text="Inga tarmdagboksposter. Registrera under Dagbok-fliken." />
  }

  const sorted = [...gutEntries].sort((a, b) => a.date.localeCompare(b.date))
  const last30 = sorted.filter(e => e.date >= daysAgo(90))
  const display = last30.length > 0 ? last30 : sorted.slice(-20)

  const labels = display.map(e => dateLabel(e.date, true))
  const bristolData = display.map(e => e.bristolType)
  const countData = display.map(e => e.bowelCount)
  const bgColors = display.map(e => (BRISTOL_COLORS[e.bristolType] || '#64748b') + 'cc')

  const options = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { boxWidth: 14, font: { size: 12 }, padding: 10 } },
      tooltip: {
        callbacks: {
          label: item => {
            if (item.datasetIndex === 0) return `Bristol typ ${item.raw}`
            return `Tömningar: ${item.raw}`
          }
        }
      },
      annotation: {
        annotations: {
          normalMin: { type: 'line', yMin: 3, yMax: 3, borderColor: 'rgba(22,163,74,0.4)', borderWidth: 1, borderDash: [4, 4], label: { display: true, content: 'Typ 3', position: 'start', font: { size: 10 }, color: '#16a34a', backgroundColor: 'transparent' } },
          normalMax: { type: 'line', yMin: 4, yMax: 4, borderColor: 'rgba(22,163,74,0.4)', borderWidth: 1, borderDash: [4, 4], label: { display: true, content: 'Typ 4', position: 'start', font: { size: 10 }, color: '#16a34a', backgroundColor: 'transparent' } }
        }
      }
    },
    scales: {
      x: { ticks: { font: { size: 11 }, maxRotation: 30 }, grid: { color: 'rgba(0,0,0,0.06)' } },
      y: { min: 0, max: 8, title: { display: true, text: 'Bristol-typ', font: { size: 11 } }, ticks: { stepSize: 1, font: { size: 11 } }, grid: { color: 'rgba(0,0,0,0.06)' } },
      count: { position: 'right', min: 0, max: 8, title: { display: true, text: 'Tömn/dag', font: { size: 11 } }, ticks: { stepSize: 1, font: { size: 11 } }, grid: { drawOnChartArea: false } }
    }
  }

  return (
    <div className="card chart-card">
      <div className="chol-header">
        <span className="card-title">Tarmdagbok (90 dagar)</span>
        <span style={{ color: '#64748b', fontSize: 13 }}>
          Typ 3–4 = optimal
        </span>
      </div>
      <p className="card-desc">Bristol-typ (vänster) och antal tömningar/dag (höger).</p>
      <div className="chart-wrapper">
        <Line
          data={{
            labels,
            datasets: [
              { label: 'Bristol-typ', data: bristolData, borderColor: '#7c3aed', backgroundColor: bgColors, borderWidth: 2.5, pointRadius: 6, pointBackgroundColor: bgColors, tension: 0.2 },
              { label: 'Tömningar/dag', data: countData, borderColor: '#0891b2', backgroundColor: 'transparent', borderWidth: 2, borderDash: [5, 4], pointRadius: 4, tension: 0.2, yAxisID: 'count' }
            ]
          }}
          options={options}
        />
      </div>
      <div className="chart-legend-zones">
        <span className="zone-chip" style={{ background: '#dcfce7', color: '#16a34a' }}>Typ 3–4 optimal</span>
        <span className="zone-chip" style={{ background: '#fee2e2', color: '#dc2626' }}>Typ 1–2 hård · 6–7 lös</span>
      </div>
    </div>
  )
}

// ── Combined mini-charts ──────────────────────────────────────────────────────

function MiniLine({ data, labels, color, unit, refLine, title, latest, latestColor }) {
  const datasets = [
    { data, borderColor: color, backgroundColor: color + '15', borderWidth: 2, pointRadius: 2, tension: 0.2, fill: false }
  ]
  if (refLine != null) {
    datasets.push({ data: data.map(() => refLine), borderColor: 'rgba(220,38,38,0.4)', borderDash: [4, 4], borderWidth: 1.5, pointRadius: 0, tension: 0 })
  }

  const options = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: item => `${item.raw} ${unit}` } }, annotation: {} },
    scales: {
      x: { ticks: { font: { size: 10 }, maxTicksLimit: 5, maxRotation: 0 }, grid: { color: 'rgba(0,0,0,0.04)' } },
      y: { ticks: { font: { size: 10 } }, title: { display: true, text: unit, font: { size: 9 } }, grid: { color: 'rgba(0,0,0,0.04)' } }
    }
  }

  return (
    <div className="mini-chart-card">
      <div className="mini-chart-header">
        <span className="mini-chart-title">{title}</span>
        {latest != null && <span className="mini-chart-latest" style={{ color: latestColor || '#1e293b' }}>{latest}</span>}
      </div>
      <div className="mini-chart-wrapper">
        {labels.length > 0
          ? <Line data={{ labels, datasets }} options={options} />
          : <div className="mini-chart-empty">Ingen data</div>
        }
      </div>
    </div>
  )
}

function MiniBar({ data, labels, title, latest, latestColor }) {
  const colors = data.map(v => getScoreLabel(v).color)
  const options = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, annotation: {} },
    scales: {
      x: { ticks: { font: { size: 10 }, maxTicksLimit: 5, maxRotation: 0 }, grid: { color: 'rgba(0,0,0,0.04)' } },
      y: { min: 0, max: 100, ticks: { font: { size: 10 } }, grid: { color: 'rgba(0,0,0,0.04)' } }
    }
  }

  return (
    <div className="mini-chart-card">
      <div className="mini-chart-header">
        <span className="mini-chart-title">{title}</span>
        {latest != null && <span className="mini-chart-latest" style={{ color: latestColor || '#1e293b' }}>{latest}</span>}
      </div>
      <div className="mini-chart-wrapper">
        {labels.length > 0
          ? <Bar data={{ labels, datasets: [{ data, backgroundColor: colors.map(c => c + 'cc'), borderColor: colors, borderWidth: 1.5, borderRadius: 4 }] }} options={options} />
          : <div className="mini-chart-empty">Ingen data</div>
        }
      </div>
    </div>
  )
}

function CombinedGraph({ measurements, labs, weights, lifestyle, heightCm }) {
  const fromDate = daysAgo(90)
  const toDate = new Date().toISOString().slice(0, 10)
  const filteredMs = measurements.filter(m => m.date >= fromDate)
  const daily = getDailyAverages(filteredMs)
  const filled = fillDateGaps(daily, fromDate, toDate)
  const bpLabels = filled.map(d => dateLabel(d.date))
  const bpData = filled.map(d => d.avgSys)
  const latestSys = daily.length ? daily[daily.length - 1].avgSys : null

  const byDate = {}
  for (const lab of labs) {
    if (!byDate[lab.date]) byDate[lab.date] = {}
    byDate[lab.date][lab.type] = lab.value
  }
  const cholPoints = Object.entries(byDate).map(([date, vals]) => {
    let nonHdl = null
    if (vals.nonHdl != null) nonHdl = vals.nonHdl
    else if (vals.totalCholesterol != null && vals.hdl != null) nonHdl = parseFloat((vals.totalCholesterol - vals.hdl).toFixed(2))
    else if (vals.totalCholesterol != null) nonHdl = parseFloat((vals.totalCholesterol - 1.3).toFixed(2))
    return nonHdl != null ? { date, nonHdl } : null
  }).filter(Boolean).sort((a, b) => a.date.localeCompare(b.date))
  const latestNonHdl = cholPoints.length ? cholPoints[cholPoints.length - 1].nonHdl : null

  const sortedW = [...weights].sort((a, b) => a.date.localeCompare(b.date)).filter(w => w.date >= fromDate)
  const latestW = weights.length ? [...weights].sort((a, b) => b.date.localeCompare(a.date))[0] : null

  const sortedL = [...lifestyle].sort((a, b) => a.date.localeCompare(b.date))
  const latestL = sortedL.length ? sortedL[sortedL.length - 1] : null

  return (
    <div className="combined-charts">
      <MiniLine
        title="Systoliskt BT (90d)"
        data={bpData}
        labels={bpLabels}
        color="#1d4ed8"
        unit="mmHg"
        refLine={130}
        latest={latestSys ? `${latestSys} mmHg` : null}
        latestColor={latestSys > 140 ? '#dc2626' : latestSys > 130 ? '#ca8a04' : '#16a34a'}
      />
      <MiniLine
        title="Non-HDL-kolesterol"
        data={cholPoints.map(p => p.nonHdl)}
        labels={cholPoints.map(p => dateLabel(p.date, true))}
        color="#7c3aed"
        unit="mmol/L"
        refLine={3.4}
        latest={latestNonHdl ? `${latestNonHdl} mmol/L` : null}
        latestColor={latestNonHdl > 3.4 ? '#dc2626' : '#16a34a'}
      />
      <MiniLine
        title="Vikt (90d)"
        data={sortedW.map(w => w.weight)}
        labels={sortedW.map(w => dateLabel(w.date))}
        color="#0891b2"
        unit="kg"
        latest={latestW ? `${latestW.weight} kg` : null}
      />
      <MiniBar
        title="Levnadspoäng"
        data={sortedL.map(e => e.score)}
        labels={sortedL.map(e => dateLabel(e.date, true))}
        latest={latestL ? `${latestL.score}p` : null}
        latestColor={latestL ? getScoreLabel(latestL.score).color : null}
      />
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ icon, text }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <p>{text}</p>
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

// ── Main GraphView ────────────────────────────────────────────────────────────

export default function GraphView({ refreshKey }) {
  const [measurements, setMeasurements] = useState([])
  const [medications, setMedications] = useState([])
  const [labs, setLabs] = useState([])
  const [weights, setWeights] = useState([])
  const [lifestyle, setLifestyle] = useState([])
  const [gutEntries, setGutEntries] = useState([])
  const [heightCm, setHeightCm] = useState(null)
  const [subTab, setSubTab] = useState('bp')
  const [bpPeriod, setBpPeriod] = useState(1)

  useEffect(() => {
    async function load() {
      const [ms, meds, ls, ws, lf, gut, profile] = await Promise.all([
        getAllMeasurements(), getAllMedications(), getAllLabs(),
        getAllWeights(), getAllLifestyle(), getAllGutEntries(), getProfile('patientProfile')
      ])
      setMeasurements(ms.sort((a, b) => a.timestamp.localeCompare(b.timestamp)))
      setMedications(meds.sort((a, b) => a.startDate.localeCompare(b.startDate)))
      setLabs(ls)
      setWeights(ws)
      setLifestyle(lf)
      setGutEntries(gut)
      if (profile?.height) setHeightCm(parseFloat(profile.height))
    }
    load()
  }, [refreshKey])

  return (
    <div className="view-content" style={{ paddingTop: 0 }}>
      <div className="graph-subtab-scroll">
        {GRAPH_TABS.map(t => (
          <button
            key={t.id}
            className={`graph-subtab-btn ${subTab === t.id ? 'graph-subtab-active' : ''}`}
            onClick={() => setSubTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {subTab === 'bp' && (
        <BPGraph measurements={measurements} medications={medications} period={bpPeriod} setPeriod={setBpPeriod} />
      )}
      {subTab === 'cholesterol' && (
        <CholesterolGraph labs={labs} medications={medications} />
      )}
      {subTab === 'glucose' && (
        <GlucoseGraph labs={labs} medications={medications} />
      )}
      {subTab === 'weight' && (
        <WeightGraph weights={weights} heightCm={heightCm} medications={medications} />
      )}
      {subTab === 'lifestyle' && (
        <LifestyleGraph lifestyle={lifestyle} />
      )}
      {subTab === 'gut' && (
        <GutGraph gutEntries={gutEntries} />
      )}
      {subTab === 'combined' && (
        <CombinedGraph measurements={measurements} labs={labs} weights={weights} lifestyle={lifestyle} heightCm={heightCm} />
      )}
    </div>
  )
}
