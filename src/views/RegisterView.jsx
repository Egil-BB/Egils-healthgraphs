import { useState, useEffect, useCallback } from 'react'
import { addMeasurement, getAllMeasurements, deleteMeasurement } from '../db/db'
import {
  classifyBP, getBPColor, getBPBg,
  getTrendFeedback, getTodaySummary,
  formatTimeSv, TIME_OF_DAY_LABELS
} from '../utils/bp'

export default function RegisterView({ onDataChange }) {
  const [sys, setSys] = useState('')
  const [dia, setDia] = useState('')
  const [pulse, setPulse] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [measurements, setMeasurements] = useState([])
  const [showNote, setShowNote] = useState(false)

  const load = useCallback(async () => {
    const all = await getAllMeasurements()
    setMeasurements(all.sort((a, b) => b.timestamp.localeCompare(a.timestamp)))
  }, [])

  useEffect(() => { load() }, [load])

  async function handleSave(e) {
    e.preventDefault()
    const s = parseInt(sys), d = parseInt(dia)
    if (!s || !d || s < 50 || s > 300 || d < 30 || d > 200) return
    setSaving(true)
    await addMeasurement({
      sys: s,
      dia: d,
      pulse: pulse ? parseInt(pulse) : null,
      note: note.trim() || null
    })
    setSys(''); setDia(''); setPulse(''); setNote(''); setShowNote(false)
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    await load()
    onDataChange?.()
  }

  async function handleDelete(id) {
    if (!confirm('Ta bort denna mätning?')) return
    await deleteMeasurement(id)
    await load()
    onDataChange?.()
  }

  const allMs = [...measurements].sort((a, b) => a.timestamp.localeCompare(b.timestamp))
  const trend = getTrendFeedback(allMs)
  const today = getTodaySummary(allMs)
  const lastBP = allMs.length > 0 ? allMs[allMs.length - 1] : null

  const todayMs = measurements.filter(m => m.date === new Date().toISOString().slice(0, 10))

  return (
    <div className="view-content">
      {/* Quick input form */}
      <div className="card register-card">
        <h2 className="card-title">Registrera blodtryck</h2>
        <form onSubmit={handleSave} autoComplete="off">
          <div className="bp-inputs">
            <div className="bp-input-group">
              <label>SYS</label>
              <input
                type="number"
                inputMode="numeric"
                value={sys}
                onChange={e => setSys(e.target.value)}
                placeholder="120"
                min="50" max="300"
                required
                className="bp-input"
                autoFocus
              />
              <span className="bp-unit">mmHg</span>
            </div>
            <div className="bp-divider">/</div>
            <div className="bp-input-group">
              <label>DIA</label>
              <input
                type="number"
                inputMode="numeric"
                value={dia}
                onChange={e => setDia(e.target.value)}
                placeholder="80"
                min="30" max="200"
                required
                className="bp-input"
              />
              <span className="bp-unit">mmHg</span>
            </div>
            <div className="bp-divider pulse-divider">♥</div>
            <div className="bp-input-group">
              <label>Puls</label>
              <input
                type="number"
                inputMode="numeric"
                value={pulse}
                onChange={e => setPulse(e.target.value)}
                placeholder="70"
                min="30" max="220"
                className="bp-input pulse-input"
              />
            </div>
          </div>

          {sys && dia && parseInt(sys) > 50 && parseInt(dia) > 30 && (
            <div
              className="bp-preview"
              style={{ background: getBPBg(parseInt(sys), parseInt(dia)), borderColor: getBPColor(parseInt(sys), parseInt(dia)) }}
            >
              <span style={{ color: getBPColor(parseInt(sys), parseInt(dia)) }}>
                {classifyBP(parseInt(sys), parseInt(dia)).label}
              </span>
            </div>
          )}

          {showNote ? (
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Anteckning (valfri)..."
              className="note-input"
              rows={2}
            />
          ) : (
            <button type="button" className="btn-link" onClick={() => setShowNote(true)}>
              + Lägg till anteckning
            </button>
          )}

          <button type="submit" className={`btn-save ${saved ? 'btn-saved' : ''}`} disabled={saving}>
            {saved ? '✓ Sparat!' : saving ? 'Sparar...' : 'Spara'}
          </button>
        </form>
      </div>

      {/* Trend feedback */}
      {trend && (
        <div className="card trend-card">
          <h3 className="card-title">Trend (14 dagar)</h3>
          <div className="trend-main" style={{ color: trend.category.color }}>
            {trend.recentAvgSys}/{trend.recentAvgDia} mmHg
            <span className="trend-label" style={{ background: trend.category.bg, color: trend.category.color }}>
              {trend.category.label}
            </span>
          </div>
          {trend.trend && (
            <p className="trend-diff">
              {trend.trend.sysDiff < 0
                ? `↓ ${Math.abs(trend.trend.sysDiff)} mmHg lägre än förra perioden`
                : trend.trend.sysDiff > 0
                ? `↑ ${trend.trend.sysDiff} mmHg högre än förra perioden`
                : 'Oförändrat jämfört med förra perioden'}
            </p>
          )}
          {trend.lastTenCount >= 3 && (
            <div className="trend-stats">
              <div className="trend-stat">
                <span className="trend-stat-n" style={{ color: '#16a34a' }}>{trend.underTarget130}</span>
                <span>/10 under 130/80</span>
              </div>
              <div className="trend-stat">
                <span className="trend-stat-n" style={{ color: '#65a30d' }}>{trend.underTarget135}</span>
                <span>/10 under 135/85</span>
              </div>
              <div className="trend-stat">
                <span className="trend-stat-n" style={{ color: '#ca8a04' }}>{trend.underTarget140}</span>
                <span>/10 under 140/90</span>
              </div>
            </div>
          )}
          <p className="trend-count">Baserat på {trend.recentCount} mätning{trend.recentCount !== 1 ? 'ar' : ''} de senaste 14 dagarna</p>
        </div>
      )}

      {/* Today's measurements */}
      {todayMs.length > 0 && (
        <div className="card">
          <h3 className="card-title">
            Idag
            {today && today.count >= 2 && (
              <span className="card-title-sub"> – snitt {today.avgSys}/{today.avgDia}</span>
            )}
          </h3>
          <div className="measurements-list">
            {todayMs.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).map(m => (
              <MeasurementRow key={m.id} m={m} onDelete={handleDelete} />
            ))}
          </div>
        </div>
      )}

      {/* Recent history */}
      {measurements.length > todayMs.length && (
        <div className="card">
          <h3 className="card-title">Senaste mätningar</h3>
          <div className="measurements-list">
            {measurements
              .filter(m => m.date !== new Date().toISOString().slice(0, 10))
              .slice(0, 10)
              .map(m => (
                <MeasurementRow key={m.id} m={m} onDelete={handleDelete} />
              ))}
          </div>
          {measurements.length > 10 + todayMs.length && (
            <p className="subtle-text">+ {measurements.length - 10 - todayMs.length} äldre mätningar (se grafen)</p>
          )}
        </div>
      )}

      {measurements.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">💓</div>
          <p>Inga mätningar än.<br />Registrera din första mätning ovan!</p>
        </div>
      )}
    </div>
  )
}

function MeasurementRow({ m, onDelete }) {
  const color = getBPColor(m.sys, m.dia)
  const bg = getBPBg(m.sys, m.dia)
  return (
    <div className="measurement-row">
      <div className="measurement-bp" style={{ color }}>
        {m.sys}/{m.dia}
      </div>
      <div className="measurement-meta">
        <span className="measurement-time">{formatTimeSv(m.timestamp)}</span>
        <span className="measurement-tod">{TIME_OF_DAY_LABELS[m.timeOfDay]}</span>
        {m.pulse && <span className="measurement-pulse">♥ {m.pulse}</span>}
        {m.note && <span className="measurement-note">📝 {m.note}</span>}
      </div>
      <span
        className="measurement-cat"
        style={{ background: bg, color }}
      >
        {classifyBP(m.sys, m.dia).label}
      </span>
      <button className="btn-delete" onClick={() => onDelete(m.id)} title="Ta bort">×</button>
    </div>
  )
}
