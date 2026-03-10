import { useState, useEffect, useCallback } from 'react'
import { addGutEntry, getAllGutEntries, deleteGutEntry, getAllMedications } from '../db/db'
import { formatDateSv } from '../utils/bp'
import { getMedGraphTargets } from '../utils/medications'

const BRISTOL_TYPES = [
  { type: 1, desc: 'Hårda klumpar, som nötter', color: '#3d1c00', normal: false },
  { type: 2, desc: 'Korvformad, klumpig', color: '#7a3a0a', normal: false },
  { type: 3, desc: 'Korvformad med sprickor', color: '#7a6c3e', normal: true },
  { type: 4, desc: 'Mjuk och slät korv', color: '#16a34a', normal: true },
  { type: 5, desc: 'Mjuka klumpar, väldefinierade', color: '#84cc16', normal: true },
  { type: 6, desc: 'Fluffig, ojämna kanter, grötig', color: '#d97706', normal: false },
  { type: 7, desc: 'Helt flytande, ingen fast form', color: '#eab308', normal: false },
]

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

// ── Gut registration wizard ────────────────────────────────────────────────────

function GutWizard({ onSave, onClose }) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    bristolType: null,
    pain: 0,
    bloating: 0,
    gas: 0,
    notes: '',
  })
  const today = new Date().toISOString().slice(0, 10)
  const time = new Date().toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })
  const [showBristolImg, setShowBristolImg] = useState(false)

  async function handleSave() {
    if (!form.bristolType) return
    await addGutEntry({
      date: today,
      time,
      bristolType: form.bristolType,
      bristolTypes: [form.bristolType],
      bowelCount: 1,
      pain: form.pain,
      bloating: form.bloating,
      gas: form.gas,
      notes: form.notes,
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
            <h3 className="pain-step-title">Steg 1 av 2 – Tarmtömning</h3>
            <div className="bristol-label-row">
              <label>Välj Bristol-typ</label>
              <button type="button" className="bristol-img-btn" onClick={() => setShowBristolImg(v => !v)}>
                🖼 {showBristolImg ? 'Dölj' : 'Visa'} bild
              </button>
            </div>
            {showBristolImg && (
              <div className="bristol-scale-list" style={{ marginBottom: 8 }}>
                {BRISTOL_TYPES.map(b => (
                  <div key={b.type} className="bristol-scale-row">
                    <span className="bristol-scale-num" style={{ color: b.color }}>Typ {b.type}</span>
                    <span className="bristol-scale-bar" style={{ background: b.color + '30', borderLeft: `4px solid ${b.color}` }}>
                      {b.desc}{b.normal ? ' ✓' : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <div className="bristol-grid">
              {BRISTOL_TYPES.map(b => (
                <button
                  key={b.type}
                  type="button"
                  className={`bristol-card ${form.bristolType === b.type ? 'bristol-card-active' : ''} ${b.normal ? 'bristol-card-normal' : ''}`}
                  style={form.bristolType === b.type ? { borderColor: b.color, background: b.color + '18' } : {}}
                  onClick={() => setForm(f => ({ ...f, bristolType: b.type }))}
                >
                  <span className="bristol-num" style={{ color: b.color }}>{b.type}</span>
                  <span className="bristol-desc">{b.desc}</span>
                  {b.normal && <span className="bristol-normal-dot" />}
                </button>
              ))}
            </div>
            {!form.bristolType && (
              <p style={{ color: '#dc2626', fontSize: 13, marginTop: 8 }}>Välj en typ för att fortsätta.</p>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="pain-wizard-step">
            <h3 className="pain-step-title">Steg 2 av 2 – Symtom (valfritt)</h3>
            <GradeSelector label="Buksmärta" value={form.pain} onChange={v => setForm(f => ({ ...f, pain: v }))} />
            <GradeSelector label="Uppblåsthet" value={form.bloating} onChange={v => setForm(f => ({ ...f, bloating: v }))} />
            <GradeSelector label="Gasbesvär" value={form.gas} onChange={v => setForm(f => ({ ...f, gas: v }))} />
            <div className="form-group" style={{ marginTop: 8 }}>
              <label>Anteckning (valfritt)</label>
              <input type="text" value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Fritext..." className="form-input" />
            </div>
          </div>
        )}

        <div className="pain-wizard-nav">
          {step > 1 && (
            <button type="button" className="btn-secondary" onClick={() => setStep(s => s - 1)}>← Tillbaka</button>
          )}
          {step === 1 && (
            <button type="button" className="btn-primary" disabled={!form.bristolType} onClick={() => setStep(2)}>Nästa →</button>
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

// ── Gut medication modal ──────────────────────────────────────────────────────

function GutMedModal({ gutMeds, onSave, onClose }) {
  const [medCounts, setMedCounts] = useState({})
  const today = new Date().toISOString().slice(0, 10)
  const time = new Date().toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })
  const hasAny = Object.values(medCounts).some(v => v > 0)

  async function handleSave() {
    await addGutEntry({
      date: today,
      time,
      bristolType: null,
      bristolTypes: [],
      bowelCount: 0,
      pain: 0,
      bloating: 0,
      gas: 0,
      medications: { ...medCounts },
      notes: '',
    })
    onSave()
  }

  const increment = id => setMedCounts(m => ({ ...m, [id]: (m[id] || 0) + 1 }))
  const decrement = id => setMedCounts(m => ({ ...m, [id]: Math.max(0, (m[id] || 0) - 1) }))

  return (
    <div className="pain-wizard-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="pain-wizard">
        <button className="pain-wizard-close" onClick={onClose}>✕</button>
        <h3 className="pain-step-title">💊 Tarmmedicin tagen</h3>
        {gutMeds.length === 0 ? (
          <p style={{ color: '#64748b', fontSize: 14, padding: '8px 0' }}>
            Inga tarmmediciner registrerade. Lägg till dem under Mediciner.
          </p>
        ) : (
          <div className="pain-meds">
            {gutMeds.map(med => (
              <div key={med.id} className="pain-med-row">
                <span className="pain-med-label">{med.name}{med.dose ? ` ${med.dose}` : ''}</span>
                <div className="pain-med-controls">
                  <button type="button" onClick={() => decrement(med.id)} className="pain-med-btn">−</button>
                  <span className="pain-med-count">{medCounts[med.id] || 0}</span>
                  <button type="button" onClick={() => increment(med.id)} className="pain-med-btn">+</button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="pain-wizard-nav">
          <button type="button" className="btn-secondary" onClick={onClose}>Avbryt</button>
          <button type="button" className="btn-primary" disabled={!hasAny || gutMeds.length === 0} onClick={handleSave}>Spara</button>
        </div>
      </div>
    </div>
  )
}

// ── Main view ─────────────────────────────────────────────────────────────────

export default function DiaryView({ onDataChange }) {
  const [entries, setEntries] = useState([])
  const [gutMeds, setGutMeds] = useState([])
  const [wizardOpen, setWizardOpen] = useState(false)
  const [medModalOpen, setMedModalOpen] = useState(false)
  const [showInfo, setShowInfo] = useState(false)

  const load = useCallback(async () => {
    const [all, allMeds] = await Promise.all([getAllGutEntries(), getAllMedications()])
    setEntries(all.sort((a, b) => {
      const dc = b.date.localeCompare(a.date)
      if (dc !== 0) return dc
      return (b.time || '').localeCompare(a.time || '')
    }))
    // Filter registered medications that target 'gut'
    const filtered = allMeds.filter(m => getMedGraphTargets(m.name).includes('gut'))
    setGutMeds(filtered)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleDelete(id) {
    if (!confirm('Ta bort anteckning?')) return
    await deleteGutEntry(id)
    await load()
    onDataChange?.()
  }

  function handleSaved() {
    setWizardOpen(false)
    load()
    onDataChange?.()
  }

  function bristolSummary(entry) {
    if (entry.bristolTypes && entry.bristolTypes.length > 0) {
      const counts = {}
      for (const t of entry.bristolTypes) counts[t] = (counts[t] || 0) + 1
      return Object.entries(counts)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([t, c]) => c > 1 ? `Typ ${t} ×${c}` : `Typ ${t}`)
        .join(', ')
    }
    if (entry.bristolType) return `Typ ${entry.bristolType}`
    return null
  }

  function medSummary(entry) {
    if (entry.medications && typeof entry.medications === 'object') {
      return Object.entries(entry.medications)
        .filter(([, d]) => d > 0)
        .map(([id, d]) => {
          const med = gutMeds.find(m => String(m.id) === String(id))
          const name = med ? med.name : id
          return d > 1 ? `${name} ×${d}` : name
        })
        .join(', ')
    }
    return null
  }

  const isFlush = e => e.bristolType || (e.bristolTypes && e.bristolTypes.length > 0)
  const isMedEntry = e => e.medications && Object.values(e.medications).some(v => v > 0)

  return (
    <div className="view-content">
      <div className="card">
        <div className="card-header-row">
          <h2 className="card-title">📔 Dagbok – Tarm</h2>
        </div>
        <p className="card-desc">Registrera varje tömning och tagen tarmmedicin separat.</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
          <button className="btn-primary pain-add-btn" onClick={() => setWizardOpen(true)}>
            + Registrera tömning
          </button>
          <button className="btn-secondary" onClick={() => setMedModalOpen(true)}>
            💊 Tarmmedicin
          </button>
        </div>
      </div>

      {/* Info card */}
      <div className="card">
        <button className="info-toggle-btn" onClick={() => setShowInfo(v => !v)}>
          ℹ Förstoppning – information {showInfo ? '▲' : '▼'}
        </button>
        {showInfo && (
          <div className="info-expand">
            <p className="card-desc"><strong>Normal avföringsfrekvens</strong> hos vuxna: 3/dag – 3/vecka.</p>
            <p className="card-desc">Förstoppning = ≤2 tömningar/vecka, hård konsistens (Bristol 1–2) eller smärta vid tömning.</p>
            <p className="card-desc"><strong>Åtgärder:</strong> Rikligt vätskeintag, fiberrik kost, regelbunden toalett-rutin, fysisk aktivitet.</p>
            <p className="card-desc"><strong>Röda flaggor</strong> (kontakta läkare): blod i avföring, viktnedgång, nattliga symtom.</p>
          </div>
        )}
      </div>

      {entries.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📔</div>
          <p>Inga anteckningar ännu.<br />Registrera en tömning ovan.</p>
        </div>
      ) : (
        <div className="card">
          <h3 className="card-title">Historik</h3>
          <div className="gut-list">
            {entries.map(e => {
              const summary = bristolSummary(e)
              const meds = medSummary(e)
              const bType = e.bristolType || (e.bristolTypes?.[0])
              const bColor = bType ? (BRISTOL_TYPES.find(b => b.type === bType)?.color || '#64748b') : null
              return (
                <div key={e.id} className="gut-item">
                  <div className="gut-item-header">
                    <span className="gut-date">
                      {formatDateSv(e.date)}{e.time ? ` ${e.time}` : ''}
                    </span>
                    <button className="btn-delete" onClick={() => handleDelete(e.id)}>×</button>
                  </div>
                  <div className="gut-item-body">
                    {summary ? (
                      <span className="gut-bristol" style={{ color: bColor || undefined }}>{summary}</span>
                    ) : (
                      <span className="gut-bristol" style={{ color: '#64748b' }}>💊 Medicinregistrering</span>
                    )}
                    <div className="gut-meta-row">
                      {isFlush(e) && <span className="gut-chip">💩 1 tömn.</span>}
                      {e.pain > 0 && <span className="gut-chip">Smärta: {GRADE_LABELS[e.pain]}</span>}
                      {e.bloating > 0 && <span className="gut-chip">Uppblåst: {GRADE_LABELS[e.bloating]}</span>}
                      {e.gas > 0 && <span className="gut-chip">Gas: {GRADE_LABELS[e.gas]}</span>}
                      {meds && <span className="gut-chip gut-chip-lax">💊 {meds}</span>}
                    </div>
                    {(e.notes || e.note) && <span className="gut-notes">📝 {e.notes || e.note}</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {wizardOpen && (
        <GutWizard onSave={handleSaved} onClose={() => setWizardOpen(false)} />
      )}
      {medModalOpen && (
        <GutMedModal
          gutMeds={gutMeds}
          onSave={() => { setMedModalOpen(false); load(); onDataChange?.() }}
          onClose={() => setMedModalOpen(false)}
        />
      )}
    </div>
  )
}
