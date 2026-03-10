import { useState, useEffect, useCallback, useRef } from 'react'
import { addMedication, getAllMedications, deleteMedication, updateMedication, getAllLabs } from '../db/db'
import { formatDateSv } from '../utils/bp'
import { COMMON_MEDICATIONS, fassUrl, findDrug, searchDrugs } from '../utils/medications'

// Medication names that trigger dehydration warning
const DEHYDRATION_MEDS = ['Metformin', 'Losartan', 'Valsartan', 'Kandesartan', 'Irbesartan', 'Olmesartan',
  'Telmisartan', 'Enalapril', 'Ramipril', 'Lisinopril', 'Perindopril',
  'Hydroklortiazid', 'Klortalidon', 'Indapamid', 'Spironolakton',
  'Losartan/Hydroklortiazid', 'Valsartan/Hydroklortiazid', 'Kandesartan/Hydroklortiazid']
const ARB_ACE_HKTZ = ['Losartan', 'Valsartan', 'Kandesartan', 'Irbesartan', 'Olmesartan', 'Telmisartan',
  'Enalapril', 'Ramipril', 'Lisinopril', 'Perindopril', 'Hydroklortiazid', 'Klortalidon', 'Indapamid',
  'Losartan/Hydroklortiazid', 'Valsartan/Hydroklortiazid', 'Kandesartan/Hydroklortiazid']
const ARB_ACE = ['Losartan', 'Valsartan', 'Kandesartan', 'Irbesartan', 'Olmesartan', 'Telmisartan',
  'Enalapril', 'Ramipril', 'Lisinopril', 'Perindopril']
const NSAIDS = ['ibuprofen', 'naproxen', 'diklofenak', 'piroxikam', 'indometacin', 'celecoxib', 'etoricoxib', 'meloxikam', 'ipren', 'voltaren', 'pronaxen']

function getMedWarnings(medications, latestEgfr, latestCreatinine) {
  const names = medications.map(m => m.name)
  const namesLower = names.map(n => n.toLowerCase())
  const warnings = []
  const hasMetformin = namesLower.some(n => n.includes('metformin'))
  const hasArbOrHktz = namesLower.some(n => ARB_ACE_HKTZ.some(a => n.includes(a.toLowerCase())))
  const hasArbOrAce = namesLower.some(n => ARB_ACE.some(a => n.includes(a.toLowerCase())))
  const hasNsaid = namesLower.some(n => NSAIDS.some(s => n.includes(s)))
  const hasDehydrationMed = namesLower.some(n => DEHYDRATION_MEDS.some(d => n.includes(d.toLowerCase())))

  if (hasDehydrationMed) {
    warnings.push({
      type: 'dehydration',
      icon: '💧',
      title: 'Pausera vid risk för uttorkning',
      text: `${[hasMetformin ? 'Metformin' : null, hasArbOrHktz ? 'ARB/ACE-hämmare och/eller diuretika' : null].filter(Boolean).join(' och ')} bör pausas vid feber, kräkningar, diarré eller andra tillstånd med risk för uttorkning. Kontakta din vårdgivare för instruktioner om när och hur länge du ska pausa.`,
      link: 'https://www.1177.se'
    })
  }

  if (hasMetformin) {
    if (latestEgfr !== null && latestEgfr < 45) {
      warnings.push({
        type: 'danger',
        icon: '⚠️',
        title: 'Metformin – kontrollera njurfunktion',
        text: `Ditt senaste eGFR är ${latestEgfr} mL/min. Vid eGFR 30–45 bör Metformindosen halveras och noggrant följas. Vid eGFR < 30 är Metformin kontraindicerat. Diskutera med din läkare.`,
        link: 'https://www.fass.se'
      })
    } else if (latestCreatinine !== null && latestCreatinine > 110) {
      warnings.push({
        type: 'warn',
        icon: '⚠',
        title: 'Metformin – förhöjt kreatinin',
        text: `Kreatinin ${latestCreatinine} µmol/L. Be din läkare beräkna eGFR för att säkerställa att Metformin är säkert i din nuvarande dos.`,
        link: 'https://www.1177.se'
      })
    }
  }

  if (hasArbOrHktz) {
    warnings.push({
      type: 'info',
      icon: 'ℹ',
      title: 'Nya prover efter dosändring av ARB/ACE/diuretika',
      text: 'Efter dosändring av ARB, ACE-hämmare eller diuretika (t.ex. Losartan, Hydroklortiazid) rekommenderas nya blodprover kring 2 veckor senare för kontroll av njurfunktion (kreatinin/eGFR) och elektrolyter (kalium), eftersom dessa läkemedel kan påverka båda.',
      link: 'https://www.1177.se'
    })
  }

  if (hasNsaid && hasArbOrAce) {
    warnings.push({
      type: 'warn',
      icon: '⚠️',
      title: 'NSAID + ARB/ACE-hämmare – viktigt att känna till',
      text: 'NSAID-tabletter såsom ibuprofen och naproxen kan tillfälligt försämra njurfunktionen när de tas tillsammans med ARB/ACE-hämmare.\n\nOm du behöver smärtlindring är paracetamol förstahandsval. Om du någon gång tar NSAID-preparat bör det vara låg dos och bara några få dagar, och du ska undvika det helt om du är magsjuk, uttorkad eller har feber med dåligt vätskeintag.',
      link: 'https://www.1177.se'
    })
  }

  return warnings
}

