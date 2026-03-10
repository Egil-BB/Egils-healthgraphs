import { useState, useEffect, useRef } from 'react'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Legend
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { addPainEntry, getAllPainEntries, deletePainEntry } from '../db/db'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

// ── Constants ─────────────────────────────────────────────────────────────────

const QUALITY_OPTIONS = [
  { id: 'aching',   label: 'Molande',     hint: 'Nociceptiv, inflammatorisk' },
  { id: 'burning',  label: 'Brännande',   hint: 'Neuropatisk smärta' },
  { id: 'stabbing', label: 'Huggande',    hint: 'Akut nociceptiv' },
  { id: 'throbbing',label: 'Dunkande',    hint: 'Vaskulärt, inflammation' },
  { id: 'cramping', label: 'Krampartad',  hint: 'Tarm, muskelspasm' },
  { id: 'pressure', label: 'Tryckande',   hint: 'Spänningshuvudvärk' },
]

const WORSENED_OPTIONS = [
  { id: 'movement',     label: 'Rörelse' },
  { id: 'sitting',      label: 'Stillasittande' },
  { id: 'stress',       label: 'Stress' },
  { id: 'sleep',        label: 'Sömnbrist' },
  { id: 'food',         label: 'Mat' },
  { id: 'unknown',      label: 'Okänt' },
]

const RELIEVED_OPTIONS = [
  { id: 'rest',          label: 'Vila' },
  { id: 'movement',      label: 'Rörelse' },
  { id: 'heat',          label: 'Värme' },
  { id: 'cold',          label: 'Kyla' },
  { id: 'medication',    label: 'Läkemedel' },
  { id: 'nothing',       label: 'Inget hjälper' },
]

const MEDS = [
  { id: 'paracetamol', label: 'Paracetamol', opioid: false },
  { id: 'ibuprofen',   label: 'Ibuprofen',   opioid: false },
  { id: 'naproxen',    label: 'Naproxen',    opioid: false },
  { id: 'diclofenac',  label: 'Diklofenak',  opioid: false },
  { id: 'tramadol',    label: 'Tramadol',    opioid: true },
  { id: 'codeine',     label: 'Kodein',      opioid: true },
]

// SVG body zones [id, label, svgPath or rect as [x,y,w,h], cx, cy]
const BODY_ZONES = [
  { id: 'headneck',   label: 'Huvud/nacke',    rect: [38, 2, 24, 28] },
  { id: 'chestL',     label: 'Bröst vänster',  rect: [22, 32, 18, 22] },
  { id: 'chestR',     label: 'Bröst höger',    rect: [60, 32, 18, 22] },
  { id: 'upperBack',  label: 'Övre rygg',       rect: [40, 32, 20, 22] },
  { id: 'abdomen',    label: 'Mage',            rect: [30, 56, 40, 20] },
  { id: 'lowerBack',  label: 'Nedre rygg',      rect: [38, 56, 24, 16] },
  { id: 'pelvis',     label: 'Bäcken/höft',     rect: [30, 74, 40, 14] },
  { id: 'shoulderL',  label: 'Vänster axel',    rect: [6,  30, 16, 12] },
  { id: 'shoulderR',  label: 'Höger axel',      rect: [78, 30, 16, 12] },
  { id: 'armL',       label: 'Vänster arm',     rect: [4,  44, 14, 30] },
  { id: 'armR',       label: 'Höger arm',       rect: [82, 44, 14, 30] },
  { id: 'legL',       label: 'Vänster ben',     rect: [26, 90, 18, 50] },
  { id: 'legR',       label: 'Höger ben',       rect: [56, 90, 18, 50] },
  { id: 'footL',      label: 'Vänster fot',     rect: [24, 142, 20, 10] },
  { id: 'footR',      label: 'Höger fot',       rect: [56, 142, 20, 10] },
]

