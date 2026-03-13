import { useState, useEffect, useCallback, useRef } from 'react'
import * as XLSX from 'xlsx'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { addLab, getAllLabs, deleteLab } from '../db/db'
import { LAB_TYPES } from '../utils/score2'
import { formatDateSv } from '../utils/bp'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend)

// ── 1177 column → internal field mapping ─────────────────────────────────────

const COLUMN_MAPPINGS = [
  { field: 'totalCholesterol', keywords: ['kolesterol'], exclude: ['ldl', 'hdl', 'apo'] },
  { field: 'ldl', keywords: ['ldl'], exclude: [] },
  { field: 'hdl', keywords: ['hdl'], exclude: [] },
  { field: 'triglycerides', keywords: ['triglycerid'], exclude: [] },
  { field: 'glucose', keywords: ['glukos'], exclude: [] },
  { field: 'hba1c', keywords: ['hba1c'], exclude: [] },
  { field: 'methb', keywords: ['methemoglobin', 'methb', 'met-hemoglobin'], exclude: [] },
  { field: 'hb', keywords: ['hemoglobin'], exclude: ['hba1c', 'cohb', 'methb', 'methemoglobin', 'oxy'] },
  { field: 'ferritin', keywords: ['ferritin'], exclude: [] },
  { field: 'wbc', keywords: ['leukocyt', 'lpk'], exclude: [] },
  { field: 'creatinine', keywords: ['kreatinin'], exclude: [] },
  { field: 'egfr', keywords: ['egfr'], exclude: [] },
  { field: 'albKrea', keywords: ['alb/krea', 'albkrea', 'mikroalbumin/kreat', 'albumin/krea'], exclude: [] },
  { field: 'alat', keywords: ['alat'], exclude: [] },
  { field: 'tsh', keywords: ['tsh'], exclude: [] },
  { field: 'crp', keywords: ['crp'], exclude: ['hscrp', 'pna'] },
  { field: 'uricAcid', keywords: ['urat', 'urinsyra', 'ursyra'], exclude: [] },
  { field: 'psa', keywords: ['psa'], exclude: [] },
]

function matchColumn(header) {
  const h = header.toLowerCase().replace(/[^a-zåäö0-9]/g, '')
  for (const m of COLUMN_MAPPINGS) {
    const matchesKeyword = m.keywords.some(k => h.includes(k.replace(/[^a-z0-9]/g, '')))
    const isExcluded = m.exclude.some(e => h.includes(e.replace(/[^a-z0-9]/g, '')))
    if (matchesKeyword && !isExcluded) return m.field
  }
  return null
}

