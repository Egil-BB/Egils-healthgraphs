import { useState, useEffect, useCallback } from 'react'
import { addGutEntry, getAllGutEntries, deleteGutEntry, getProfile, setProfile } from '../db/db'
import { formatDateSv } from '../utils/bp'

const BRISTOL_TYPES = [
  { type: 1, desc: 'Hårda klumpar, som nötter', color: '#92400e' },
  { type: 2, desc: 'Korvformad, klumpig', color: '#b45309' },
  { type: 3, desc: 'Korvformad med sprickor', color: '#16a34a' },
  { type: 4, desc: 'Mjuk och slät korv', color: '#16a34a' },
  { type: 5, desc: 'Mjuka klumpar, väldefinierade', color: '#ca8a04' },
  { type: 6, desc: 'Fluffig, ojämna kanter, grötig', color: '#dc2626' },
  { type: 7, desc: 'Helt flytande, ingen fast form', color: '#dc2626' },
]

const DEFAULT_LAXATIVES = ['Movicol', 'Cilaxoral', 'Resolor', 'Imodium', 'Vi-Siblin', 'Inolaxol']
const LAX_MAX_DOSE = 10
const GRADE_LABELS = ['Ingen', 'Mild', 'Måttlig', 'Svår']

function GradeSelector({ label, value, onChange }) {
  return (
    <div className="form-group">
      <label>{label}</label>
      <div className="grade-btns">
        {GRADE_LABELS.map((l, i) => (
          <button key={i} type="button"
            className={`grade-btn ${value === i ? 'grade-btn-active' : ''}`}
            onClick={() => onChange(i)}>
            {i} – {l}
          </button>
        ))}
      </div>
    </div>
  )
}

function emptyForm() {
  return {
    date: new Date().toISOString().slice(0, 10),
    bristolTypes: [],   // array of type numbers, one per bowel movement
    pain: 0, bloating: 0, gas: 0,
    laxatives: {},      // { Movicol: 2, ... }
    notes: '',
  }
}