const EMPTY_FORM = {
  nrs: 5,
  pegEnjoy: 5,
  pegActivity: 5,
  locations: [],
  quality: [],
  triggers: { worsenedBy: [], relievedBy: [] },
  medications: { paracetamol: 0, ibuprofen: 0, naproxen: 0, diclofenac: 0, tramadol: 0, codeine: 0, other: '' },
  notes: '',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function nrsColor(v) {
  if (v <= 3) return '#16a34a'
  if (v <= 6) return '#ca8a04'
  return '#dc2626'
}

function pegColor(v) {
  if (v <= 3) return '#16a34a'
  if (v <= 6) return '#ca8a04'
  return '#dc2626'
}

function computeWarnings(entries) {
  const warnings = []
  if (!entries.length) return warnings
  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date))
  const today = new Date().toISOString().slice(0, 10)

  // High NRS 3+ consecutive days
  const last7days = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    last7days.push(d.toISOString().slice(0, 10))
  }
  let consecutiveHighNrs = 0
  for (const day of last7days) {
    const dayEntries = entries.filter(e => e.date === day)
    if (dayEntries.length > 0 && Math.max(...dayEntries.map(e => e.nrs)) >= 7) {
      consecutiveHighNrs++
    } else {
      break
    }
  }
  if (consecutiveHighNrs >= 3) {
    warnings.push({ id: 'highNrs', level: 'warn', msg: 'Du har registrerat hög smärta flera dagar i rad. Om smärtan kvarstår kan det vara läge att kontakta din vårdcentral.' })
  }

  // Opioid ≥5 of last 7 days
  const opioidDays = new Set()
  for (const day of last7days) {
    const dayEntries = entries.filter(e => e.date === day)
    if (dayEntries.some(e => (e.medications?.tramadol > 0) || (e.medications?.codeine > 0))) {
      opioidDays.add(day)
    }
  }
  if (opioidDays.size >= 5) {
    warnings.push({ id: 'opioid', level: 'danger', msg: 'Du har tagit smärtstillande läkemedel många dagar i rad. Tala med din läkare om du behöver hjälp med smärtlindringen.' })
  }

  return warnings
}

function filterByRange(entries, range) {
  const today = new Date()
  let cutoff = null
  if (range === '7d') { cutoff = new Date(today); cutoff.setDate(cutoff.getDate() - 7) }
  else if (range === '30d') { cutoff = new Date(today); cutoff.setDate(cutoff.getDate() - 30) }
  else if (range === '3m') { cutoff = new Date(today); cutoff.setMonth(cutoff.getMonth() - 3) }
  if (!cutoff) return entries
  const cutStr = cutoff.toISOString().slice(0, 10)
  return entries.filter(e => e.date >= cutStr)
}

function buildHeatmapMonths(entries, months = 3) {
  const today = new Date()
  const result = []
  for (let m = months - 1; m >= 0; m--) {
    const d = new Date(today.getFullYear(), today.getMonth() - m, 1)
    const year = d.getFullYear()
    const month = d.getMonth()
    const label = d.toLocaleString('sv-SE', { month: 'long', year: 'numeric' })
    const firstDow = new Date(year, month, 1).getDay() // 0=sun
    const startPad = (firstDow + 6) % 7 // mon=0
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const days = []
    for (let i = 0; i < startPad; i++) days.push(null)
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const dayEntries = entries.filter(e => e.date === dateStr)
      const maxNrs = dayEntries.length ? Math.max(...dayEntries.map(e => e.nrs)) : null
      const hasMeds = dayEntries.some(e => {
        const m = e.medications || {}
        return MEDS.some(med => m[med.id] > 0) || (m.other && m.other.trim())
      })
      days.push({ date: dateStr, maxNrs, hasMeds, entries: dayEntries })
    }
    result.push({ label, days })
  }
  return result
}

