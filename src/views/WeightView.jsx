import { useState, useEffect, useCallback } from 'react'
import { addWeight, getAllWeights, deleteWeight, getProfile } from '../db/db'
import { formatDateSv } from '../utils/bp'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function calcBMI(weight, heightCm) {
  if (!heightCm || heightCm < 100) return null
  const h = heightCm / 100
  return (weight / (h * h)).toFixed(1)
}

function bmiCategory(bmiVal) {
  const v = parseFloat(bmiVal)
  if (v < 18.5) return { label: 'Undervikt', color: '#ca8a04' }
  if (v < 25) return { label: 'Normalvikt', color: '#16a34a' }
  if (v < 30) return { label: 'Övervikt', color: '#ca8a04' }
  return { label: 'Fetma', color: '#dc2626' }
}

export default function WeightView({ onDataChange, refreshKey }) {
  const [weights, setWeights] = useState([])
  const [height, setHeight] = useState(null)
  const [form, setForm] = useState({ date: todayStr(), weight: '' })
  const [showForm, setShowForm] = useState(false)

  const load = useCallback(async () => {
    const [ws, profile] = await Promise.all([
      getAllWeights(),
      getProfile('patientProfile')
    ])
    setWeights(ws.sort((a, b) => b.date.localeCompare(a.date)))
    if (profile?.height) setHeight(parseFloat(profile.height))
  }, [])

  useEffect(() => { load() }, [load, refreshKey])

  async function handleSubmit(e) {
    e.preventDefault()
    const w = parseFloat(form.weight)
    if (!w || w < 20 || w > 300) return
    await addWeight({ date: form.date, weight: w })
    setForm({ date: todayStr(), weight: '' })
    setShowForm(false)
    await load()
    onDataChange?.()
  }

  async function handleDelete(id) {
    if (!confirm('Ta bort vikten?')) return
    await deleteWeight(id)
    await load()
    onDataChange?.()
  }

  const latestWeight = weights[0]
  const latestBmi = latestWeight ? calcBMI(latestWeight.weight, height) : null
  const bmiCat = latestBmi ? bmiCategory(latestBmi) : null

  return (
    <div className="view-content">
      <div className="card">
        <div className="card-header-row">
          <h2 className="card-title">Vikt</h2>
          {!showForm && (
            <button className="btn-add" onClick={() => setShowForm(true)}>+ Registrera</button>
          )}
        </div>
        {!height && (
          <p className="card-hint" style={{ color: '#ca8a04', marginTop: 6 }}>
            ⚠ Ange din längd i Inställningar ⚙ för att se BMI.
          </p>
        )}
      </div>

      {/* Latest weight + BMI */}
      {latestWeight && (
        <div className="card">
          <div className="weight-summary">
            <div className="weight-big">
              {latestWeight.weight}
              <span className="weight-big-unit"> kg</span>
            </div>
            {latestBmi && (
              <div className="bmi-box" style={{ borderColor: bmiCat.color }}>
                <span className="bmi-label">BMI</span>
                <span className="bmi-value" style={{ color: bmiCat.color }}>{latestBmi}</span>
                <span className="bmi-cat" style={{ color: bmiCat.color }}>{bmiCat.label}</span>
              </div>
            )}
          </div>
          <p className="bmi-date">Senaste vägning: {formatDateSv(latestWeight.date)}</p>
          {latestBmi && (
            <p className="bmi-disclaimer">BMI kan vara missvisande vid hög muskelmassa.</p>
          )}
        </div>
      )}

      {showForm && (
        <div className="card">
          <h3 className="card-title">Ny viktvägning</h3>
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
                <label>Vikt (kg) *</label>
                <input
                  type="number"
                  step="0.1"
                  value={form.weight}
                  onChange={e => setForm(f => ({ ...f, weight: e.target.value }))}
                  placeholder="75.0"
                  min="20" max="300"
                  required
                  className="form-input"
                  autoFocus
                />
              </div>
            </div>
            {form.weight && height && (
              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>
                BMI: {calcBMI(parseFloat(form.weight), height) || '–'}
              </div>
            )}
            <div className="form-actions">
              <button type="submit" className="btn-primary">Spara</button>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Avbryt</button>
            </div>
          </form>
        </div>
      )}

      {weights.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">⚖️</div>
          <p>Inga vikter registrerade.<br />Lägg till din vikt för att följa kurvan över tid.</p>
        </div>
      ) : (
        <div className="card">
          <h3 className="card-title">Historik</h3>
          <div className="weight-list">
            {weights.slice(0, 30).map(w => {
              const b = calcBMI(w.weight, height)
              const cat = b ? bmiCategory(b) : null
              return (
                <div key={w.id} className="weight-row">
                  <span className="weight-row-date">{formatDateSv(w.date)}</span>
                  <span className="weight-row-val">{w.weight} kg</span>
                  {b && <span className="weight-row-bmi" style={{ color: cat.color }}>BMI {b}</span>}
                  <button className="btn-delete" onClick={() => handleDelete(w.id)}>×</button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
