import { useState, useEffect, useCallback } from 'react'
import { addMedication, getAllMedications, deleteMedication, updateMedication } from '../db/db'
import { formatDateSv } from '../utils/bp'

export default function MedicationsView({ onDataChange }) {
  const [medications, setMedications] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(emptyForm())

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
    setForm(emptyForm()); setShowForm(false); setEditId(null)
    await load(); onDataChange?.()
  }

  async function handleDelete(id) {
    if (!confirm('Ta bort medicin?')) return
    await deleteMedication(id)
    await load(); onDataChange?.()
  }

  function handleEdit(med) {
    setForm({ name: med.name, startDate: med.startDate, dose: med.dose || '', note: med.note || '' })
    setEditId(med.id); setShowForm(true)
  }

  function handleCancel() {
    setForm(emptyForm()); setShowForm(false); setEditId(null)
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
