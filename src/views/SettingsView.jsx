import { useState, useEffect } from 'react'
import { exportAllData, importData, getProfile, setProfile } from '../db/db'

export default function SettingsView({ onDataChange }) {
  const [importing, setImporting] = useState(false)
  const [msg, setMsg] = useState(null)
  const [profile, setProfileState] = useState({ name: '', birthdate: '', sex: 'male', smoking: false })
  const [profileSaved, setProfileSaved] = useState(false)

  useEffect(() => {
    getProfile('patientProfile').then(p => {
      if (p) setProfileState(p)
    })
  }, [])

  async function handleProfileSave(e) {
    e.preventDefault()
    await setProfile('patientProfile', profile)
    setProfileSaved(true)
    setMsg('Profil sparad!')
    setTimeout(() => { setMsg(null); setProfileSaved(false) }, 3000)
    onDataChange?.()
  }

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
      // Reload profile after import
      const p = await getProfile('patientProfile')
      if (p) setProfileState(p)
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
      {/* Patient profile */}
      <div className="card">
        <h2 className="card-title">Min profil</h2>
        <p className="card-desc">Används för automatisk beräkning av hjärt-kärlrisk (SCORE2).</p>
        <form onSubmit={handleProfileSave} className="med-form" style={{ marginTop: 12 }}>
          <div className="form-group">
            <label>Namn</label>
            <input
              type="text"
              value={profile.name}
              onChange={e => setProfileState(p => ({ ...p, name: e.target.value }))}
              placeholder="För- och efternamn"
              className="form-input"
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Födelsedatum</label>
              <input
                type="date"
                value={profile.birthdate}
                onChange={e => setProfileState(p => ({ ...p, birthdate: e.target.value }))}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label>Kön</label>
              <select
                value={profile.sex}
                onChange={e => setProfileState(p => ({ ...p, sex: e.target.value }))}
                className="form-input"
              >
                <option value="male">Man</option>
                <option value="female">Kvinna</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={profile.smoking || false}
                onChange={e => setProfileState(p => ({ ...p, smoking: e.target.checked }))}
              />
              Rökare (aktuell)
            </label>
          </div>
          <button type="submit" className={`btn-primary ${profileSaved ? 'btn-saved' : ''}`}>
            {profileSaved ? '✓ Sparad' : 'Spara profil'}
          </button>
        </form>
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
