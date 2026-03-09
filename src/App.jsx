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
import { getAllLifestyle, getProfile } from './db/db'
import { DEFAULT_ENABLED_IDS, buildEnabledTabs } from './utils/modules'

const REGISTER_TABS = [
  { id: 'bp', label: 'Blodtryck' },
  { id: 'labs', label: 'Provsvar' },
  { id: 'weight', label: 'Vikt' },
  { id: 'lifestyle', label: 'Levnadsvanor' },
]

export default function App() {
  const [tab, setTab] = useState('register')
  const [refreshKey, setRefreshKey] = useState(0)
  const [registerSubTab, setRegisterSubTab] = useState('bp')
  const [lifestyleStatus, setLifestyleStatus] = useState('ok') // ok | warn | danger
  const [enabledModules, setEnabledModules] = useState(DEFAULT_ENABLED_IDS)

  useEffect(() => {
    getProfile('enabledModules').then(saved => {
      if (saved && Array.isArray(saved)) setEnabledModules(saved)
    })
  }, [])

  const handleDataChange = useCallback(() => {
    setRefreshKey(k => k + 1)
  }, [])

  const checkLifestyle = useCallback(async () => {
    const all = await getAllLifestyle()
    if (all.length === 0) {
      setLifestyleStatus('warn')
      return
    }
    const latest = all.sort((a, b) => b.date.localeCompare(a.date))[0]
    const daysSince = Math.floor((new Date() - new Date(latest.date + 'T12:00:00')) / (1000 * 60 * 60 * 24))
    if (daysSince > 90) setLifestyleStatus('danger')
    else if (daysSince > 30) setLifestyleStatus('warn')
    else setLifestyleStatus('ok')
  }, [])

  useEffect(() => { checkLifestyle() }, [checkLifestyle, refreshKey])

  const notifications = {}
  if (lifestyleStatus !== 'ok') notifications.register = lifestyleStatus

  function handleLifestyleDataChange() {
    handleDataChange()
    checkLifestyle()
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-inner">
          <span className="app-logo">💓</span>
          <h1 className="app-title">Egils Hälsografer</h1>
          <button
            className="settings-btn"
            onClick={() => setTab(tab === 'settings' ? 'register' : 'settings')}
            title="Inställningar"
          >
            ⚙
          </button>
        </div>
      </header>

      <main className="app-main">
        {tab === 'register' && (
          <>
            <div className="subtab-bar subtab-bar-scroll">
              {REGISTER_TABS.map(t => (
                <button
                  key={t.id}
                  className={`subtab-btn ${registerSubTab === t.id ? 'subtab-active' : ''}`}
                  onClick={() => setRegisterSubTab(t.id)}
                >
                  {t.label}
                  {t.id === 'lifestyle' && lifestyleStatus !== 'ok' && (
                    <span className={`tab-status-dot dot-${lifestyleStatus}`}>●</span>
                  )}
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
              <LifestyleView onDataChange={handleLifestyleDataChange} />
            )}
          </>
        )}

        {tab === 'graph' && (
          <GraphView refreshKey={refreshKey} />
        )}

        {tab === 'meds' && (
          <MedicationsView onDataChange={handleDataChange} />
        )}

        {tab === 'score' && (
          <ScoreView refreshKey={refreshKey} />
        )}

        {tab === 'diary' && (
          <DiaryView onDataChange={handleDataChange} />
        )}

        {tab === 'micturition' && (
          <MictView onDataChange={handleDataChange} />
        )}

        {tab === 'pain' && (
          <PainView onDataChange={handleDataChange} />
        )}

        {tab === 'info' && (
          <KnowledgeView />
        )}

        {tab === 'settings' && (
          <SettingsView
            onDataChange={handleLifestyleDataChange}
            enabledModules={enabledModules}
            setEnabledModules={setEnabledModules}
          />
        )}
      </main>

      <InstallBanner />
      {tab !== 'settings' && (
        <NavBar active={tab} onNav={setTab} notifications={notifications} tabs={buildEnabledTabs(enabledModules)} />
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
