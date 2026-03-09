import { useState, useEffect, useCallback } from 'react'
import { addMicturitionEntry, getAllMicturitionEntries, deleteMicturitionEntry } from '../db/db'

// Leakage levels
const LEAKAGE_LABELS = ['Inget', 'Litet (1)', 'Medel (2)', 'Stort (3)']
const LEAKAGE_COLORS = ['', '#fbbf24', '#f59e0b', '#dc2626']

function emptyForm(defaultDate) {
  const now = new Date()
  return {
    date: defaultDate || now.toISOString().slice(0, 10),
    time: now.toTimeString().slice(0, 5),
    drinkAmount: '',    // dl
    urineAmount: '',    // ml
    leakage: 0,         // 0=none, 1=litet, 2=medium, 3=stort
    urgency: false,     // trängning
    notes: '',
  }
}

function parseDateSv(dateStr) {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

function calcStats(entries) {
  const voidEntries = entries.filter(e => e.urineAmount > 0)
  const total = voidEntries.reduce((s, e) => s + (e.urineAmount || 0), 0)
  const totalDrink = entries.reduce((s, e) => s + (e.drinkAmount ? e.drinkAmount * 100 : 0), 0) // dl→ml
  const maxVoid = voidEntries.length ? Math.max(...voidEntries.map(e => e.urineAmount || 0)) : 0
  const meanVoid = voidEntries.length ? Math.round(total / voidEntries.length) : 0
  const leakageCount = entries.filter(e => e.leakage > 0).length
  const urgencyCount = entries.filter(e => e.urgency).length
  // Nocturia: entries between 22:00 and 06:00
  const nocturia = voidEntries.filter(e => {
    if (!e.time) return false
    const [h] = e.time.split(':').map(Number)
    return h >= 22 || h < 6
  }).length
  return { voidCount: voidEntries.length, total, totalDrink, maxVoid, meanVoid, leakageCount, urgencyCount, nocturia }
}

export default function MictView({ onDataChange }) {
  const [entries, setEntries] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [showInfo, setShowInfo] = useState(false)
  const [printDays, setPrintDays] = useState([])
  const [showPrint, setShowPrint] = useState(false)

  const load = useCallback(async () => {
    const all = await getAllMicturitionEntries()
    setEntries(all.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date)
      return (a.time || '').localeCompare(b.time || '')
    }))
  }, [])

  useEffect(() => { load() }, [load])

  // Get unique dates for day selector
  const uniqueDates = [...new Set(entries.map(e => e.date))].sort()

  // Pre-select two most recent dates for print view
  useEffect(() => {
    if (uniqueDates.length > 0 && printDays.length === 0) {
      const recent = uniqueDates.slice(-2)
      setPrintDays(recent)
    }
  }, [uniqueDates.join(',')])

  async function handleSubmit(e) {
    e.preventDefault()
    const record = {
      ...form,
      drinkAmount: form.drinkAmount !== '' ? parseFloat(form.drinkAmount) : null,
      urineAmount: form.urineAmount !== '' ? parseFloat(form.urineAmount) : null,
    }
    await addMicturitionEntry(record)
    setForm(emptyForm(form.date))
    setShowForm(false)
    await load()
    onDataChange?.()
  }

  async function handleDelete(id) {
    if (!confirm('Ta bort registrering?')) return
    await deleteMicturitionEntry(id)
    await load()
    onDataChange?.()
  }

  function togglePrintDay(date) {
    setPrintDays(prev =>
      prev.includes(date)
        ? prev.filter(d => d !== date)
        : prev.length < 2
          ? [...prev, date].sort()
          : [prev[prev.length - 1], date].sort()
    )
  }

  // Group entries by date
  const byDate = {}
  for (const e of entries) {
    if (!byDate[e.date]) byDate[e.date] = []
    byDate[e.date].push(e)
  }

  const printEntries = printDays.flatMap(d => byDate[d] || [])

  return (
    <div className="view-content">
      <div className="card">
        <div className="card-header-row">
          <h2 className="card-title">🫧 Miktionslista</h2>
          {!showForm && (
            <button className="btn-add" onClick={() => setShowForm(true)}>+ Registrera</button>
          )}
        </div>
        <p className="card-desc">Registrera drycksintag, mängd urin och eventuellt läckage. Används vid inkontinens­utredning, LUTS och remisser.</p>
      </div>

      {/* Info */}
      <div className="card">
        <button className="info-toggle-btn" onClick={() => setShowInfo(v => !v)}>
          ℹ Normalvärden och instruktioner {showInfo ? '▲' : '▼'}
        </button>
        {showInfo && (
          <div className="info-expand">
            <p className="card-desc"><strong>Syfte:</strong> Miktionslistan används för att kartlägga blåsfunktion och registreras under 2 hela dygn (dag och natt).</p>
            <p className="card-desc"><strong>Anteckna:</strong> Klockslag, hur mycket du dricker (dl), urinmängd varje gång du kissar, och eventuellt läckage.</p>
            <div className="mict-normals">
              <h4>Normalvärden vid tolkning</h4>
              <ul>
                <li>Dygnsurinvolym: 1,5–2,5 liter</li>
                <li>Antal blåstömningar: ≤8 per dygn</li>
                <li>Medelmiktionsvolym: 2–3 dl</li>
                <li>Blåstid dagtid: 3–4 timmar</li>
                <li>Funktionell blåskapacitet (största miktionsvolym): 3–6 dl</li>
              </ul>
            </div>
            <p className="card-desc"><strong>Läckage:</strong> 1 = litet (fläck i trosskyddet), 2 = medium (genomblött trosskydd), 3 = stort (genomblöta kläder).</p>
            <p className="card-desc"><strong>Trängning:</strong> Plötslig, svår urge att kissa som är svår att skjuta upp.</p>
          </div>
        )}
      </div>

      {/* Entry form */}
      {showForm && (
        <div className="card">
          <h3 className="card-title">Ny registrering</h3>
          <form onSubmit={handleSubmit} className="med-form">
            <div className="form-row">
              <div className="form-group">
                <label>Datum</label>
                <input type="date" value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  className="form-input" />
              </div>
              <div className="form-group">
                <label>Klockslag</label>
                <input type="time" value={form.time}
                  onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                  className="form-input" />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Dryck (dl)</label>
                <input type="number" value={form.drinkAmount}
                  onChange={e => setForm(f => ({ ...f, drinkAmount: e.target.value }))}
                  placeholder="t.ex. 2" min="0" max="50" step="0.5"
                  className="form-input" />
                <span className="form-hint">Lämna tomt om inget dryck</span>
              </div>
              <div className="form-group">
                <label>Urinmängd (ml)</label>
                <input type="number" value={form.urineAmount}
                  onChange={e => setForm(f => ({ ...f, urineAmount: e.target.value }))}
                  placeholder="t.ex. 250" min="0" max="2000" step="10"
                  className="form-input" />
                <span className="form-hint">Lämna tomt om ingen miktion</span>
              </div>
            </div>

            <div className="form-group">
              <label>Urinläckage</label>
              <div className="leakage-btns">
                {LEAKAGE_LABELS.map((l, i) => (
                  <button key={i} type="button"
                    className={`leakage-btn ${form.leakage === i ? 'leakage-btn-active' : ''}`}
                    style={form.leakage === i && i > 0 ? { borderColor: LEAKAGE_COLORS[i], background: LEAKAGE_COLORS[i] + '20' } : {}}
                    onClick={() => setForm(f => ({ ...f, leakage: i }))}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input type="checkbox" checked={form.urgency}
                  onChange={e => setForm(f => ({ ...f, urgency: e.target.checked }))} />
                Trängning (urgency)
              </label>
            </div>

            <div className="form-group">
              <label>Anteckning</label>
              <input type="text" value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Valfritt..." className="form-input" />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary"
                disabled={!form.drinkAmount && !form.urineAmount && form.leakage === 0}>
                Spara
              </button>
              <button type="button" className="btn-secondary"
                onClick={() => { setShowForm(false); setForm(emptyForm()) }}>
                Avbryt
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Print / Report view */}
      {entries.length > 0 && (
        <div className="card">
          <div className="card-header-row">
            <h3 className="card-title">Utskrift / rapport</h3>
            <button className="btn-secondary" onClick={() => setShowPrint(v => !v)}>
              {showPrint ? 'Dölj' : '🖨 Visa lista'}
            </button>
          </div>
          {showPrint && (
            <>
              <p className="card-desc">Välj de två dygn som ska ingå i rapporten (max 2):</p>
              <div className="mict-day-selector">
                {uniqueDates.map(d => (
                  <button key={d} type="button"
                    className={`mict-day-btn ${printDays.includes(d) ? 'mict-day-btn-active' : ''}`}
                    onClick={() => togglePrintDay(d)}>
                    {parseDateSv(d)}
                    {printDays.includes(d) && (
                      <span className="mict-day-num"> Dygn {printDays.indexOf(d) + 1}</span>
                    )}
                  </button>
                ))}
              </div>

              {printDays.length > 0 && (
                <MictReport
                  days={printDays}
                  byDate={byDate}
                />
              )}
            </>
          )}
        </div>
      )}

      {/* History list */}
      {entries.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🫧</div>
          <p>Inga registreringar ännu.<br />Börja registrera dryck och miktion ovan.</p>
        </div>
      ) : (
        <div className="card">
          <h3 className="card-title">Historik</h3>
          {uniqueDates.slice().reverse().map(date => {
            const dayEntries = byDate[date] || []
            const stats = calcStats(dayEntries)
            return (
              <div key={date} className="mict-day-group">
                <div className="mict-day-header">
                  <span className="mict-day-title">{parseDateSv(date)}</span>
                  <span className="mict-day-summary">
                    {stats.voidCount > 0 && <span className="gut-chip">💧 {stats.voidCount} mikt.</span>}
                    {stats.total > 0 && <span className="gut-chip">{stats.total} ml urin</span>}
                    {stats.leakageCount > 0 && <span className="gut-chip gut-chip-warn">⚠ {stats.leakageCount} läckage</span>}
                    {stats.urgencyCount > 0 && <span className="gut-chip gut-chip-warn">🚨 {stats.urgencyCount} trängning</span>}
                  </span>
                </div>
                <div className="mict-entry-list">
                  {dayEntries.map(e => (
                    <div key={e.id} className="mict-entry">
                      <span className="mict-time">{e.time || '–'}</span>
                      <span className="mict-drink">{e.drinkAmount != null ? `🥤 ${e.drinkAmount} dl` : ''}</span>
                      <span className="mict-urine">{e.urineAmount != null ? `💧 ${e.urineAmount} ml` : ''}</span>
                      {e.leakage > 0 && (
                        <span className="mict-leak" style={{ color: LEAKAGE_COLORS[e.leakage] }}>
                          ⚠ Läck. {e.leakage}
                        </span>
                      )}
                      {e.urgency && <span className="mict-urgency">🚨</span>}
                      {e.notes && <span className="mict-notes">📝 {e.notes}</span>}
                      <button className="btn-delete mict-delete" onClick={() => handleDelete(e.id)}>×</button>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Print/Report component ────────────────────────────────────────────────────

function MictReport({ days, byDate }) {
  function handlePrint() {
    window.print()
  }

  return (
    <div className="mict-report">
      <div className="mict-report-header">
        <p className="mict-report-title">Miktionslista – 2 dygn</p>
        <p className="mict-report-sub">Utskriven: {new Date().toLocaleDateString('sv-SE')}</p>
        <button className="btn-secondary mict-print-btn" onClick={handlePrint}>🖨 Skriv ut</button>
      </div>

      <div className="mict-report-grid">
        {days.map((date, idx) => {
          const dayEntries = byDate[date] || []
          const stats = calcStats(dayEntries)
          return (
            <div key={date} className="mict-report-day">
              <div className="mict-report-day-header">
                <span>Dygn {idx + 1}</span>
                <span className="mict-report-date">{parseDateSv(date)}</span>
              </div>
              <table className="mict-table">
                <thead>
                  <tr>
                    <th>Tid</th>
                    <th>Dryck (dl)</th>
                    <th>Urin (ml)</th>
                    <th>Läckage</th>
                    <th>Trängning</th>
                  </tr>
                </thead>
                <tbody>
                  {dayEntries.map(e => (
                    <tr key={e.id} className={e.leakage > 0 ? 'mict-row-leak' : ''}>
                      <td>{e.time || '–'}</td>
                      <td>{e.drinkAmount != null ? e.drinkAmount : '–'}</td>
                      <td>{e.urineAmount != null ? e.urineAmount : '–'}</td>
                      <td>{e.leakage > 0 ? e.leakage : '–'}</td>
                      <td>{e.urgency ? 'Ja' : '–'}</td>
                    </tr>
                  ))}
                  {/* Empty rows to fill to at least 15 */}
                  {Array.from({ length: Math.max(0, 15 - dayEntries.length) }).map((_, i) => (
                    <tr key={`empty-${i}`} className="mict-row-empty">
                      <td></td><td></td><td></td><td></td><td></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="mict-table-footer">
                    <td><strong>Antal blåstömningar:</strong> {stats.voidCount}</td>
                    <td><strong>Summa dryck:</strong> {stats.totalDrink > 0 ? (stats.totalDrink / 100).toFixed(1) + ' dl' : '–'}</td>
                    <td><strong>Summa urin:</strong> {stats.total > 0 ? stats.total + ' ml' : '–'}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>

              {/* Stats summary */}
              <div className="mict-report-stats">
                <div className="mict-stat">
                  <span className="mict-stat-label">Blåstömningar</span>
                  <span className="mict-stat-val">{stats.voidCount}</span>
                  <span className={`mict-stat-ref ${stats.voidCount <= 8 ? 'ok' : 'warn'}`}>
                    (norm ≤8)
                  </span>
                </div>
                <div className="mict-stat">
                  <span className="mict-stat-label">Dygnsvolym urin</span>
                  <span className="mict-stat-val">{stats.total > 0 ? Math.round(stats.total / 100) / 10 + ' L' : '–'}</span>
                  <span className={`mict-stat-ref ${stats.total >= 1500 && stats.total <= 2500 ? 'ok' : stats.total > 0 ? 'warn' : ''}`}>
                    (norm 1,5–2,5 L)
                  </span>
                </div>
                <div className="mict-stat">
                  <span className="mict-stat-label">Medelmiktionsvolym</span>
                  <span className="mict-stat-val">{stats.meanVoid > 0 ? stats.meanVoid + ' ml' : '–'}</span>
                  <span className={`mict-stat-ref ${stats.meanVoid >= 200 && stats.meanVoid <= 300 ? 'ok' : stats.meanVoid > 0 ? 'warn' : ''}`}>
                    (norm 2–3 dl)
                  </span>
                </div>
                <div className="mict-stat">
                  <span className="mict-stat-label">Funktionell blåskapacitet</span>
                  <span className="mict-stat-val">{stats.maxVoid > 0 ? stats.maxVoid + ' ml' : '–'}</span>
                  <span className={`mict-stat-ref ${stats.maxVoid >= 300 && stats.maxVoid <= 600 ? 'ok' : stats.maxVoid > 0 ? 'warn' : ''}`}>
                    (norm 3–6 dl)
                  </span>
                </div>
                {stats.nocturia > 0 && (
                  <div className="mict-stat">
                    <span className="mict-stat-label">Nocturia (22–06)</span>
                    <span className="mict-stat-val">{stats.nocturia}</span>
                    <span className={`mict-stat-ref ${stats.nocturia <= 1 ? 'ok' : 'warn'}`}>
                      (norm ≤1)
                    </span>
                  </div>
                )}
                {stats.leakageCount > 0 && (
                  <div className="mict-stat">
                    <span className="mict-stat-label">Läckagetillfällen</span>
                    <span className="mict-stat-val mict-stat-warn">{stats.leakageCount}</span>
                  </div>
                )}
                {stats.urgencyCount > 0 && (
                  <div className="mict-stat">
                    <span className="mict-stat-label">Trängningar</span>
                    <span className="mict-stat-val mict-stat-warn">{stats.urgencyCount}</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="mict-report-normals">
        <strong>Normalvärden:</strong> Dygnsurinvolym 1,5–2,5 L &nbsp;|&nbsp;
        Antal blåstömningar ≤8 &nbsp;|&nbsp;
        Medelmiktionsvolym 2–3 dl &nbsp;|&nbsp;
        Blåstid dagtid 3–4 h &nbsp;|&nbsp;
        Funktionell blåskapacitet 3–6 dl
      </div>
    </div>
  )
}
