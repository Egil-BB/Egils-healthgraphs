import { useState, useCallback } from 'react'
import NavBar from './components/NavBar'
import RegisterView from './views/RegisterView'
import GraphView from './views/GraphView'
import MedicationsView from './views/MedicationsView'
import LabsView from './views/LabsView'
import ScoreView from './views/ScoreView'
import KnowledgeView from './views/KnowledgeView'
import SettingsView from './views/SettingsView'

export default function App() {
  const [tab, setTab] = useState('register')
  const [refreshKey, setRefreshKey] = useState(0)
  const [medsSubTab, setMedsSubTab] = useState('meds')

  const handleDataChange = useCallback(() => {
    setRefreshKey(k => k + 1)
  }, [])

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
          <RegisterView onDataChange={handleDataChange} refreshKey={refreshKey} />
        )}
        {tab === 'graph' && (
          <GraphView refreshKey={refreshKey} />
        )}
        {tab === 'meds' && (
          <>
            <div className="subtab-bar">
              <button
                className={`subtab-btn ${medsSubTab === 'meds' ? 'subtab-active' : ''}`}
                onClick={() => setMedsSubTab('meds')}
              >
                Mediciner
              </button>
              <button
                className={`subtab-btn ${medsSubTab === 'labs' ? 'subtab-active' : ''}`}
                onClick={() => setMedsSubTab('labs')}
              >
                Provsvar
              </button>
            </div>
            {medsSubTab === 'meds'
              ? <MedicationsView onDataChange={handleDataChange} />
              : <LabsView onDataChange={handleDataChange} />
            }
          </>
        )}
        {tab === 'score' && (
          <ScoreView refreshKey={refreshKey} />
        )}
        {tab === 'info' && (
          <KnowledgeView />
        )}
        {tab === 'settings' && (
          <SettingsView onDataChange={handleDataChange} />
        )}
      </main>

      {tab !== 'settings' && (
        <NavBar active={tab} onNav={setTab} />
      )}
      {tab === 'settings' && (
        <nav className="navbar">
          <button className="nav-item" onClick={() => setTab('register')} style={{ flex: 1 }}>
            ← Tillbaka
          </button>
        </nav>
      )}
    </div>
  )
}
