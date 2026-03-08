import { useState, useEffect, useCallback } from 'react'
import { addMedication, getAllMedications, deleteMedication, updateMedication } from '../db/db'
import { formatDateSv } from '../utils/bp'

const COMMON_MEDICATIONS = [
  {
    class: 'ACE-hämmare',
    drugs: [
      { name: 'Enalapril', strengths: ['2,5 mg', '5 mg', '10 mg', '20 mg'], fass: 'enalapril' },
      { name: 'Ramipril', strengths: ['1,25 mg', '2,5 mg', '5 mg', '10 mg'], fass: 'ramipril' },
      { name: 'Lisinopril', strengths: ['2,5 mg', '5 mg', '10 mg', '20 mg'], fass: 'lisinopril' },
      { name: 'Perindopril', strengths: ['2 mg', '4 mg', '8 mg'], fass: 'perindopril' },
    ]
  },
  {
    class: 'ARB (angiotensin II-antagonist)',
    drugs: [
      { name: 'Losartan', strengths: ['25 mg', '50 mg', '100 mg'], fass: 'losartan' },
      { name: 'Valsartan', strengths: ['40 mg', '80 mg', '160 mg', '320 mg'], fass: 'valsartan' },
      { name: 'Kandesartan', strengths: ['4 mg', '8 mg', '16 mg', '32 mg'], fass: 'kandesartan' },
      { name: 'Irbesartan', strengths: ['75 mg', '150 mg', '300 mg'], fass: 'irbesartan' },
      { name: 'Olmesartan', strengths: ['10 mg', '20 mg', '40 mg'], fass: 'olmesartan' },
      { name: 'Telmisartan', strengths: ['20 mg', '40 mg', '80 mg'], fass: 'telmisartan' },
    ]
  },
  {
    class: 'Kalciumantagonist',
    drugs: [
      { name: 'Amlodipin', strengths: ['2,5 mg', '5 mg', '10 mg'], fass: 'amlodipin' },
      { name: 'Felodipin', strengths: ['2,5 mg', '5 mg', '10 mg'], fass: 'felodipin' },
      { name: 'Lerkanidipin', strengths: ['10 mg', '20 mg'], fass: 'lerkanidipin' },
    ]
  },
  {
    class: 'Diuretika',
    drugs: [
      { name: 'Hydroklortiazid', strengths: ['12,5 mg', '25 mg'], fass: 'hydroklortiazid' },
      { name: 'Klortalidon', strengths: ['12,5 mg', '25 mg', '50 mg'], fass: 'klortalidon' },
      { name: 'Indapamid', strengths: ['1,25 mg', '2,5 mg'], fass: 'indapamid' },
      { name: 'Spironolakton', strengths: ['25 mg', '50 mg', '100 mg'], fass: 'spironolakton' },
      { name: 'Eplerenon', strengths: ['25 mg', '50 mg'], fass: 'eplerenon' },
    ]
  },
  {
    class: 'Betablockerare',
    drugs: [
      { name: 'Metoprolol', strengths: ['25 mg', '50 mg', '100 mg', '200 mg'], fass: 'metoprolol' },
      { name: 'Bisoprolol', strengths: ['1,25 mg', '2,5 mg', '5 mg', '10 mg'], fass: 'bisoprolol' },
      { name: 'Atenolol', strengths: ['25 mg', '50 mg', '100 mg'], fass: 'atenolol' },
      { name: 'Karvedilol', strengths: ['3,125 mg', '6,25 mg', '12,5 mg', '25 mg'], fass: 'karvedilol' },
    ]
  },
  {
    class: 'Kombinationspreparat',
    drugs: [
      { name: 'Losartan/Hydroklortiazid', strengths: ['50/12,5 mg', '100/12,5 mg', '100/25 mg'], fass: 'losartan+hydroklortiazid' },
      { name: 'Valsartan/Hydroklortiazid', strengths: ['80/12,5 mg', '160/12,5 mg', '160/25 mg', '320/25 mg'], fass: 'valsartan+hydroklortiazid' },
      { name: 'Kandesartan/Hydroklortiazid', strengths: ['8/12,5 mg', '16/12,5 mg', '32/25 mg'], fass: 'kandesartan+hydroklortiazid' },
      { name: 'Amlodipin/Valsartan', strengths: ['5/80 mg', '5/160 mg', '10/160 mg', '5/320 mg', '10/320 mg'], fass: 'amlodipin+valsartan' },
      { name: 'Amlodipin/Ramipril', strengths: ['5/5 mg', '5/10 mg', '10/5 mg', '10/10 mg'], fass: 'amlodipin+ramipril' },
      { name: 'Olmesartan/Amlodipin', strengths: ['20/5 mg', '40/5 mg', '40/10 mg'], fass: 'olmesartan+amlodipin' },
    ]
  },
  {
    class: 'Centralt verkande / övrigt',
    drugs: [
      { name: 'Moxonidin', strengths: ['0,2 mg', '0,3 mg', '0,4 mg'], fass: 'moxonidin' },
      { name: 'Doxazosin', strengths: ['1 mg', '2 mg', '4 mg', '8 mg'], fass: 'doxazosin' },
    ]
  },
]

function fassUrl(query) {
  return `https://www.fass.se/LIF/result?query=${encodeURIComponent(query)}&userType=2`
}

function findDrug(name) {
  for (const cls of COMMON_MEDICATIONS) {
    const drug = cls.drugs.find(d => d.name === name)
    if (drug) return drug
  }
  return null
}

export default function MedicationsView({ onDataChange }) {
  const [medications, setMedications] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(emptyForm())
  const [pickerDrug, setPickerDrug] = useState(null)

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
  }

  function handleCancel() {
    setForm(emptyForm()); setShowForm(false); setEditId(null); setPickerDrug(null)
  }

  function handlePresetSelect(value) {
    if (!value) { setPickerDrug(null); return }
    const drug = findDrug(value)
    if (drug) {
      setPickerDrug(drug)
      setForm(f => ({ ...f, name: drug.name, dose: '' }))
    }
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
        <p className="card-desc">Mediciner visas som markörer i blodtrycksgrafen.</p>
      </div>

      {showForm && (
        <div className="card">
          <h3 className="card-title">{editId ? 'Redigera medicin' : 'Ny medicin'}</h3>
          <form onSubmit={handleSubmit} className="med-form">

            {/* Preset picker */}
            <div className="form-group">
              <label>Välj vanligt blodtrycksläkemedel</label>
              <select
                className="form-input"
                value={pickerDrug?.name || ''}
                onChange={e => handlePresetSelect(e.target.value)}
              >
                <option value="">– eller skriv eget namn nedan –</option>
                {COMMON_MEDICATIONS.map(cls => (
                  <optgroup key={cls.class} label={cls.class}>
                    {cls.drugs.map(drug => (
                      <option key={drug.name} value={drug.name}>{drug.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
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

            <div className="form-group">
              <label>Namn *</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="t.ex. Enalapril"
                required
                className="form-input"
              />
            </div>
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
          <p>Inga mediciner registrerade.<br />Lägg till dina blodtrycksmediciner för att se dem i grafen.</p>
        </div>
      ) : (
        <div className="card">
          <div className="med-list">
            {medications.map(med => (
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
                  {findDrug(med.name) && (
                    <a
                      href={fassUrl(findDrug(med.name).fass)}
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
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