function parseExcelDate(cell) {
  if (!cell) return null
  if (cell.t === 'd' && cell.v instanceof Date) {
    return cell.v.toISOString().slice(0, 10)
  }
  const s = String(cell.v || '').trim()
  const m = s.match(/(\d{4})[-/](\d{2})[-/](\d{2})/)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`
  // Try Excel serial
  if (typeof cell.v === 'number') {
    const d = new Date(Math.round((cell.v - 25569) * 86400 * 1000))
    return d.toISOString().slice(0, 10)
  }
  return null
}

function parseValue(raw) {
  if (raw == null || raw === '') return null
  const s = String(raw).trim()
  if (s === '') return null
  const ltMatch = s.match(/^<\s*([\d.,]+)/)
  if (ltMatch) return { value: parseFloat(ltMatch[1].replace(',', '.')), lessThan: true }
  const gtMatch = s.match(/^>\s*([\d.,]+)/)
  if (gtMatch) return { value: parseFloat(gtMatch[1].replace(',', '.')), greaterThan: true }
  const num = parseFloat(s.replace(',', '.'))
  return isNaN(num) ? null : { value: num }
}

async function parse1177Excel(file) {
  return new Promise((resolve, reject) => {
    if (file.size > 5 * 1024 * 1024) {
      reject(new Error('Filen är för stor (max 5 MB).'))
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const wb = XLSX.read(data, { type: 'array', cellDates: true })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')

        // Read raw first row headers
        const headers = []
        for (let c = range.s.c; c <= range.e.c; c++) {
          const cell = ws[XLSX.utils.encode_cell({ r: 0, c })]
          headers.push(cell ? String(cell.v || '') : '')
        }

        // Validate 1177 structure
        if (!headers[0].toLowerCase().includes('datum')) {
          reject(new Error('Det verkar inte vara en fil från 1177. Kontrollera att du exporterat provsvar från Min Vård på 1177.se.'))
          return
        }

        // Map columns
        const colMap = {}
        for (let c = 1; c < headers.length; c++) {
          const field = matchColumn(headers[c])
          if (field) colMap[c] = field
        }

        if (Object.keys(colMap).length === 0) {
          reject(new Error('Inga kända provsvar hittades i filen. Kontrollera att det är rätt fil.'))
          return
        }

        // Parse data rows
        const results = []
        for (let r = 1; r <= range.e.r; r++) {
          const dateCell = ws[XLSX.utils.encode_cell({ r, c: 0 })]
          if (!dateCell) continue
          const date = parseExcelDate(dateCell)
          if (!date) continue

          for (const [col, field] of Object.entries(colMap)) {
            const cell = ws[XLSX.utils.encode_cell({ r, c: parseInt(col) })]
            if (!cell) continue
            const parsed = parseValue(cell.v)
            if (parsed !== null) {
              results.push({ date, field, value: parsed.value })
            }
          }
        }

        if (results.length === 0) {
          reject(new Error('Inga värden hittades i filen.'))
          return
        }

        resolve(results)
      } catch (err) {
        reject(new Error('Kunde inte läsa filen: ' + err.message))
      }
    }
    reader.onerror = () => reject(new Error('Filläsning misslyckades.'))
    reader.readAsArrayBuffer(file)
  })
}

// ── Lab Chart ─────────────────────────────────────────────────────────────────

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
      borderWidth: 2, pointRadius: 5, pointHoverRadius: 7, tension: 0.2,
    }
  ]

  const options = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: item => `${item.raw} ${typeData.unit}` } }
    },
    scales: {
      x: { ticks: { font: { size: 11 }, maxRotation: 30 }, grid: { color: 'rgba(0,0,0,0.06)' } },
      y: { ticks: { font: { size: 11 } }, title: { display: true, text: typeData.unit, font: { size: 11 } }, grid: { color: 'rgba(0,0,0,0.06)' } }
    }
  }

  const latest = data[data.length - 1]

  return (
    <div className="card lab-chart-card">
      <div className="lab-chart-header">
        <span className="lab-chart-title">{typeData.label}</span>
        <span className="lab-chart-latest">
          {latest.value} {typeData.unit}
        </span>
      </div>
      <div className="lab-chart-wrapper">
        <Line data={{ labels, datasets }} options={options} />
      </div>
    </div>
  )
}

// ── Main LabsView ─────────────────────────────────────────────────────────────

export default function LabsView({ onDataChange }) {
  const [labs, setLabs] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [viewMode, setViewMode] = useState('list')
  const [importState, setImportState] = useState(null)
  const fileRef = useRef()

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

  async function handleFileSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportState({ loading: true })
    try {
      const results = await parse1177Excel(file)
      const dates = [...new Set(results.map(r => r.date))]
      setImportState({ results, dates, imported: null, error: null })
    } catch (err) {
      setImportState({ error: err.message, results: null })
    }
    e.target.value = ''
  }

  async function doImport(overwrite) {
    if (!importState?.results) return
    let count = 0
    for (const item of importState.results) {
      const exists = labs.find(l => l.date === item.date && l.type === item.field)
      if (exists && !overwrite) continue
      const labType = LAB_TYPES.find(t => t.value === item.field)
      await addLab({
        date: item.date,
        type: item.field,
        value: item.value,
        unit: labType?.unit || '',
        note: null
      })
      count++
    }
    setImportState(s => ({ ...s, imported: count }))
    await load(); onDataChange?.()
  }

  const hasConflict = importState?.results
    ? labs.some(l => importState.results.find(r => r.date === l.date && r.field === l.type))
    : false

  const grouped = {}
  for (const lab of labs) {
    if (!grouped[lab.date]) grouped[lab.date] = []
    grouped[lab.date].push(lab)
  }

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
        <p className="card-desc">Logga blodprovsvärden för att se dem som grafer över tid.</p>
        <div className="import-1177-section">
          <button className="btn-import-1177" onClick={() => fileRef.current?.click()}>
            ⬆ Importera provsvar från 1177 (.xlsx)
          </button>
          <input ref={fileRef} type="file" accept=".xlsx" style={{ display: 'none' }} onChange={handleFileSelect} />
          <details className="import-1177-help">
            <summary>Hur hittar jag filen på 1177? ▾</summary>
            <ol className="import-1177-steps">
              <li>Gå till <strong>1177.se</strong> och logga in med BankID</li>
              <li>Välj <strong>Min vård → Journalen → Provsvar</strong></li>
              <li>Tryck på <strong>"Ladda ner provsvar"</strong> (knapp i övre högra hörnet)</li>
              <li>Välj format <strong>Excel (.xlsx)</strong> och ladda ner filen</li>
              <li>Ladda upp filen här med knappen ovan</li>
            </ol>
            <p className="import-1177-note">Importeras automatiskt: totalkolesterol, LDL, HDL, triglycerider, glukos, HbA1c, Hb, ferritin, LPK, kreatinin, eGFR, albumin/krea, ALAT, TSH, CRP.</p>
          </details>
        </div>
      </div>

      {/* Import panel */}
      {importState && (
        <div className="card import-card">
          {importState.loading && <p>Läser fil…</p>}
          {importState.error && <p className="import-error">⚠️ {importState.error}</p>}
          {importState.results && importState.imported == null && (
            <>
              <p className="import-summary">
                Hittade <strong>{importState.results.length}</strong> värden från{' '}
                <strong>{importState.dates.length}</strong> provtagningstillfälle{importState.dates.length !== 1 ? 'n' : ''}{' '}
                ({importState.dates[importState.dates.length - 1] || ''}–{importState.dates[0] || ''}).
              </p>
              {hasConflict ? (
                <>
                  <p className="import-question">Några datum finns redan — vill du skriva över?</p>
                  <div className="import-btns">
                    <button className="btn-primary" onClick={() => doImport(true)}>Ja, skriv över</button>
                    <button className="btn-secondary" onClick={() => doImport(false)}>Nej, bara nya</button>
                    <button className="btn-link" onClick={() => setImportState(null)}>Avbryt</button>
                  </div>
                </>
              ) : (
                <div className="import-btns">
                  <button className="btn-primary" onClick={() => doImport(false)}>Importera alla</button>
                  <button className="btn-link" onClick={() => setImportState(null)}>Avbryt</button>
                </div>
              )}
            </>
          )}
          {importState.imported != null && (
            <>
              <p className="import-done">✓ Importerade <strong>{importState.imported}</strong> värden.</p>
              <button className="btn-link" onClick={() => setImportState(null)}>Stäng</button>
            </>
          )}
        </div>
      )}

      {showForm && (
        <div className="card">
          <h3 className="card-title">Nytt provsvar</h3>
          <form onSubmit={handleSubmit} className="med-form">
            <div className="form-row">
              <div className="form-group">
                <label>Datum *</label>
                <input type="date" value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  required className="form-input" />
              </div>
              <div className="form-group">
                <label>Analys *</label>
                <select value={form.type} onChange={e => handleTypeChange(e.target.value)} className="form-input">
                  {LAB_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Värde *</label>
                <input type="number" step="0.01" value={form.value}
                  onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                  placeholder="0.0" required className="form-input" />
              </div>
              <div className="form-group">
                <label>Enhet</label>
                <input type="text" value={form.unit}
                  onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                  className="form-input" />
              </div>
            </div>
            <div className="form-group">
              <label>Anteckning</label>
              <input type="text" value={form.note}
                onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                placeholder="Valfri notering..." className="form-input" />
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
          <p>Inga provsvar registrerade.<br />Lägg till värden manuellt eller importera från 1177.</p>
        </div>
      ) : (
        <>
          <div className="lab-view-toggle">
            <button className={`lab-toggle-btn ${viewMode === 'list' ? 'lab-toggle-active' : ''}`}
              onClick={() => setViewMode('list')}>Lista</button>
            <button className={`lab-toggle-btn ${viewMode === 'graph' ? 'lab-toggle-active' : ''}`}
              onClick={() => setViewMode('graph')}>Grafer</button>
          </div>

          {viewMode === 'list' ? (
            Object.entries(grouped).sort(([a], [b]) => b.localeCompare(a)).map(([date, dateLabs]) => (
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
