import { useState, useEffect, useCallback } from 'react'
import { addLab, getAllLabs, deleteLab } from '../db/db'
import { LAB_TYPES } from '../utils/score2'
import { formatDateSv } from '../utils/bp'

export default function LabsView({ onDataChange }) {
  const [labs, setLabs] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm())

  function emptyForm() {
    return {
      date: new Date().toISOString().slice(0, 10),
      type: 'totalCholesterol',
      value: '',
      unit: 'mmol/L',
      note: ''
    }
  }

  const load = useCallback(async () => {
    const data = await getAllLabs()
    setLabs(data.sort((a, b) => b.date.localeCompare(a.date)))
  }, [])

  useEffect(() => { load() }, [load])

  function handleTypeChange(type) {
    const labType = LAB_TYPES.find(t => t.value === type)
    setForm(f => ({ ...f, type, unit: labType?.unit || '' }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.value) return
    await addLab({
      date: form.date,
      type: form.type,
      value: parseFloat(form.value),
      unit: form.unit,
      note: form.note.trim() || null
    })
    setForm(emptyForm()); setShowForm(false)
    await load(); onDataChange?.()
  }

  async function handleDelete(id) {
    if (!confirm('Ta bort provsvaret?')) return
    await deleteLab(id)
    await load(); onDataChange?.()
  }

  const grouped = {}
  for (const lab of labs) {
    if (!grouped[lab.date]) grouped[lab.date] = []
    grouped[lab.date].push(lab)
  }

  return (
    <div className="view-content">
      <div className="card">
        <div className="card-header-row">
          <h2 className="card-title">Provsvar</h2>
          {!showForm && (
            <button className="btn-add" onClick={() => setShowForm(true)}>+ Lägg till</button>
          )}
        </div>
        <p className="card-desc">Blodprovsvärden används i SCORE2-riskberäkning.</p>
      </div>

      {showForm && (
        <div className="card">
          <h3 className="card-title">Nytt provsvar</h3>
          <form onSubmit={handleSubmit} className="med-form">
            <div className="form-row">
              <div className="form-group">
                <label>Datum *</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  required
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Analys *</label>
                <select
                  value={form.type}
                  onChange={e => handleTypeChange(e.target.value)}
                  className="form-input"
                >
                  {LAB_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Värde *</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.value}
                  onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                  placeholder="0.0"
                  required
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Enhet</label>
                <input
                  type="text"
                  value={form.unit}
                  onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
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
              <button type="submit" className="btn-primary">Spara</button>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Avbryt</button>
            </div>
          </form>
        </div>
      )}

      {labs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔬</div>
          <p>Inga provsvar registrerade.<br />Lägg till provresultat från ditt senaste läkarbesök.</p>
        </div>
      ) : (
        Object.entries(grouped).map(([date, dateLabs]) => (
          <div key={date} className="card">
            <h3 className="card-title">{formatDateSv(date)}</h3>
            <div className="lab-list">
              {dateLabs.map(lab => {
                const labType = LAB_TYPES.find(t => t.value === lab.type)
                return (
                  <div key={lab.id} className="lab-item">
                    <div className="lab-main">
                      <span className="lab-name">{labType?.label || lab.type}</span>
                      <span className="lab-value">{lab.value} {lab.unit}</span>
                    </div>
                    {lab.note && <span className="lab-note">📝 {lab.note}</span>}
                    <button className="btn-delete" onClick={() => handleDelete(lab.id)}>×</button>
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
