import { useState, useEffect } from 'react'
import { exportAllData, importData, getProfile, setProfile, clearAllData } from '../db/db'
import { ALL_MODULES, DEFAULT_ENABLED_IDS } from '../utils/modules'

export default function SettingsView({ onDataChange, enabledModules, setEnabledModules }) {
  const [importing, setImporting] = useState(false)
  const [msg, setMsg] = useState(null)
  const [profile, setProfileState] = useState({ name: '', birthdate: '', sex: 'male', smoking: false, height: '' })
  const [profileSaved, setProfileSaved] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [showDeleteForm, setShowDeleteForm] = useState(false)
  const [localModules, setLocalModules] = useState(enabledModules || DEFAULT_ENABLED_IDS)

  useEffect(() => {
    getProfile('patientProfile').then(p => {
      if (p) setProfileState(prev => ({ ...prev, ...p }))
    })
  }, [])

  useEffect(() => {
    setLocalModules(enabledModules || DEFAULT_ENABLED_IDS)
  }, [enabledModules])

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
      const p = await getProfile('patientProfile')
      if (p) setProfileState(prev => ({ ...prev, ...p }))
      setMsg('Data importerad!')
      onDataChange?.()
    } catch {
      setMsg('Fel: Ogiltig fil.')
    }
    setImporting(false)
    setTimeout(() => setMsg(null), 3000)
  }

  async function handleDeleteAll() {
    if (deleteConfirm !== 'RADERA') return
    await clearAllData()
    setDeleteConfirm('')
    setShowDeleteForm(false)
    setProfileState({ name: '', birthdate: '', sex: 'male', smoking: false, height: '' })
    onDataChange?.()
    setMsg('Alla data raderade.')
    setTimeout(() => setMsg(null), 4000)
  }

  function toggleModule(id) {
    const mod = ALL_MODULES.find(m => m.id === id)
    if (mod?.alwaysOn) return
    const next = localModules.includes(id)
      ? localModules.filter(m => m !== id)
      : [...localModules, id]
    setLocalModules(next)
    setEnabledModules?.(next)
    setProfile('enabledModules', next)
  }

  return (
    <div className="view-content">
      <div className="card">
        <h2 className="card-title">Min profil</h2>
        <p className="card-desc">Används för automatisk SCORE2-beräkning och BMI.</p>
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
            <label>Längd (cm)</label>
            <input
              type="number"
              value={profile.height}
              onChange={e => setProfileState(p => ({ ...p, height: e.target.value }))}
              placeholder="175"
              min="100" max="250"
              className="form-input"
            />
            <span className="form-hint">Behövs för BMI-beräkning</span>
          </div>
          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={profile.smoking || false}
                onChange={e => setProfileState(p => ({ ...p, smoking: e.target.checked }))}
              />
              Rökare (åsidosätts av levnadsvanekäten)
            </label>
          </div>
          <button type="submit" className={`btn-primary ${profileSaved ? 'btn-saved' : ''}`}>
            {profileSaved ? '✓ Sparad' : 'Spara profil'}
          </button>
        </form>
      </div>

      {/* Module selector */}
      <div className="card">
        <h3 className="card-title">Aktiva moduler</h3>
        <p className="card-desc">Välj vilka flikar som ska visas i navigeringen. Grå = alltid på.</p>
        <div className="module-list">
          {ALL_MODULES.map(mod => {
            const isEnabled = mod.alwaysOn || localModules.includes(mod.id)
            return (
              <div
                key={mod.id}
                className={`module-item ${mod.alwaysOn ? 'module-item-locked' : ''}`}
                onClick={() => toggleModule(mod.id)}
              >
                <span className="module-icon">{mod.icon}</span>
                <div className="module-info">
                  <span className="module-name">{mod.label}</span>
                  <span className="module-desc">{mod.desc}</span>
                </div>
                <div className={`module-toggle ${isEnabled ? 'module-toggle-on' : ''} ${mod.alwaysOn ? 'module-toggle-locked' : ''}`}>
                  {mod.alwaysOn ? '🔒' : isEnabled ? '✓' : ''}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">Säkerhetskopia</h3>
        <p className="card-desc">Exportera dina data som JSON-fil. Viktigt om du byter telefon.</p>
        <button className="btn-primary" onClick={handleExport}>⬇ Exportera data</button>
      </div>

      <div className="card">
        <h3 className="card-title">Återställ data</h3>
        <p className="card-desc">Importera en tidigare exporterad backup-fil.</p>
        <label className="btn-secondary file-input-label">
          ⬆ Importera backup
          <input type="file" accept=".json" onChange={handleImport} disabled={importing} style={{ display: 'none' }} />
        </label>
      </div>

      <div className="card danger-card">
        <h3 className="card-title" style={{ color: '#dc2626' }}>⚠ Radera all data</h3>
        <p className="card-desc">Tar permanent bort alla mätningar, mediciner, provsvar, vikter och levnadsvanor.</p>
        {!showDeleteForm ? (
          <button className="btn-danger-outline" onClick={() => setShowDeleteForm(true)}>
            Radera all data...
          </button>
        ) : (
          <div className="delete-confirm-form">
            <p className="delete-confirm-label">Skriv <strong>RADERA</strong> för att bekräfta:</p>
            <input
              type="text"
              value={deleteConfirm}
              onChange={e => setDeleteConfirm(e.target.value)}
              placeholder="RADERA"
              className="form-input"
              autoFocus
            />
            <div className="form-actions" style={{ marginTop: 10 }}>
              <button
                className="btn-danger"
                disabled={deleteConfirm !== 'RADERA'}
                onClick={handleDeleteAll}
              >
                Radera permanent
              </button>
              <button className="btn-secondary" onClick={() => { setShowDeleteForm(false); setDeleteConfirm('') }}>
                Avbryt
              </button>
            </div>
          </div>
        )}
      </div>

      {msg && <div className="toast">{msg}</div>}

      <div className="card disclaimer-card">
        <h3 className="card-title">Om appen</h3>
        <p className="card-desc">
          <strong>Egils Hälsografer</strong> – ett verktyg för hälsouppföljning i vardagen.
          Ersätter inte medicinsk bedömning. Diskutera alltid dina värden med din läkare.
        </p>
        <p className="card-desc" style={{ marginTop: 8 }}>
          All data lagras lokalt på din enhet. Ingenting skickas externt.
        </p>
      </div>
    </div>
  )
}
