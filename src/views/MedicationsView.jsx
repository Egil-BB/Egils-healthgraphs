import { useState, useEffect, useCallback, useRef } from 'react'
import { addMedication, getAllMedications, deleteMedication, updateMedication } from '../db/db'
import { formatDateSv } from '../utils/bp'
import { COMMON_MEDICATIONS, fassUrl, findDrug, searchDrugs } from '../utils/medications'

export default function MedicationsView({ onDataChange }) {
  const [medications, setMedications] = useState([])
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
      note: ''
    }
  }

  const load = useCallback(async () => {
    const meds = await getAllMedications()
    setMedications(meds.sort((a, b) => b.startDate.localeCompare(a.startDate)))
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
    setForm({ name: med.name, startDate: med.startDate, dose: med.dose || '', note: med.note || '' })
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
        <p className="card-desc">Mediciner visas som markörer i blodtrycks-, kolesterol- och sockergrafen.</p>
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
            <div className="form-actions">
              <button type="submit" className="btn-primary">
                {editId ? 'Spara ändringar' : 'Lägg till'}
              </button>
              <button type="button" className="btn-secondary" onClick={handleCancel}>Avbryt</button>
            </div>
          </form>
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
                  </div>
                  <div className="med-meta">
                    <span className="med-date">Startdatum: {formatDateSv(med.startDate)}</span>
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