function nrsHeatColor(nrs) {
  if (nrs === null) return '#EEEEEE'
  if (nrs <= 3) return '#A5D6A7'
  if (nrs <= 6) return '#FFF176'
  if (nrs <= 8) return '#FFAB40'
  return '#EF5350'
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SliderField({ label, value, onChange, minLabel, maxLabel }) {
  const color = nrsColor(value)
  return (
    <div className="pain-slider-field">
      <div className="pain-slider-label">{label}</div>
      <div className="pain-slider-value" style={{ color }}>{value}</div>
      <input
        type="range" min={0} max={10} step={1} value={value}
        className="pain-slider"
        style={{ '--slider-color': color }}
        onChange={e => onChange(Number(e.target.value))}
      />
      <div className="pain-slider-anchors">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  )
}

function BodyMap({ selected, onChange }) {
  const toggle = (id) => {
    onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id])
  }
  const selectedLabels = BODY_ZONES.filter(z => selected.includes(z.id)).map(z => z.label)

  return (
    <div className="pain-bodymap">
      <svg viewBox="0 0 100 155" className="pain-body-svg" xmlns="http://www.w3.org/2000/svg">
        {/* Simple body outline */}
        <ellipse cx="50" cy="14" rx="11" ry="13" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="0.5" />
        <rect x="22" y="30" width="56" height="48" rx="4" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="0.5" />
        <rect x="4" y="30" width="18" height="44" rx="3" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="0.5" />
        <rect x="78" y="30" width="18" height="44" rx="3" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="0.5" />
        <rect x="24" y="78" width="22" height="66" rx="3" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="0.5" />
        <rect x="54" y="78" width="22" height="66" rx="3" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="0.5" />

        {/* Clickable zones */}
        {BODY_ZONES.map(zone => {
          const [x, y, w, h] = zone.rect
          const active = selected.includes(zone.id)
          return (
            <rect
              key={zone.id}
              x={x} y={y} width={w} height={h}
              rx={2}
              fill={active ? '#ef444480' : 'transparent'}
              stroke={active ? '#dc2626' : 'transparent'}
              strokeWidth={active ? 1 : 0}
              style={{ cursor: 'pointer' }}
              onClick={() => toggle(zone.id)}
            >
              <title>{zone.label}</title>
            </rect>
          )
        })}
      </svg>
      <div className="pain-bodymap-selected">
        {selectedLabels.length > 0
          ? `Valt: ${selectedLabels.join(', ')}`
          : 'Tryck på kroppen för att markera smärtområden'}
      </div>
    </div>
  )
}

