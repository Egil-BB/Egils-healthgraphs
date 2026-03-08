import { useState } from 'react'
import { exportAllData, importData } from '../db/db'

export default function SettingsView({ onDataChange }) {
  const [importing, setImporting] = useState(false)
  const [msg, setMsg] = useState(null)

  async function handleExport() {
    const data = await exportAllData()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `egils-halsografer-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    setMsg('Data exporterad!')
    setTimeout(() => setMsg(null), 3000)
  }

  async function handleImport(e) {
    const file = e.target.files[0]
    if (!file) return
    setImporting(true)
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      await importData(data)
      setMsg('Data importerad!')
      onDataChange?.()
    } catch {
      setMsg('Fel: Ogiltig fil.')
    }
    setImporting(false)
    setTimeout(() => setMsg(null), 3000)
  }

  return (
    <div className="view-content">
      <div className="card">
        <h2 className="card-title">Inställningar & Data</h2>
        <p className="card-desc">All data lagras lokalt på din enhet. Ingen data skickas till någon server.</p>
      </div>

      <div className="card">
        <h3 className="card-title">Säkerhetskopia</h3>
        <p className="card-desc">Exportera dina data som JSON-fil. Spara filen säkert för att kunna återställa senare.</p>
        <button className="btn-primary" onClick={handleExport}>
          ⬇ Exportera data
        </button>
      </div>

      <div className="card">
        <h3 className="card-title">Återställ data</h3>
        <p className="card-desc">Importera en tidigare exporterad backup-fil.</p>
        <label className="btn-secondary file-input-label">
          ⬆ Importera backup
          <input type="file" accept=".json" onChange={handleImport} disabled={importing} style={{ display: 'none' }} />
        </label>
      </div>

      {msg && <div className="toast">{msg}</div>}

      <div className="card disclaimer-card">
        <h3 className="card-title">Om appen</h3>
        <p className="card-desc">
          <strong>Egils Hälsografer</strong> är ett verktyg för blodtrycksuppföljning i vardagen.
          Appen ersätter inte medicinsk bedömning. Diskutera alltid dina blodtrycksvärden med din läkare.
        </p>
        <p className="card-desc" style={{ marginTop: 8 }}>
          Data lagras enbart lokalt i webbläsaren via IndexedDB.
          Inga personuppgifter samlas in eller skickas externt.
        </p>
      </div>
    </div>
  )
}
