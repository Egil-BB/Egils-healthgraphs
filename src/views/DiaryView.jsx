import { useState, useEffect, useCallback } from 'react'
import { addGutEntry, getAllGutEntries, deleteGutEntry } from '../db/db'
import { formatDateSv } from '../utils/bp'

const BRISTOL_TYPES = [
  { type: 1, label: 'Typ 1', desc: 'Hårda klumpar, som nötter', color: '#92400e', emoji: '🟤' },
  { type: 2, label: 'Typ 2', desc: 'Korvformad, klumpig', color: '#b45309', emoji: '🟤' },
  { type: 3, label: 'Typ 3', desc: 'Korvformad med sprickor', color: '#16a34a', emoji: '🟢' },
  { type: 4, label: 'Typ 4', desc: 'Mjuk och slät korv', color: '#16a34a', emoji: '🟢' },
  { type: 5, label: 'Typ 5', desc: 'Mjuka klumpar, väldefinierade', color: '#ca8a04', emoji: '🟡' },
  { type: 6, label: 'Typ 6', desc: 'Fluffig, ojämna kanter, grötig', color: '#dc2626', emoji: '🔴' },
  { type: 7, label: 'Typ 7', desc: 'Helt flytande, ingen fast form', color: '#dc2626', emoji: '🔴' },
]

const GRADE_LABELS = ['Ingen', 'Mild', 'Måttlig', 'Svår']

function GradeSelector({ label, value, onChange }) {
  return (
    <div className="form-group">
      <label>{label}</label>
      <div className="grade-btns">
        {GRADE_LABELS.map((l, i) => (
          <button
            key={i}
            type="button"
            className={`grade-btn ${value === i ? 'grade-btn-active' : ''}`}
            onClick={() => onChange(i)}
          >
            {i} – {l}
          </button>
        ))}
      </div>
    </div>
  )
}

function bristolColor(type) {
  return BRISTOL_TYPES.find(b => b.type === type)?.color || '#64748b'
}

function bristolDesc(type) {
  return BRISTOL_TYPES.find(b => b.type === type)?.desc || ''
}

function emptyForm() {
  return {
    date: new Date().toISOString().slice(0, 10),
    bristolType: null,
    pain: 0,
    bloating: 0,
    gas: 0,
    bowelCount: 1,
    laxative: '',
    notes: '',
  }
}