export default function MedicationsView({ onDataChange }) {
  const [medications, setMedications] = useState([])
  const [medWarnings, setMedWarnings] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(emptyForm())
  const [pickerDrug, setPickerDrug] = useState(null)
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef = useRef(null)

  function emptyForm() {
    return {
      name: '',
      startDate: new Date().toISOString().slice(0, 10),
      dose: '',
      note: '',
      prn: false,
    }
  }

  const load = useCallback(async () => {
    const [meds, labs] = await Promise.all([getAllMedications(), getAllLabs()])
    const sorted = meds.sort((a, b) => b.startDate.localeCompare(a.startDate))
    setMedications(sorted)
    const latestEgfr = labs.filter(l => l.type === 'egfr').sort((a, b) => b.date.localeCompare(a.date))[0]?.value ?? null
    const latestKrea = labs.filter(l => l.type === 'creatinine').sort((a, b) => b.date.localeCompare(a.date))[0]?.value ?? null
    setMedWarnings(getMedWarnings(sorted, latestEgfr, latestKrea))
  }, [])

  useEffect(() => { load() }, [load])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    if (editId) {
      await updateMedication(editId, form)
    } else {
      await addMedication(form)
    }
    setForm(emptyForm()); setShowForm(false); setEditId(null); setPickerDrug(null)
    setSuggestions([]); setShowSuggestions(false)
    await load(); onDataChange?.()
  }

  async function handleDelete(id) {
    if (!confirm('Ta bort medicin?')) return
    await deleteMedication(id)
    await load(); onDataChange?.()
  }

  function handleEdit(med) {
    setForm({ name: med.name, startDate: med.startDate, dose: med.dose || '', note: med.note || '', prn: med.prn || false })
    setPickerDrug(findDrug(med.name))
    setEditId(med.id); setShowForm(true)
    setSuggestions([]); setShowSuggestions(false)
  }

  function handleCancel() {
    setForm(emptyForm()); setShowForm(false); setEditId(null); setPickerDrug(null)
    setSuggestions([]); setShowSuggestions(false)
  }

  function handleNameChange(val) {
    setForm(f => ({ ...f, name: val }))
    if (val.length >= 2) {
      const found = searchDrugs(val)
      setSuggestions(found)
      setShowSuggestions(found.length > 0)
    } else {
      setSuggestions([])
      setShowSuggestions(false)
    }
    // Clear picker drug if name changes away from preset
    if (!findDrug(val)) setPickerDrug(null)
  }

  function handleSelectSuggestion(drug) {
    setPickerDrug(drug)
    setForm(f => ({ ...f, name: drug.name, dose: '' }))
    setSuggestions([])
    setShowSuggestions(false)
  }

  return (
    <div className="view-content">
      <div className="card">
        <div className="card-header-row">
          <h2 className="card-title">Mediciner</h2>
          {!showForm && (
            <button className="btn-add" onClick={() => setShowForm(true)}>+ Lägg till</button>
          )}
        </div>
        <p className="card-desc">Mediciner visas som markörer i relaterade grafer (blodtryck, kolesterol, socker, vikt, smärta, tarm).</p>
      </div>

      {showForm && (
        <div className="card">
          <h3 className="card-title">{editId ? 'Redigera medicin' : 'Ny medicin'}</h3>
          <form onSubmit={handleSubmit} className="med-form">

            {/* Autocomplete name input */}
            <div className="form-group" style={{ position: 'relative' }}>
              <label>Namn *</label>
              <input
                ref={inputRef}
                type="text"
                value={form.name}
                onChange={e => handleNameChange(e.target.value)}
                onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true) }}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                placeholder="Börja skriva läkemedelsnamn..."
                required
                className="form-input"
                autoComplete="off"
              />
              {showSuggestions && suggestions.length > 0 && (
                <div className="autocomplete-dropdown">
                  {suggestions.map(drug => (
                    <button
                      key={drug.name}
                      type="button"
                      className="autocomplete-item"
                      onMouseDown={() => handleSelectSuggestion(drug)}
                    >
                      <span className="autocomplete-drug-name">{drug.name}</span>
                      <span className="autocomplete-drug-class">{drug.drugClass}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Strength pills when preset selected */}
            {pickerDrug && (
              <div className="form-group">
                <label>Styrka</label>
                <div className="strength-pills">
                  {pickerDrug.strengths.map(s => (
                    <button
                      key={s}
                      type="button"
                      className={`strength-pill ${form.dose === s ? 'strength-pill-active' : ''}`}
                      onClick={() => setForm(f => ({ ...f, dose: s }))}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <a
                  href={fassUrl(pickerDrug.fass)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="fass-link"
                >
                  FASS – {pickerDrug.name} ↗
                </a>
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label>Startdatum *</label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                  required
                  className="form-input"
                />
              </div>
              {!pickerDrug && (
                <div className="form-group">
                  <label>Dos</label>
                  <input
                    type="text"
                    value={form.dose}
                    onChange={e => setForm(f => ({ ...f, dose: e.target.value }))}
                    placeholder="t.ex. 10 mg × 1"
                    className="form-input"
                  />
                </div>
              )}
            </div>
            <div className="form-group">
              <label>Anteckning</label>
              <input
                type="text"
                value={form.note}
                onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                placeholder="Valfri notering..."
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label className="toggle-label" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={form.prn}
                  onChange={e => setForm(f => ({ ...f, prn: e.target.checked }))}
                />
                Vid behov (v.b.) – tas inte regelbundet
              </label>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn-primary">
                {editId ? 'Spara ändringar' : 'Lägg till'}
              </button>
              <button type="button" className="btn-secondary" onClick={handleCancel}>Avbryt</button>
            </div>
          </form>
        </div>
      )}

      {/* Clinical warnings based on active medications */}
      {medWarnings.length > 0 && (
        <div className="card">
          <h3 className="card-title">Viktigt att veta om dina mediciner</h3>
          {medWarnings.map((w, i) => (
            <div key={i} className={`med-warning med-warning-${w.type}`}>
              <div className="med-warning-header">
                <span className="med-warning-icon">{w.icon}</span>
                <span className="med-warning-title">{w.title}</span>
              </div>
              <p className="med-warning-text" style={{ whiteSpace: 'pre-line' }}>{w.text}</p>
              <a href={w.link} target="_blank" rel="noopener noreferrer" className="med-warning-link">
                Läs mer på 1177 ↗
              </a>
            </div>
          ))}
        </div>
      )}

      {medications.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">💊</div>
          <p>Inga mediciner registrerade.<br />Lägg till dina mediciner för att se dem i graferna.</p>
        </div>
      ) : (
        <div className="card">
          <div className="med-list">
            {medications.map(med => {
              const drug = findDrug(med.name)
              return (
                <div key={med.id} className="med-item">
                  <div className="med-main">
                    <span className="med-name">{med.name}</span>
                    {med.dose && <span className="med-dose">{med.dose}</span>}
                    {med.prn && <span className="med-prn-badge">v.b.</span>}
                  </div>
                  <div className="med-meta">
                    <span className="med-date">{med.prn ? 'Tillagd: ' : 'Startdatum: '}{formatDateSv(med.startDate)}</span>
                    {med.note && <span className="med-note">📝 {med.note}</span>}
                  </div>
                  <div className="med-actions">
                    {drug && (
                      <a
                        href={fassUrl(drug.fass)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-fass"
                      >
                        FASS ↗
                      </a>
                    )}
                    <button className="btn-edit" onClick={() => handleEdit(med)}>Redigera</button>
                    <button className="btn-delete" onClick={() => handleDelete(med.id)}>×</button>
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