export default function DiaryView({ onDataChange }) {
  const [entries, setEntries] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [showInfo, setShowInfo] = useState(false)
  const [laxMeds, setLaxMeds] = useState(DEFAULT_LAXATIVES)
  const [editingLax, setEditingLax] = useState(false)
  const [newLaxName, setNewLaxName] = useState('')

  const load = useCallback(async () => {
    const all = await getAllGutEntries()
    setEntries(all.sort((a, b) => b.date.localeCompare(a.date)))
  }, [])

  useEffect(() => {
    getProfile('laxMeds').then(saved => {
      if (saved && Array.isArray(saved) && saved.length > 0) setLaxMeds(saved)
    })
  }, [])

  async function saveLaxMeds(next) {
    setLaxMeds(next)
    await setProfile('laxMeds', next)
  }

  function addLaxMed() {
    const name = newLaxName.trim()
    if (!name || laxMeds.includes(name)) return
    saveLaxMeds([...laxMeds, name])
    setNewLaxName('')
  }

  function removeLaxMed(name) {
    saveLaxMeds(laxMeds.filter(m => m !== name))
    setForm(f => {
      const laxatives = { ...f.laxatives }
      delete laxatives[name]
      return { ...f, laxatives }
    })
  }

  useEffect(() => { load() }, [load])

  // Bristol: click = +1 of that type; minus button = -1
  function addBristol(type) {
    setForm(f => ({ ...f, bristolTypes: [...f.bristolTypes, type] }))
  }
  function removeBristol(type) {
    setForm(f => {
      const arr = [...f.bristolTypes]
      const idx = arr.lastIndexOf(type)
      if (idx > -1) arr.splice(idx, 1)
      return { ...f, bristolTypes: arr }
    })
  }

  function toggleLaxative(name) {
    setForm(f => {
      const cur = f.laxatives[name] || 0
      const next = cur + 1 > LAX_MAX_DOSE ? 0 : cur + 1
      const laxatives = { ...f.laxatives }
      if (next === 0) delete laxatives[name]
      else laxatives[name] = next
      return { ...f, laxatives }
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (form.bristolTypes.length === 0) return
    const totalBowelCount = form.bristolTypes.length
    await addGutEntry({ ...form, bowelCount: totalBowelCount })
    setForm(emptyForm())
    setShowForm(false)
    await load()
    onDataChange?.()
  }

  async function handleDelete(id) {
    if (!confirm('Ta bort anteckning?')) return
    await deleteGutEntry(id)
    await load()
    onDataChange?.()
  }

  function bristolCountOf(bristolTypes, type) {
    return (bristolTypes || []).filter(t => t === type).length
  }

  function bristolSummary(entry) {
    // Support both old single bristolType and new bristolTypes array
    if (entry.bristolTypes && entry.bristolTypes.length > 0) {
      const counts = {}
      for (const t of entry.bristolTypes) counts[t] = (counts[t] || 0) + 1
      return Object.entries(counts)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([t, c]) => c > 1 ? `Typ ${t} ×${c}` : `Typ ${t}`)
        .join(', ')
    }
    if (entry.bristolType) return `Typ ${entry.bristolType}`
    return '–'
  }

  function laxSummary(entry) {
    if (entry.laxatives && typeof entry.laxatives === 'object') {
      return Object.entries(entry.laxatives)
        .filter(([, d]) => d > 0)
        .map(([n, d]) => d > 1 ? `${n} ×${d}` : n)
        .join(', ')
    }
    return entry.laxative || null
  }

  return (
    <div className="view-content">
      <div className="card">
        <div className="card-header-row">
          <h2 className="card-title">📔 Dagbok – Tarm</h2>
          {!showForm && (
            <button className="btn-add" onClick={() => setShowForm(true)}>+ Registrera</button>
          )}
        </div>
        <p className="card-desc">Följ avföring, smärta, gasbesvär och laxativbruk.</p>
      </div>

      {/* Info card */}
      <div className="card">
        <button className="info-toggle-btn" onClick={() => setShowInfo(v => !v)}>
          ℹ Förstoppning – information {showInfo ? '▲' : '▼'}
        </button>
        {showInfo && (
          <div className="info-expand">
            <p className="card-desc"><strong>Normal avföringsfrekvens</strong> hos barn: 3/dag – 3/vecka. Hos vuxna: 3/dag – 3/vecka.</p>
            <p className="card-desc">Förstoppning = ≤2 tömningar/vecka, hård konsistens (Bristol 1–2) eller smärta vid tömning.</p>
            <p className="card-desc"><strong>Åtgärder:</strong> Rikligt vätskeintag, fiberrik kost, regelbunden toalett-rutin, fysisk aktivitet.</p>
            <p className="card-desc"><strong>Röda flaggor</strong> (kontakta läkare): blod i avföring, viktnedgång, nattliga symtom.</p>
          </div>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="card">
          <h3 className="card-title">Ny anteckning</h3>
          <form onSubmit={handleSubmit} className="med-form">
            <div className="form-group">
              <label>Datum</label>
              <input type="date" value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="form-input" />
            </div>

            {/* Bristol multi-select */}
            <div className="form-group">
              <label>Avföringens konsistens – klicka för varje tömning *</label>
              <p className="form-hint">Klicka en typ per tarmrtömning. Du kan välja samma typ flera gånger.</p>
              <div className="bristol-grid">
                {BRISTOL_TYPES.map(b => {
                  const count = bristolCountOf(form.bristolTypes, b.type)
                  return (
                    <div key={b.type} className="bristol-card-row">
                      <button
                        type="button"
                        className={`bristol-card ${count > 0 ? 'bristol-card-active' : ''}`}
                        style={count > 0 ? { borderColor: b.color, background: b.color + '15' } : {}}
                        onClick={() => addBristol(b.type)}
                      >
                        <span className="bristol-num" style={{ color: b.color }}>{b.type}</span>
                        <span className="bristol-desc">{b.desc}</span>
                        {count > 0 && <span className="bristol-badge" style={{ background: b.color }}>×{count}</span>}
                      </button>
                      {count > 0 && (
                        <button type="button" className="bristol-minus" onClick={() => removeBristol(b.type)}>−</button>
                      )}
                    </div>
                  )
                })}
              </div>
              {form.bristolTypes.length === 0 && (
                <p className="form-hint" style={{ color: '#dc2626' }}>Välj minst en typ.</p>
              )}
              {form.bristolTypes.length > 0 && (
                <p className="form-hint" style={{ color: '#16a34a' }}>
                  {form.bristolTypes.length} tömning{form.bristolTypes.length > 1 ? 'ar' : ''} valda
                </p>
              )}
            </div>

            <GradeSelector label="Buksmärta" value={form.pain} onChange={v => setForm(f => ({ ...f, pain: v }))} />
            <GradeSelector label="Uppblåsthet" value={form.bloating} onChange={v => setForm(f => ({ ...f, bloating: v }))} />
            <GradeSelector label="Gasbesvär" value={form.gas} onChange={v => setForm(f => ({ ...f, gas: v }))} />

            {/* Laxatives */}
            <div className="form-group">
              <div className="lax-manage-row">
                <label>Laxativ/tarmregulerare – klicka för antal doser</label>
                <button type="button" className="lax-manage-btn" onClick={() => setEditingLax(v => !v)}>
                  {editingLax ? 'Klar' : 'Ändra lista'}
                </button>
              </div>
              {editingLax && (
                <div className="lax-edit-form">
                  <p>Dina läkemedel:</p>
                  <div className="lax-current">
                    {laxMeds.map(name => (
                      <span key={name} className="lax-tag">
                        {name}
                        <button type="button" className="lax-tag-remove" onClick={() => removeLaxMed(name)}>×</button>
                      </span>
                    ))}
                  </div>
                  <div className="lax-add-row">
                    <input
                      type="text"
                      value={newLaxName}
                      onChange={e => setNewLaxName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addLaxMed())}
                      placeholder="Lägg till läkemedel..."
                      className="form-input lax-add-input"
                    />
                    <button type="button" className="btn-secondary" onClick={addLaxMed}>Lägg till</button>
                  </div>
                </div>
              )}
              <div className="lax-grid">
                {laxMeds.map(name => {
                  const count = form.laxatives[name] || 0
                  return (
                    <button
                      key={name}
                      type="button"
                      className={`lax-btn ${count > 0 ? 'lax-btn-active' : ''}`}
                      onClick={() => toggleLaxative(name)}
                    >
                      {name}
                      {count > 0 && <span className="lax-count">×{count}</span>}
                    </button>
                  )
                })}
              </div>
              <p className="form-hint">Klicka för att lägga till dos. Klicka igen för +1 dos (max {LAX_MAX_DOSE}). Klicka till 0 för att ta bort.</p>
            </div>

            <div className="form-group">
              <label>Anteckningar</label>
              <input type="text" value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Valfri kommentar..." className="form-input" />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={form.bristolTypes.length === 0}>
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

      {/* History */}
      {entries.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📔</div>
          <p>Inga anteckningar ännu.<br />Registrera dagens avföring ovan.</p>
        </div>
      ) : (
        <div className="card">
          <h3 className="card-title">Historik</h3>
          <div className="gut-list">
            {entries.map(e => {
              const lax = laxSummary(e)
              const summary = bristolSummary(e)
              const bowelN = e.bowelCount || (e.bristolTypes?.length) || 1
              return (
                <div key={e.id} className="gut-item">
                  <div className="gut-item-header">
                    <span className="gut-date">{formatDateSv(e.date)}</span>
                    <button className="btn-delete" onClick={() => handleDelete(e.id)}>×</button>
                  </div>
                  <div className="gut-item-body">
                    <span className="gut-bristol">{summary}</span>
                    <div className="gut-meta-row">
                      <span className="gut-chip">💩 {bowelN} tömn.</span>
                      {e.pain > 0 && <span className="gut-chip">Smärta: {GRADE_LABELS[e.pain]}</span>}
                      {e.bloating > 0 && <span className="gut-chip">Uppblåst: {GRADE_LABELS[e.bloating]}</span>}
                      {e.gas > 0 && <span className="gut-chip">Gas: {GRADE_LABELS[e.gas]}</span>}
                      {lax && <span className="gut-chip gut-chip-lax">💊 {lax}</span>}
                    </div>
                    {(e.notes || e.note) && <span className="gut-notes">📝 {e.notes || e.note}</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