export default function DiaryView({ onDataChange }) {
  const [entries, setEntries] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [showInfo, setShowInfo] = useState(false)

  const load = useCallback(async () => {
    const all = await getAllGutEntries()
    setEntries(all.sort((a, b) => b.date.localeCompare(a.date)))
  }, [])

  useEffect(() => { load() }, [load])

  async function handleSubmit(e) {
    e.preventDefault()
    if (form.bristolType === null) return
    await addGutEntry({ ...form })
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

  return (
    <div className="view-content">
      {/* Info card */}
      <div className="card">
        <div className="card-header-row">
          <h2 className="card-title">📔 Dagbok – Tarm</h2>
          {!showForm && (
            <button className="btn-add" onClick={() => setShowForm(true)}>+ Registrera</button>
          )}
        </div>
        <p className="card-desc">Följ avföring, smärta, gasbesvär och laxativbruk.</p>
      </div>

      {/* Info about constipation */}
      <div className="card">
        <button
          className="info-toggle-btn"
          onClick={() => setShowInfo(v => !v)}
        >
          ℹ Förstoppning – information {showInfo ? '▲' : '▼'}
        </button>
        {showInfo && (
          <div className="info-expand">
            <p className="card-desc"><strong>Normal avföringsfrekvens</strong> hos barn: 3/dag – 3/vecka.</p>
            <p className="card-desc">Förstoppning definieras som ≤2 tömningar/vecka, hård konsistens (Bristol 1–2) eller smärta vid tömning.</p>
            <p className="card-desc"><strong>Livsstilsåtgärder:</strong> Rikligt vätskeintag, fiberrik kost, regelbunden toalett-rutin, fysisk aktivitet.</p>
            <p className="card-desc"><strong>Röda flaggor</strong> – kontakta läkare: blod i avföringen, viktnedgång, nattliga symtom, hereditet för tarmcancer.</p>
          </div>
        )}
      </div>

      {/* Register form */}
      {showForm && (
        <div className="card">
          <h3 className="card-title">Ny anteckning</h3>
          <form onSubmit={handleSubmit} className="med-form">

            <div className="form-group">
              <label>Datum</label>
              <input
                type="date"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="form-input"
              />
            </div>

            {/* Bristol scale */}
            <div className="form-group">
              <label>Avföringens konsistens (Bristolskalan) *</label>
              <div className="bristol-grid">
                {BRISTOL_TYPES.map(b => (
                  <button
                    key={b.type}
                    type="button"
                    className={`bristol-card ${form.bristolType === b.type ? 'bristol-card-active' : ''}`}
                    style={form.bristolType === b.type ? { borderColor: b.color, background: b.color + '15' } : {}}
                    onClick={() => setForm(f => ({ ...f, bristolType: b.type }))}
                  >
                    <span className="bristol-num" style={{ color: b.color }}>{b.type}</span>
                    <span className="bristol-desc">{b.desc}</span>
                  </button>
                ))}
              </div>
              {form.bristolType === null && (
                <p className="form-hint" style={{ color: '#dc2626' }}>Välj en typ för att kunna spara.</p>
              )}
            </div>

            {/* Bowel count */}
            <div className="form-group">
              <label>Antal tömningar idag</label>
              <div className="count-row">
                <button type="button" className="count-btn" onClick={() => setForm(f => ({ ...f, bowelCount: Math.max(0, f.bowelCount - 1) }))}>−</button>
                <span className="count-val">{form.bowelCount}</span>
                <button type="button" className="count-btn" onClick={() => setForm(f => ({ ...f, bowelCount: f.bowelCount + 1 }))}>+</button>
              </div>
            </div>

            <GradeSelector label="Buksmärta" value={form.pain} onChange={v => setForm(f => ({ ...f, pain: v }))} />
            <GradeSelector label="Uppblåsthet" value={form.bloating} onChange={v => setForm(f => ({ ...f, bloating: v }))} />
            <GradeSelector label="Gasbesvär" value={form.gas} onChange={v => setForm(f => ({ ...f, gas: v }))} />

            <div className="form-group">
              <label>Laxativ (om använt)</label>
              <input
                type="text"
                value={form.laxative}
                onChange={e => setForm(f => ({ ...f, laxative: e.target.value }))}
                placeholder="t.ex. Movicol 1 påse"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Anteckningar</label>
              <input
                type="text"
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Valfri kommentar..."
                className="form-input"
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={form.bristolType === null}>
                Spara
              </button>
              <button type="button" className="btn-secondary" onClick={() => { setShowForm(false); setForm(emptyForm()) }}>
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
              const b = BRISTOL_TYPES.find(b => b.type === e.bristolType)
              return (
                <div key={e.id} className="gut-item">
                  <div className="gut-item-header">
                    <span className="gut-date">{formatDateSv(e.date)}</span>
                    <button className="btn-delete" onClick={() => handleDelete(e.id)}>×</button>
                  </div>
                  <div className="gut-item-body">
                    {b && (
                      <span className="gut-bristol" style={{ color: b.color }}>
                        Bristol {e.bristolType} – {b.desc}
                      </span>
                    )}
                    <div className="gut-meta-row">
                      <span className="gut-chip">💩 {e.bowelCount}×</span>
                      {e.pain > 0 && <span className="gut-chip">Smärta: {GRADE_LABELS[e.pain]}</span>}
                      {e.bloating > 0 && <span className="gut-chip">Uppblåst: {GRADE_LABELS[e.bloating]}</span>}
                      {e.gas > 0 && <span className="gut-chip">Gas: {GRADE_LABELS[e.gas]}</span>}
                      {e.laxative && <span className="gut-chip gut-chip-lax">💊 {e.laxative}</span>}
                    </div>
                    {e.notes && <span className="gut-notes">📝 {e.notes}</span>}
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
