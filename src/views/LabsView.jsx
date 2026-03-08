import { useState, useEffect, useCallback } from 'react'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { addLab, getAllLabs, deleteLab } from '../db/db'
import { LAB_TYPES } from '../utils/score2'
import { formatDateSv } from '../utils/bp'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend)

function LabChart({ type, labs }) {
  const typeData = LAB_TYPES.find(t => t.value === type)
  const data = labs
    .filter(l => l.type === type)
    .sort((a, b) => a.date.localeCompare(b.date))

  if (data.length === 0) return null

  const labels = data.map(d => {
    const dt = new Date(d.date + 'T12:00:00')
    return dt.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', year: data.length > 6 ? '2-digit' : undefined })
  })

  const datasets = [
    {
      label: typeData.label,
      data: data.map(d => d.value),
      borderColor: '#1d4ed8',
      backgroundColor: 'rgba(29, 78, 216, 0.08)',
      borderWidth: 2,
      pointRadius: 5,
      pointHoverRadius: 7,
      tension: 0.2,
    }
  ]

  if (typeData.refMax != null) {
    datasets.push({
      label: `Övre gräns (${typeData.refMax})`,
      data: data.map(() => typeData.refMax),
      borderColor: 'rgba(220, 38, 38, 0.5)',
      borderDash: [6, 4],
      borderWidth: 1.5,
      pointRadius: 0,
      tension: 0,
    })
  }
  if (typeData.refMin != null) {
    datasets.push({
      label: `Nedre gräns (${typeData.refMin})`,
      data: data.map(() => typeData.refMin),
      borderColor: 'rgba(22, 163, 74, 0.5)',
      borderDash: [6, 4],
      borderWidth: 1.5,
      pointRadius: 0,
      tension: 0,
    })
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: datasets.length > 1, position: 'bottom', labels: { boxWidth: 14, font: { size: 11 }, padding: 8 } },
      tooltip: {
        callbacks: {
          label: item => item.datasetIndex === 0 ? `${item.raw} ${typeData.unit}` : item.dataset.label
        }
      }
    },
    scales: {
      x: { ticks: { font: { size: 11 }, maxRotation: 30 }, grid: { color: 'rgba(0,0,0,0.06)' } },
      y: {
        ticks: { font: { size: 11 }, callback: v => `${v}` },
        title: { display: true, text: typeData.unit, font: { size: 11 } },
        grid: { color: 'rgba(0,0,0,0.06)' }
      }
    }
  }

  const latest = data[data.length - 1]
  const isAboveMax = typeData.refMax != null && latest.value > typeData.refMax
  const isBelowMin = typeData.refMin != null && latest.value < typeData.refMin
  const valueColor = (isAboveMax || isBelowMin) ? '#dc2626' : '#16a34a'

  return (
    <div className="card lab-chart-card">
      <div className="lab-chart-header">
        <span className="lab-chart-title">{typeData.label}</span>
        <span className="lab-chart-latest" style={{ color: valueColor }}>
          {latest.value} {typeData.unit}
        </span>
      </div>
      <div className="lab-chart-wrapper">
        <Line data={{ labels, datasets }} options={options} />
      </div>
    </div>
  )
}

export default function LabsView({ onDataChange }) {
  const [labs, setLabs] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [viewMode, setViewMode] = useState('list')

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

  // Lab types that have at least one value
  const typesWithData = LAB_TYPES.filter(t => labs.some(l => l.type === t.value))

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
        <div className="nonhdl-tip">
          💡 <strong>Non-HDL-kolesterol</strong> (totalkolesterol − HDL) visar de "farliga fetterna" bäst.
          Fråga din läkare om ditt non-HDL-värde!
        </div>
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
        <>
          {/* View toggle */}
          <div className="lab-view-toggle">
            <button
              className={`lab-toggle-btn ${viewMode === 'list' ? 'lab-toggle-active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              Lista
            </button>
            <button
              className={`lab-toggle-btn ${viewMode === 'graph' ? 'lab-toggle-active' : ''}`}
              onClick={() => setViewMode('graph')}
            >
              Grafer
            </button>
          </div>

          {viewMode === 'list' ? (
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
          ) : (
            typesWithData.map(t => (
              <LabChart key={t.value} type={t.value} labs={labs} />
            ))
          )}
        </>
      )}
    </div>
  )
}