function ChipGroup({ options, selected, onChange, multi = true }) {
  const toggle = (id) => {
    if (!multi) {
      onChange([id])
    } else {
      onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id])
    }
  }
  return (
    <div className="pain-chips">
      {options.map(opt => (
        <button
          key={opt.id}
          type="button"
          className={`pain-chip ${selected.includes(opt.id) ? 'pain-chip-active' : ''}`}
          onClick={() => toggle(opt.id)}
          title={opt.hint || ''}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function MedCounter({ meds, onChange }) {
  const increment = (id) => onChange({ ...meds, [id]: (meds[id] || 0) + 1 })
  const decrement = (id) => onChange({ ...meds, [id]: Math.max(0, (meds[id] || 0) - 1) })

  return (
    <div className="pain-meds">
      {MEDS.map(med => (
        <div key={med.id} className={`pain-med-row ${med.opioid ? 'pain-med-opioid' : ''}`}>
          <span className="pain-med-label">{med.label}{med.opioid ? ' ⚠' : ''}</span>
          <div className="pain-med-controls">
            <button type="button" onClick={() => decrement(med.id)} className="pain-med-btn">−</button>
            <span className="pain-med-count">{meds[med.id] || 0}</span>
            <button type="button" onClick={() => increment(med.id)} className="pain-med-btn">+</button>
          </div>
        </div>
      ))}
      <div className="pain-med-row">
        <span className="pain-med-label">Annat</span>
        <input
          type="text"
          maxLength={40}
          placeholder="Fritext..."
          value={meds.other || ''}
          onChange={e => onChange({ ...meds, other: e.target.value })}
          className="pain-med-other"
        />
      </div>
    </div>
  )
}

// ── Wizard ────────────────────────────────────────────────────────────────────

function PainWizard({ onSave, onClose }) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({ nrs: 5, pegEnjoy: 5, pegActivity: 5, locations: [] })
  const pegScore = ((form.nrs + form.pegEnjoy + form.pegActivity) / 3).toFixed(1)
  const today = new Date().toISOString().slice(0, 10)
  const time = new Date().toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })

  async function handleSave() {
    const id = `pain_${Date.now()}`
    await addPainEntry({
      id, date: today, time,
      nrs: form.nrs, pegEnjoy: form.pegEnjoy, pegActivity: form.pegActivity,
      pegScore: parseFloat(pegScore),
      locations: form.locations,
    })
    onSave()
  }

  return (
    <div className="pain-wizard-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="pain-wizard">
        <div className="pain-wizard-progress">
          {[1, 2].map(s => (
            <div key={s} className={`pain-prog-dot ${step >= s ? 'active' : ''}`} />
          ))}
        </div>
        <button className="pain-wizard-close" onClick={onClose}>✕</button>

        {step === 1 && (
          <div className="pain-wizard-step">
            <h3 className="pain-step-title">Steg 1 av 2 — Intensitet &amp; påverkan</h3>
            <SliderField
              label="Hur ont gör det just nu?"
              value={form.nrs}
              onChange={v => setForm(f => ({ ...f, nrs: v }))}
              minLabel="0 = Ingen smärta"
              maxLabel="10 = Värsta tänkbara"
            />
            <SliderField
              label="Hur mycket stör smärtan din livsglädje?"
              value={form.pegEnjoy}
              onChange={v => setForm(f => ({ ...f, pegEnjoy: v }))}
              minLabel="0 = Ingen påverkan"
              maxLabel="10 = Förstör helt"
            />
            <SliderField
              label="Hur mycket stör smärtan dina dagliga aktiviteter?"
              value={form.pegActivity}
              onChange={v => setForm(f => ({ ...f, pegActivity: v }))}
              minLabel="0 = Ingen påverkan"
              maxLabel="10 = Klarar ingenting"
            />
          </div>
        )}

        {step === 2 && (
          <div className="pain-wizard-step">
            <h3 className="pain-step-title">Steg 2 av 2 — Lokalisering (valfritt)</h3>
            <BodyMap
              selected={form.locations}
              onChange={locs => setForm(f => ({ ...f, locations: locs }))}
            />
          </div>
        )}

        <div className="pain-wizard-nav">
          {step > 1 && (
            <button type="button" className="btn-secondary" onClick={() => setStep(s => s - 1)}>← Tillbaka</button>
          )}
          {step === 1 && (
            <button type="button" className="btn-primary" onClick={() => setStep(2)}>Nästa →</button>
          )}
          {step === 2 && (
            <button type="button" className="btn-primary" onClick={handleSave}>Spara</button>
          )}
        </div>
        {step === 2 && (
          <button type="button" className="pain-skip" onClick={handleSave}>Hoppa över &amp; spara</button>
        )}
      </div>
    </div>
  )
}

// ── PRN medication modal ──────────────────────────────────────────────────────

function PrnModal({ onSave, onClose }) {
  const [meds, setMeds] = useState({ paracetamol: 0, ibuprofen: 0, naproxen: 0, diclofenac: 0, tramadol: 0, codeine: 0, other: '' })
  const today = new Date().toISOString().slice(0, 10)
  const time = new Date().toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })
  const hasAny = MEDS.some(m => meds[m.id] > 0) || (meds.other && meds.other.trim())

  async function handleSave() {
    const id = `pain_${Date.now()}`
    await addPainEntry({
      id, date: today, time,
      nrs: null, pegEnjoy: null, pegActivity: null, pegScore: null,
      locations: [],
      medications: { ...meds },
    })
    onSave()
  }

  return (
    <div className="pain-wizard-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="pain-wizard">
        <button className="pain-wizard-close" onClick={onClose}>✕</button>
        <h3 className="pain-step-title">💊 Behovsmedicin tagen</h3>
        <MedCounter meds={meds} onChange={setMeds} />
        <div className="pain-wizard-nav">
          <button type="button" className="btn-secondary" onClick={onClose}>Avbryt</button>
          <button type="button" className="btn-primary" disabled={!hasAny} onClick={handleSave}>Spara</button>
        </div>
      </div>
    </div>
  )
}

