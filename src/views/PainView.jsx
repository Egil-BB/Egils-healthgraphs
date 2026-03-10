import { useState, useEffect } from 'react'
import { addPainEntry, getAllPainEntries, deletePainEntry, getAllMedications } from '../db/db'
import { getMedGraphTargets } from '../utils/medications'

// ── Constants ─────────────────────────────────────────────────────────────────

const QUALITY_OPTIONS = [
  { id: 'aching',   label: 'Molande',     hint: 'Nociceptiv, inflammatorisk' },
  { id: 'burning',  label: 'Brännande',   hint: 'Neuropatisk smärta' },
  { id: 'stabbing', label: 'Huggande',    hint: 'Akut nociceptiv' },
  { id: 'throbbing',label: 'Dunkande',    hint: 'Vaskulärt, inflammation' },
  { id: 'cramping', label: 'Krampartad',  hint: 'Tarm, muskelspasm' },
  { id: 'pressure', label: 'Tryckande',   hint: 'Spänningshuvudvärk' },
]

// SVG body zones
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function nrsColor(v) {
  if (v == null) return '#64748b'
  if (v <= 3) return '#16a34a'
  if (v <= 6) return '#ca8a04'
  return '#dc2626'
}

function computeWarnings(entries) {
  const warnings = []
  if (!entries.length) return warnings
  const today = new Date().toISOString().slice(0, 10)

  const last7days = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    last7days.push(d.toISOString().slice(0, 10))
  }
  let consecutiveHighNrs = 0
  for (const day of last7days) {
    const dayEntries = entries.filter(e => e.date === day)
    if (dayEntries.length > 0 && Math.max(...dayEntries.map(e => e.nrs ?? 0)) >= 7) {
      consecutiveHighNrs++
    } else {
      break
    }
  }
  if (consecutiveHighNrs >= 3) {
    warnings.push({ id: 'highNrs', level: 'warn', msg: 'Du har registrerat hög smärta flera dagar i rad. Om smärtan kvarstår kan det vara läge att kontakta din vårdcentral.' })
  }

  const opioidKeywords = ['tramadol', 'kodein', 'morfin', 'oxikodon', 'dolcontin', 'oxynorm', 'oxycontin']
  const opioidDays = new Set()
  for (const day of last7days) {
    const dayEntries = entries.filter(e => e.date === day)
    if (dayEntries.some(e => {
      const meds = e.medications || {}
      return Object.entries(meds).some(([id, cnt]) =>
        cnt > 0 && opioidKeywords.some(k => id.toLowerCase().includes(k))
      )
    })) {
      opioidDays.add(day)
    }
  }
  if (opioidDays.size >= 5) {
    warnings.push({ id: 'opioid', level: 'danger', msg: 'Du har tagit starka smärtstillande läkemedel många dagar i rad. Tala med din läkare om du behöver hjälp med smärtlindringen.' })
  }

  return warnings
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
        <ellipse cx="50" cy="14" rx="11" ry="13" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="0.5" />
        <rect x="22" y="30" width="56" height="48" rx="4" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="0.5" />
        <rect x="4" y="30" width="18" height="44" rx="3" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="0.5" />
        <rect x="78" y="30" width="18" height="44" rx="3" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="0.5" />
        <rect x="24" y="78" width="22" height="66" rx="3" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="0.5" />
        <rect x="54" y="78" width="22" height="66" rx="3" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="0.5" />
        {BODY_ZONES.map(zone => {
          const [x, y, w, h] = zone.rect
          const active = selected.includes(zone.id)
          return (
            <rect
              key={zone.id}
              x={x} y={y} width={w} height={h} rx={2}
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

function MedCounter({ painMeds, medCounts, onChange }) {
  const increment = (id) => onChange({ ...medCounts, [id]: (medCounts[id] || 0) + 1 })
  const decrement = (id) => onChange({ ...medCounts, [id]: Math.max(0, (medCounts[id] || 0) - 1) })
  const opioidKeywords = ['tramadol', 'kodein', 'morfin', 'oxikodon', 'dolcontin', 'oxynorm', 'oxycontin']

  return (
    <div className="pain-meds">
      {painMeds.length === 0 && (
        <p style={{ color: '#64748b', fontSize: 14, padding: '4px 0' }}>
          Inga smärtmediciner registrerade. Lägg till dem under Mediciner.
        </p>
      )}
      {painMeds.map(med => {
        const isOpioid = opioidKeywords.some(k => med.name.toLowerCase().includes(k))
        return (
          <div key={med.id} className={`pain-med-row ${isOpioid ? 'pain-med-opioid' : ''}`}>
            <span className="pain-med-label">
              {med.name}{med.dose ? ` ${med.dose}` : ''}{isOpioid ? ' ⚠' : ''}
            </span>
            <div className="pain-med-controls">
              <button type="button" onClick={() => decrement(med.id)} className="pain-med-btn">−</button>
              <span className="pain-med-count">{medCounts[med.id] || 0}</span>
              <button type="button" onClick={() => increment(med.id)} className="pain-med-btn">+</button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Pain wizard ────────────────────────────────────────────────────────────────

function PainWizard({ painMeds, onSave, onClose }) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({ nrs: 5, pegEnjoy: 5, pegActivity: 5, locations: [] })
  const pegScore = ((form.nrs + form.pegEnjoy + form.pegActivity) / 3).toFixed(1)
  const today = new Date().toISOString().slice(0, 10)
  const time = new Date().toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })

  async function handleSave() {
    await addPainEntry({
      id: `pain_${Date.now()}`, date: today, time,
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
            <SliderField label="Hur ont gör det just nu?" value={form.nrs}
              onChange={v => setForm(f => ({ ...f, nrs: v }))}
              minLabel="0 = Ingen smärta" maxLabel="10 = Värsta tänkbara" />
            <SliderField label="Hur mycket stör smärtan din livsglädje?" value={form.pegEnjoy}
              onChange={v => setForm(f => ({ ...f, pegEnjoy: v }))}
              minLabel="0 = Ingen påverkan" maxLabel="10 = Förstör helt" />
            <SliderField label="Hur mycket stör smärtan dina dagliga aktiviteter?" value={form.pegActivity}
              onChange={v => setForm(f => ({ ...f, pegActivity: v }))}
              minLabel="0 = Ingen påverkan" maxLabel="10 = Klarar ingenting" />
          </div>
        )}

        {step === 2 && (
          <div className="pain-wizard-step">
            <h3 className="pain-step-title">Steg 2 av 2 — Lokalisering (valfritt)</h3>
            <BodyMap selected={form.locations}
              onChange={locs => setForm(f => ({ ...f, locations: locs }))} />
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

function PrnModal({ painMeds, onSave, onClose }) {
  const [medCounts, setMedCounts] = useState({})
  const today = new Date().toISOString().slice(0, 10)
  const time = new Date().toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })
  const hasAny = Object.values(medCounts).some(v => v > 0)

  async function handleSave() {
    await addPainEntry({
      id: `pain_${Date.now()}`, date: today, time,
      nrs: null, pegEnjoy: null, pegActivity: null, pegScore: null,
      locations: [],
      medications: { ...medCounts },
    })
    onSave()
  }

  return (
    <div className="pain-wizard-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="pain-wizard">
        <button className="pain-wizard-close" onClick={onClose}>✕</button>
        <h3 className="pain-step-title">💊 Behovsmedicin tagen</h3>
        <MedCounter painMeds={painMeds} medCounts={medCounts} onChange={setMedCounts} />
        <div className="pain-wizard-nav">
          <button type="button" className="btn-secondary" onClick={onClose}>Avbryt</button>
          <button type="button" className="btn-primary" disabled={!hasAny || painMeds.length === 0} onClick={handleSave}>Spara</button>
        </div>
      </div>
    </div>
  )
}

// ── Main view ─────────────────────────────────────────────────────────────────

export default function PainView({ onDataChange }) {
  const [entries, setEntries] = useState([])
  const [painMeds, setPainMeds] = useState([])
  const [wizardOpen, setWizardOpen] = useState(false)
  const [prnOpen, setPrnOpen] = useState(false)
  const [warnings, setWarnings] = useState([])
  const [dismissedWarnings, setDismissedWarnings] = useState([])

  async function load() {
    const [all, allMeds] = await Promise.all([getAllPainEntries(), getAllMedications()])
    const sorted = [...all].sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''))
    setEntries(sorted)
    setWarnings(computeWarnings(sorted))
    const filtered = allMeds.filter(m => getMedGraphTargets(m.name).includes('pain'))
    setPainMeds(filtered)
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

  function medLabel(e) {
    if (!e.medications) return null
    const meds = e.medications
    return Object.entries(meds)
      .filter(([, cnt]) => cnt > 0)
      .map(([id, cnt]) => {
        const med = painMeds.find(m => String(m.id) === String(id))
        const name = med ? med.name : id
        return cnt > 1 ? `${name} ×${cnt}` : name
      })
      .join(', ')
  }

  return (
    <div className="view-content">
      <div className="card">
        <h2 className="card-title">🩻 Smärtdagbok</h2>
        <p className="card-desc" style={{ fontSize: 13, marginBottom: 12 }}>
          Registrera smärta med NRS-skala och PEG. Grafer visas under Grafer → Smärta.
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

      {/* History */}
      {sorted.length > 0 && (
        <div className="card">
          <h3 className="card-title">Historik</h3>
          {sorted.map(e => {
            const locLabels = BODY_ZONES.filter(z => e.locations?.includes(z.id)).map(z => z.label)
            const meds = medLabel(e)
            return (
              <div key={e.id} className="pain-history-item">
                <div className="pain-history-header">
                  <span className="pain-history-date">{e.date} {e.time}</span>
                  <button className="delete-btn" onClick={() => handleDelete(e.id)}>✕</button>
                </div>
                <div className="pain-history-vals">
                  {e.nrs != null && <span style={{ color: nrsColor(e.nrs) }} className="pain-hist-nrs">NRS {e.nrs}</span>}
                  {e.pegScore != null && <span style={{ color: nrsColor(e.pegScore) }} className="pain-hist-peg">PEG {e.pegScore}</span>}
                  {e.nrs == null && <span className="pain-hist-prn">💊 Behovsmedicin</span>}
                </div>
                {locLabels.length > 0 && <div className="pain-history-locs">📍 {locLabels.join(', ')}</div>}
                {e.quality?.length > 0 && (
                  <div className="pain-history-quality">
                    {e.quality.map(q => QUALITY_OPTIONS.find(o => o.id === q)?.label).filter(Boolean).join(' · ')}
                  </div>
                )}
                {meds && <div className="pain-history-meds">💊 {meds}</div>}
                {e.notes && <div className="pain-history-notes">{e.notes}</div>}
              </div>
            )
          })}
        </div>
      )}

      {wizardOpen && (
        <PainWizard painMeds={painMeds} onSave={handleSaved} onClose={() => setWizardOpen(false)} />
      )}
      {prnOpen && (
        <PrnModal
          painMeds={painMeds}
          onSave={() => { setPrnOpen(false); load(); onDataChange?.() }}
          onClose={() => setPrnOpen(false)}
        />
      )}
    </div>
  )
}
