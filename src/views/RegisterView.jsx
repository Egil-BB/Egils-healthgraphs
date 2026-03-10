import { useState, useEffect, useCallback } from 'react'
import { addMeasurement, getAllMeasurements, deleteMeasurement } from '../db/db'
import {
  classifyBP, getBPColor, getBPBg, isCrisisBP,
  getTrendFeedback, getTodaySummary,
  formatTimeSv, TIME_OF_DAY_LABELS, daysAgo
} from '../utils/bp'

function getPeriodAvg(measurements, days) {
  const from = daysAgo(days)
  const recent = measurements.filter(m => m.date >= from)
  if (recent.length < 2) return null
  const avgSys = Math.round(recent.reduce((s, m) => s + m.sys, 0) / recent.length)
  const avgDia = Math.round(recent.reduce((s, m) => s + m.dia, 0) / recent.length)
  return { sys: avgSys, dia: avgDia, count: recent.length }
}

export default function RegisterView({ onDataChange, refreshKey }) {
  const [measurements, setMeasurements] = useState([])
  const [defaultAvg, setDefaultAvg] = useState(null)
  const [sys, setSys] = useState(120)
  const [dia, setDia] = useState(80)
  const [pulse, setPulse] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showNote, setShowNote] = useState(false)
  const [useCustomTime, setUseCustomTime] = useState(false)
  const [customDate, setCustomDate] = useState(new Date().toISOString().slice(0, 10))
  const [customTime, setCustomTime] = useState(() => {
    const now = new Date()
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  })

  const load = useCallback(async () => {
    const all = await getAllMeasurements()
    const sorted = all.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    setMeasurements(sorted)
    const avg = getPeriodAvg(sorted, 14)
    if (avg) {
      setDefaultAvg(avg)
      setSys(avg.sys)
      setDia(avg.dia)
    } else {
      setDefaultAvg(null)
      setSys(120)
      setDia(80)
    }
  }, [])

  useEffect(() => { load() }, [load, refreshKey])

  async function handleSave(e) {
    e.preventDefault()
    if (!sys || !dia || sys < 50 || sys > 300 || dia < 30 || dia > 200) return
    setSaving(true)
    const customDateTime = useCustomTime ? `${customDate}T${customTime}:00` : undefined
    await addMeasurement({
      sys: Number(sys),
      dia: Number(dia),
      pulse: pulse ? parseInt(pulse) : null,
      note: note.trim() || null,
      customDateTime,
    })
    setPulse(''); setNote(''); setShowNote(false)
    setUseCustomTime(false)
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
  const todayMs = measurements.filter(m => m.date === new Date().toISOString().slice(0, 10))
  const avg14 = getPeriodAvg(measurements, 14)
  const avg30 = getPeriodAvg(measurements, 30)

  const category = classifyBP(Number(sys), Number(dia))
  const bpColor = getBPColor(Number(sys), Number(dia))
  const bpBg = getBPBg(Number(sys), Number(dia))
  const crisis = isCrisisBP(Number(sys), Number(dia))

  const showMeasureTip = trend && trend.recentAvgSys < 130 && trend.recentAvgDia < 80

  const sysFill = `${((sys - 70) / 150) * 100}%`
  const diaFill = `${((dia - 40) / 100) * 100}%`

  return (
    <div className="view-content">
      <div className="card register-card">
        <h2 className="card-title">Registrera blodtryck</h2>
        <form onSubmit={handleSave} autoComplete="off">
          <div className="slider-section">
            {/* SYS slider */}
            <div className="slider-group">
              <div className="slider-label-row">
                <label className="slider-lbl">Systoliskt (övre)</label>
                <span className="slider-val" style={{ color: bpColor }}>{sys} <span className="slider-unit-sm">mmHg</span></span>
              </div>
              <div className="slider-track-wrap">
                <div className="slider-track-fill" style={{ width: sysFill, background: bpColor }} />
                <input
                  type="range" min="70" max="220" step="1"
                  value={sys}
                  onChange={e => setSys(Number(e.target.value))}
                  className="bp-slider"
                />
              </div>
              <div className="slider-ticks"><span>70</span><span>100</span><span>130</span><span>160</span><span>190</span><span>220</span></div>
            </div>

            {/* DIA slider */}
            <div className="slider-group">
              <div className="slider-label-row">
                <label className="slider-lbl">Diastoliskt (undre)</label>
                <span className="slider-val" style={{ color: bpColor }}>{dia} <span className="slider-unit-sm">mmHg</span></span>
              </div>
              <div className="slider-track-wrap">
                <div className="slider-track-fill" style={{ width: diaFill, background: bpColor }} />
                <input
                  type="range" min="40" max="140" step="1"
                  value={dia}
                  onChange={e => setDia(Number(e.target.value))}
                  className="bp-slider"
                />
              </div>
              <div className="slider-ticks"><span>40</span><span>60</span><span>80</span><span>100</span><span>120</span><span>140</span></div>
            </div>

            {defaultAvg && (
              <p className="slider-hint">Startläge: 14-dagarssnitt {defaultAvg.sys}/{defaultAvg.dia}. Dra till uppmätt värde.</p>
            )}
          </div>

          {/* BP classification */}
          <div className="bp-preview" style={{ background: bpBg, borderColor: bpColor }}>
            <span className="bp-preview-value" style={{ color: bpColor }}>{sys}/{dia} mmHg</span>
            <span className="bp-preview-label" style={{ color: bpColor }}>{category.label}</span>
          </div>

          {/* Crisis warning */}
          {crisis && (
            <div className="crisis-warning">
              ⚠️ <strong>Mycket högt tryck – ta om mätningen!</strong>
              <br/>Vila 5 minuter och mät igen. Om trycket kvarstår ≥180/110 mmHg — kontakta vården snarast.
            </div>
          )}

          {/* Pulse – optional */}
          <div className="pulse-opt-row">
            <label className="pulse-opt-label">
              Puls <span className="optional-tag">valfri</span>
            </label>
            <div className="pulse-opt-right">
              <input
                type="number"
                inputMode="numeric"
                value={pulse}
                onChange={e => setPulse(e.target.value)}
                placeholder="70"
                min="30" max="220"
                className="pulse-input-sm"
              />
              <span className="pulse-unit-sm">slag/min</span>
            </div>
          </div>

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

          {/* Optional custom date/time for historical entry */}
          {!useCustomTime ? (
            <button type="button" className="btn-link" onClick={() => setUseCustomTime(true)}>
              🕐 Ange annan tid (historisk mätning)
            </button>
          ) : (
            <div className="custom-time-row">
              <label className="custom-time-label">Datum & tid</label>
              <input type="date" value={customDate}
                onChange={e => setCustomDate(e.target.value)}
                className="form-input custom-time-input" />
              <input type="time" value={customTime}
                onChange={e => setCustomTime(e.target.value)}
                className="form-input custom-time-input" />
              <button type="button" className="btn-link" onClick={() => setUseCustomTime(false)}>
                Avbryt
              </button>
            </div>
          )}

          <button type="submit" className={`btn-save ${saved ? 'btn-saved' : ''}`} disabled={saving}>
            {saved ? '✓ Sparat!' : saving ? 'Sparar...' : 'Spara mätning'}
          </button>
        </form>
      </div>

      {/* Measurement frequency tip */}
      {showMeasureTip && (
        <div className="measure-tip-card">
          <span className="measure-tip-icon">✅</span>
          <div className="measure-tip-text">
            <strong>Bra nivåer!</strong> När trycket är stabilt räcker det med 1–2 mätningar per månad (morgon + kväll).
            Mät tätare de sista veckorna inför årskontrollen.
          </div>
        </div>
      )}

      {/* Averages summary card */}
      {(today || avg14 || avg30) && (
        <div className="card avg-summary-card">
          <h3 className="card-title">Medelvärden</h3>

          {/* Today – largest */}
          {today ? (
            <div className="avg-row avg-row-today">
              <div className="avg-period">Idag</div>
              <div className="avg-value" style={{ color: classifyBP(today.avgSys, today.avgDia).color }}>
                {today.avgSys}/{today.avgDia}
                <span className="avg-unit"> mmHg</span>
              </div>
              <span className="avg-cat" style={{
                background: classifyBP(today.avgSys, today.avgDia).bg,
                color: classifyBP(today.avgSys, today.avgDia).color
              }}>
                {classifyBP(today.avgSys, today.avgDia).label}
              </span>
              <span className="avg-count">{today.count} mätning{today.count !== 1 ? 'ar' : ''}</span>
            </div>
          ) : (
            <div className="avg-row avg-row-today avg-row-empty">
              <div className="avg-period">Idag</div>
              <div className="avg-value avg-no-data">–</div>
              <span className="avg-count">Ingen mätning idag</span>
            </div>
          )}

          {/* 14-day */}
          {avg14 && (
            <div className="avg-row avg-row-14">
              <div className="avg-period">14 dagar</div>
              <div className="avg-value" style={{ color: classifyBP(avg14.sys, avg14.dia).color }}>
                {avg14.sys}/{avg14.dia}
                <span className="avg-unit"> mmHg</span>
              </div>
              <span className="avg-cat" style={{
                background: classifyBP(avg14.sys, avg14.dia).bg,
                color: classifyBP(avg14.sys, avg14.dia).color
              }}>
                {classifyBP(avg14.sys, avg14.dia).label}
              </span>
              <span className="avg-count">{avg14.count} mätningar</span>
            </div>
          )}

          {/* 30-day */}
          {avg30 && (
            <div className="avg-row avg-row-30">
              <div className="avg-period">30 dagar</div>
              <div className="avg-value" style={{ color: classifyBP(avg30.sys, avg30.dia).color }}>
                {avg30.sys}/{avg30.dia}
                <span className="avg-unit"> mmHg</span>
              </div>
              <span className="avg-cat" style={{
                background: classifyBP(avg30.sys, avg30.dia).bg,
                color: classifyBP(avg30.sys, avg30.dia).color
              }}>
                {classifyBP(avg30.sys, avg30.dia).label}
              </span>
              <span className="avg-count">{avg30.count} mätningar</span>
            </div>
          )}

          {/* Trend direction */}
          {trend?.trend && (
            <p className="trend-diff" style={{ marginTop: 10 }}>
              {trend.trend.sysDiff < 0
                ? `↓ ${Math.abs(trend.trend.sysDiff)} mmHg lägre än föregående 14-dagarsperiod`
                : trend.trend.sysDiff > 0
                ? `↑ ${trend.trend.sysDiff} mmHg högre än föregående 14-dagarsperiod`
                : 'Oförändrat jämfört med föregående period'}
            </p>
          )}

          {/* Target hit stats */}
          {trend?.lastTenCount >= 3 && (
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
        </div>
      )}

      {/* Today */}
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
      <span className="measurement-cat" style={{ background: bg, color }}>
        {classifyBP(m.sys, m.dia).label}
      </span>
      <button className="btn-delete" onClick={() => onDelete(m.id)} title="Ta bort">×</button>
    </div>
  )
}