// ── Timeline chart ────────────────────────────────────────────────────────────

function TimelineChart({ entries, range }) {
  const filtered = filterByRange(entries, range)
  if (!filtered.length) return (
    <p className="pain-empty">Inga smärtregistreringar i valt tidsintervall.</p>
  )

  // Group by date: take max NRS and avg PEG per day (skip PRN-only entries with null nrs)
  const byDate = {}
  for (const e of filtered) {
    if (!byDate[e.date]) byDate[e.date] = []
    byDate[e.date].push(e)
  }
  const allDates = Object.keys(byDate).sort()
  // Only show dates that have at least one entry with a real NRS score
  const dates = allDates.filter(d => byDate[d].some(e => e.nrs !== null && e.nrs !== undefined))
  const nrsData = dates.map(d => Math.max(...byDate[d].filter(e => e.nrs != null).map(e => e.nrs)))
  const pegData = dates.map(d => {
    const arr = byDate[d].filter(e => e.pegScore != null)
    if (!arr.length) return null
    return Math.round(arr.reduce((s, e) => s + e.pegScore, 0) / arr.length * 10) / 10
  })
  const medDates = dates.filter(d => byDate[d].some(e => {
    const m = e.medications || {}
    return MEDS.some(med => m[med.id] > 0) || (m.other && m.other.trim())
  }))

  const data = {
    labels: dates.map(d => d.slice(5)),
    datasets: [
      {
        label: 'NRS (intensitet)',
        data: nrsData,
        borderColor: '#ef4444',
        backgroundColor: '#ef444420',
        borderWidth: 2.5,
        tension: 0.3,
        pointRadius: 4,
      },
      {
        label: 'PEG (medelvärde)',
        data: pegData,
        borderColor: '#0ea5e9',
        backgroundColor: '#0ea5e920',
        borderWidth: 1.5,
        borderDash: [5, 3],
        tension: 0.3,
        pointRadius: 3,
      }
    ]
  }

  const options = {
    responsive: true,
    plugins: {
      legend: { position: 'top', labels: { font: { size: 12 } } },
      tooltip: {
        callbacks: {
          afterBody: (items) => {
            const date = dates[items[0]?.dataIndex]
            if (date && medDates.includes(date)) return ['💊 Läkemedel taget']
            return []
          }
        }
      }
    },
    scales: {
      y: { min: 0, max: 10, grid: { color: '#f0f0f0' } },
      x: { grid: { color: '#f0f0f0' } }
    }
  }

  return (
    <div className="pain-chart-wrap">
      <Line data={data} options={options} />
      {medDates.length > 0 && (
        <div className="pain-med-dates">
          💊 Läkemedel: {medDates.map(d => d.slice(5)).join(', ')}
        </div>
      )}
    </div>
  )
}

// ── Heatmap ───────────────────────────────────────────────────────────────────

