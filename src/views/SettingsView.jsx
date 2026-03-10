import { useState, useEffect } from 'react'
import { exportAllData, importData, getProfile, setProfile, clearAllData } from '../db/db'
import { ALL_MODULES, DEFAULT_ENABLED_IDS } from '../utils/modules'

const CURRENT_YEAR = new Date().getFullYear()
const BIRTH_YEARS = Array.from({ length: 100 }, (_, i) => CURRENT_YEAR - 18 - i)

const SETTINGS_TABS = [
  { id: 'profile', label: 'Profil' },
  { id: 'modules', label: 'Moduler' },
  { id: 'data', label: 'Data' },
  { id: 'about', label: 'Om appen' },
]

export default function SettingsView({ onDataChange, enabledModules, setEnabledModules }) {
  const [activeTab, setActiveTab] = useState('profile')
  const [importing, setImporting] = useState(false)
  const [msg, setMsg] = useState(null)
  const [profile, setProfileState] = useState({ name: '', birthYear: '', sex: 'male', height: '' })
  const [profileSaved, setProfileSaved] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [showDeleteForm, setShowDeleteForm] = useState(false)
  const [localModules, setLocalModules] = useState(enabledModules || DEFAULT_ENABLED_IDS)

  useEffect(() => {
    getProfile('patientProfile').then(p => {
      if (p) {
        // Support both old birthdate format and new birthYear format
        const birthYear = p.birthYear || (p.birthdate ? p.birthdate.slice(0, 4) : '')
        setProfileState(prev => ({ ...prev, ...p, birthYear }))
      }
    })
  }, [])

  useEffect(() => {
    setLocalModules(enabledModules || DEFAULT_ENABLED_IDS)
  }, [enabledModules])

  async function handleProfileSave(e) {
    e.preventDefault()
    // Store birthdate as July 1 of the selected year for age calculations
    const birthdate = profile.birthYear ? `${profile.birthYear}-07-01` : ''
    const toSave = { ...profile, birthdate }
    await setProfile('patientProfile', toSave)
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
    a.download = `halsostodet-backup-${new Date().toISOString().slice(0, 10)}.json`
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
      if (p) {
        const birthYear = p.birthYear || (p.birthdate ? p.birthdate.slice(0, 4) : '')
        setProfileState(prev => ({ ...prev, ...p, birthYear }))
      }
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
    setProfileState({ name: '', birthYear: '', sex: 'male', height: '' })
    onDataChange?.()
    setMsg('Alla data raderade.')
    setTimeout(() => setMsg(null), 4000)
  }

  function toggleModule(id) {
    const next = localModules.includes(id)
      ? localModules.filter(m => m !== id)
      : [...localModules, id]
    setLocalModules(next)
    setEnabledModules?.(next)
    setProfile('enabledModules', next)
  }

  return (
    <div className="view-content">
      {/* Settings tabs */}
      <div className="subtab-bar subtab-bar-scroll" style={{ marginBottom: 0 }}>
        {SETTINGS_TABS.map(t => (
          <button
            key={t.id}
            className={`subtab-btn ${activeTab === t.id ? 'subtab-active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Profile tab */}
      {activeTab === 'profile' && (
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
                placeholder="Förnamn"
                className="form-input"
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Födelseår</label>
                <select
                  value={profile.birthYear}
                  onChange={e => setProfileState(p => ({ ...p, birthYear: e.target.value }))}
                  className="form-input"
                >
                  <option value="">– Välj år –</option>
                  {BIRTH_YEARS.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
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
                inputMode="numeric"
                value={profile.height}
                onChange={e => setProfileState(p => ({ ...p, height: e.target.value }))}
                placeholder="175"
                min="100" max="250"
                className="form-input"
              />
              <span className="form-hint">Behövs för BMI-beräkning</span>
            </div>
            <button type="submit" className={`btn-primary ${profileSaved ? 'btn-saved' : ''}`}>
              {profileSaved ? '✓ Sparad' : 'Spara profil'}
            </button>
          </form>
        </div>
      )}

      {/* Modules tab */}
      {activeTab === 'modules' && (
        <div className="card">
          <h3 className="card-title">Aktiva moduler</h3>
          <p className="card-desc">Välj vilka flikar som ska visas i navigeringen.</p>
          <div className="module-list">
            {ALL_MODULES.map(mod => {
              const isEnabled = localModules.includes(mod.id)
              return (
                <div
                  key={mod.id}
                  className="module-item"
                  onClick={() => toggleModule(mod.id)}
                >
                  <span className="module-icon">{mod.icon}</span>
                  <div className="module-info">
                    <span className="module-name">{mod.label}</span>
                    <span className="module-desc">{mod.desc}</span>
                  </div>
                  <div className={`module-toggle ${isEnabled ? 'module-toggle-on' : ''}`}>
                    {isEnabled ? '✓' : ''}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Data tab */}
      {activeTab === 'data' && (
        <>
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
        </>
      )}

      {/* About tab */}
      {activeTab === 'about' && (
        <div className="card">
          <h3 className="card-title">Om Hälsostödet</h3>
          <div style={{ background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 10, padding: 14, marginBottom: 14 }}>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: '#92400e', fontWeight: 600, marginBottom: 6 }}>
              BETAVERSION
            </p>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: '#78350f' }}>
              Tack för att du hjälper till att testa Hälsostödet! Detta program är under utveckling.
              Buggar och inkompletta funktioner kan uppstå. Vissa mobilsystem varnar för installeringen –
              applikationen innehåller inga virus eller liknande farligheter för telefonen och är helt säker.
              Stöter du på buggar, synpunkter eller kanske förbättringsförslag? Meddela mig i detta formulär:
            </p>
            <a
              href="https://forms.gle/VFVK2evjUHT8bsZE9"
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'block', marginTop: 8, color: '#1e40af', fontWeight: 600, fontSize: 13 }}
            >
              🔗 Feedback-formulär ↗
            </a>
          </div>
          <p className="card-desc">
            <strong>Hälsostödet</strong> – ett verktyg för hälsouppföljning i vardagen.
            Ersätter inte medicinsk bedömning. Diskutera alltid dina värden med din läkare.
          </p>
          <p className="card-desc" style={{ marginTop: 8 }}>
            All data lagras lokalt på din enhet. Ingenting skickas externt.
          </p>
        </div>
      )}

      {msg && <div className="toast">{msg}</div>}
    </div>
  )
}
