import { useState, useCallback, useEffect } from 'react'
import NavBar from './components/NavBar'
import InstallBanner from './components/InstallBanner'
import RegisterView from './views/RegisterView'
import GraphView from './views/GraphView'
import MedicationsView from './views/MedicationsView'
import LabsView from './views/LabsView'
import WeightView from './views/WeightView'
import LifestyleView from './views/LifestyleView'
import ScoreView from './views/ScoreView'
import KnowledgeView from './views/KnowledgeView'
import SettingsView from './views/SettingsView'
import DiaryView from './views/DiaryView'
import MictView from './views/MictView'
import PainView from './views/PainView'
import { getProfile } from './db/db'
import { DEFAULT_ENABLED_IDS, buildEnabledTabs, buildRegisterSubTabs } from './utils/modules'

const REGISTER_CORE_TABS = [
  { id: 'bp', label: 'Blodtryck' },
  { id: 'labs', label: 'Provsvar' },
  { id: 'weight', label: 'Vikt' },
  { id: 'lifestyle', label: 'Levnadsvanor' },
]

function DisclaimerBanner() {
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem('disclaimer_v1') === '1' } catch { return false }
  })
  if (dismissed) return null
  return (
    <div className="disclaimer-banner">
      <div className="disclaimer-body">
        <strong>Personligt loggverktyg</strong>
        <p>
          Appen hjälper dig att anteckna egna värden och se dem i grafer.
          Den är <strong>inte</strong> en medicinsk produkt och ger ingen medicinsk rådgivning.
          All data lagras lokalt på din enhet – inget skickas till någon server.
          Beslut om hälsa tas alltid tillsammans med din vårdgivare.
          <em> Tillhandahålls i befintligt skick, utan garanti.</em>
        </p>
      </div>
      <button className="disclaimer-close" onClick={() => {
        try { localStorage.setItem('disclaimer_v1', '1') } catch {}
        setDismissed(true)
      }}>OK, förstått</button>
    </div>
  )
}

export default function App() {
  const [tab, setTab] = useState('register')
  const [refreshKey, setRefreshKey] = useState(0)
  const [registerSubTab, setRegisterSubTab] = useState('bp')
  const [enabledModules, setEnabledModules] = useState(DEFAULT_ENABLED_IDS)

  useEffect(() => {
    getProfile('enabledModules').then(saved => {
      if (saved && Array.isArray(saved)) setEnabledModules(saved)
    })
  }, [])

  const handleDataChange = useCallback(() => {
    setRefreshKey(k => k + 1)
  }, [])

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-inner">
          <span className="app-logo">💓</span>
          <h1 className="app-title">Min Hälsologg</h1>
          <button
            className="settings-btn"
            onClick={() => setTab(tab === 'settings' ? 'register' : 'settings')}
            title="Inställningar"
          >
            ⚙
          </button>
        </div>
      </header>

      <DisclaimerBanner />

      <main className="app-main">
        {tab === 'register' && (() => {
          const extraSubTabs = buildRegisterSubTabs(enabledModules)
          const allRegisterTabs = [
            ...REGISTER_CORE_TABS,
            ...extraSubTabs.map(m => ({ id: m.id, label: m.label }))
          ]
          return (
            <>
              <div className="subtab-bar subtab-bar-scroll">
                {allRegisterTabs.map(t => (
                  <button
                    key={t.id}
                    className={`subtab-btn ${registerSubTab === t.id ? 'subtab-active' : ''}`}
                    onClick={() => setRegisterSubTab(t.id)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              {registerSubTab === 'bp' && (
                <RegisterView onDataChange={handleDataChange} refreshKey={refreshKey} />
              )}
              {registerSubTab === 'labs' && (
                <LabsView onDataChange={handleDataChange} />
              )}
              {registerSubTab === 'weight' && (
                <WeightView onDataChange={handleDataChange} refreshKey={refreshKey} />
              )}
              {registerSubTab === 'lifestyle' && (
                <LifestyleView onDataChange={handleDataChange} />
              )}
              {registerSubTab === 'diary' && (
                <DiaryView onDataChange={handleDataChange} />
              )}
              {registerSubTab === 'micturition' && (
                <MictView onDataChange={handleDataChange} />
              )}
              {registerSubTab === 'pain' && (
                <PainView onDataChange={handleDataChange} />
              )}
            </>
          )
        })()}

        {tab === 'graph' && (
          <GraphView refreshKey={refreshKey} />
        )}

        {tab === 'meds' && (
          <MedicationsView onDataChange={handleDataChange} />
        )}

        {tab === 'score' && (
          <ScoreView refreshKey={refreshKey} />
        )}

        {tab === 'info' && (
          <KnowledgeView />
        )}

        {tab === 'settings' && (
          <SettingsView
            onDataChange={handleDataChange}
            enabledModules={enabledModules}
            setEnabledModules={setEnabledModules}
          />
        )}
      </main>

      <InstallBanner />
      {tab !== 'settings' && (
        <NavBar active={tab} onNav={setTab} notifications={{}} tabs={buildEnabledTabs(enabledModules)} />
      )}
      {tab === 'settings' && (
        <nav className="navbar">
          <button className="nav-item" onClick={() => {
            const tabs = buildEnabledTabs(enabledModules)
            setTab(tabs.length > 0 ? tabs[0].id : 'register')
          }} style={{ flex: 1 }}>
            ← Tillbaka
          </button>
        </nav>
      )}
    </div>
  )
}