function HeatmapCalendar({ entries }) {
  const [popup, setPopup] = useState(null)
  const months = buildHeatmapMonths(entries, 3)
  const DOW_LABELS = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön']

  return (
    <div className="pain-heatmap">
      <div className="pain-heatmap-legend">
        {[null, 2, 5, 7, 9].map((v, i) => (
          <span key={i} className="pain-legend-item">
            <span className="pain-legend-swatch" style={{ background: nrsHeatColor(v) }} />
            <span>{v === null ? 'Ingen' : v <= 3 ? '1–3' : v <= 6 ? '4–6' : v <= 8 ? '7–8' : '9–10'}</span>
          </span>
        ))}
      </div>
      {months.map((mo, mi) => (
        <div key={mi} className="pain-month">
          <div className="pain-month-label">{mo.label}</div>
          <div className="pain-month-grid">
            {DOW_LABELS.map(l => (
              <div key={l} className="pain-dow-label">{l}</div>
            ))}
            {mo.days.map((day, di) => (
              day === null
                ? <div key={`pad-${di}`} className="pain-day pain-day-empty" />
                : (
                  <div
                    key={day.date}
                    className="pain-day"
                    style={{ background: nrsHeatColor(day.maxNrs), cursor: day.entries.length ? 'pointer' : 'default' }}
                    onClick={() => day.entries.length && setPopup(day)}
                    title={day.maxNrs !== null ? `NRS ${day.maxNrs}` : ''}
                  >
                    {day.hasMeds && <span className="pain-day-dot" />}
                  </div>
                )
            ))}
          </div>
        </div>
      ))}
      {popup && (
        <div className="pain-popup-overlay" onClick={() => setPopup(null)}>
          <div className="pain-popup" onClick={e => e.stopPropagation()}>
            <button className="pain-popup-close" onClick={() => setPopup(null)}>✕</button>
            <div className="pain-popup-date">{popup.date}</div>
            {popup.entries.map((e, i) => (
              <div key={i} className="pain-popup-entry">
                <span className="pain-popup-time">{e.time}</span>
                <span style={{ color: nrsColor(e.nrs) }}>NRS {e.nrs}</span>
                <span style={{ color: pegColor(e.pegScore) }}>PEG {e.pegScore}</span>
                {e.locations?.length > 0 && (
                  <span>{BODY_ZONES.filter(z => e.locations.includes(z.id)).map(z => z.label).join(', ')}</span>
                )}
              </div>
            ))}
            <button className="btn-secondary" style={{ marginTop: 8 }} onClick={() => setPopup(null)}>Stäng</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main view ─────────────────────────────────────────────────────────────────

export default function PainView({ onDataChange }) {
  const [entries, setEntries] = useState([])
  const [wizardOpen, setWizardOpen] = useState(false)
  const [prnOpen, setPrnOpen] = useState(false)
  const [chartView, setChartView] = useState('timeline')
  const [timeRange, setTimeRange] = useState('30d')
  const [warnings, setWarnings] = useState([])
  const [dismissedWarnings, setDismissedWarnings] = useState([])

  async function load() {
    const all = await getAllPainEntries()
    const sorted = [...all].sort((a, b) => a.date.localeCompare(b.date) || a.time?.localeCompare(b.time || ''))
    setEntries(sorted)
    setWarnings(computeWarnings(sorted))
  }

  useEffect(() => { load() }, [])

  async function handleDelete(id) {
    await deletePainEntry(id)
    load()
    onDataChange?.()
  }

  function handleSaved() {
    setWizardOpen(false)
    load()
    onDataChange?.()
  }

  const activeWarnings = warnings.filter(w => !dismissedWarnings.includes(w.id))
  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date) || (b.time || '').localeCompare(a.time || ''))

  return (
    <div className="view-content">
      <div className="card">
        <h2 className="card-title">🩻 Smärtdagbok</h2>
        <p className="card-desc" style={{ fontSize: 13, marginBottom: 12 }}>
          Registrera smärta med NRS-skala och PEG (intensitet + påverkan på aktivitet och livsglädje). Visualiseras som tidslinje och värmekarta.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn-primary pain-add-btn" onClick={() => setWizardOpen(true)}>
            + Registrera smärta
          </button>
          <button className="btn-secondary" onClick={() => setPrnOpen(true)}>
            💊 Behovsmedicin
          </button>
        </div>
      </div>

      {/* Warnings */}
      {activeWarnings.map(w => (
        <div key={w.id} className={`card pain-warning pain-warning-${w.level}`}>
          <p className="pain-warning-msg">{w.msg}</p>
          <button className="pain-warning-dismiss" onClick={() => setDismissedWarnings(d => [...d, w.id])}>
            Stäng
          </button>
        </div>
      ))}

      {entries.length === 0 && (
        <div className="card">
          <p className="pain-empty">Inga smärtregistreringar ännu. Tryck på + ovan för att börja.</p>
        </div>
      )}

      {entries.length > 0 && (
        <div className="card">
          <div className="pain-chart-tabs">
            <button
              className={`pain-tab-btn ${chartView === 'timeline' ? 'active' : ''}`}
              onClick={() => setChartView('timeline')}
            >Tidslinje</button>
            <button
              className={`pain-tab-btn ${chartView === 'heatmap' ? 'active' : ''}`}
              onClick={() => setChartView('heatmap')}
            >Värmekarta</button>
          </div>

          {chartView === 'timeline' && (
            <>
              <div className="pain-range-btns">
                {['7d', '30d', '3m', 'all'].map(r => (
                  <button
                    key={r}
                    className={`pain-range-btn ${timeRange === r ? 'active' : ''}`}
                    onClick={() => setTimeRange(r)}
                  >
                    {r === '7d' ? '7 dagar' : r === '30d' ? '30 dagar' : r === '3m' ? '3 mån' : 'Allt'}
                  </button>
                ))}
              </div>
              <TimelineChart entries={entries} range={timeRange} />
            </>
          )}

          {chartView === 'heatmap' && (
            <HeatmapCalendar entries={entries} />
          )}
        </div>
      )}

      {/* History */}
      {sorted.length > 0 && (
        <div className="card">
          <h3 className="card-title">Historik</h3>
          {sorted.map(e => {
            const locLabels = BODY_ZONES.filter(z => e.locations?.includes(z.id)).map(z => z.label)
            const medList = MEDS.filter(m => e.medications?.[m.id] > 0).map(m => `${m.label} ×${e.medications[m.id]}`)
            if (e.medications?.other) medList.push(e.medications.other)
            return (
              <div key={e.id} className="pain-history-item">
                <div className="pain-history-header">
                  <span className="pain-history-date">{e.date} {e.time}</span>
                  <button className="delete-btn" onClick={() => handleDelete(e.id)}>✕</button>
                </div>
                <div className="pain-history-vals">
                  {e.nrs != null && <span style={{ color: nrsColor(e.nrs) }} className="pain-hist-nrs">NRS {e.nrs}</span>}
                  {e.pegScore != null && <span style={{ color: pegColor(e.pegScore) }} className="pain-hist-peg">PEG {e.pegScore}</span>}
                  {e.nrs == null && <span className="pain-hist-prn">💊 Behovsmedicin</span>}
                </div>
                {locLabels.length > 0 && <div className="pain-history-locs">📍 {locLabels.join(', ')}</div>}
                {e.quality?.length > 0 && (
                  <div className="pain-history-quality">
                    {e.quality.map(q => QUALITY_OPTIONS.find(o => o.id === q)?.label).filter(Boolean).join(' · ')}
                  </div>
                )}
                {medList.length > 0 && <div className="pain-history-meds">💊 {medList.join(', ')}</div>}
                {e.notes && <div className="pain-history-notes">{e.notes}</div>}
              </div>
            )
          })}
        </div>
      )}

      {wizardOpen && (
        <PainWizard onSave={handleSaved} onClose={() => setWizardOpen(false)} />
      )}
      {prnOpen && (
        <PrnModal onSave={() => { setPrnOpen(false); load(); onDataChange?.() }} onClose={() => setPrnOpen(false)} />
      )}
    </div>
  )
}
