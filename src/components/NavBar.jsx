const DEFAULT_TABS = [
  { id: 'register', label: 'Registrera', icon: '💓' },
  { id: 'graph', label: 'Graf', icon: '📈' },
  { id: 'meds', label: 'Mediciner', icon: '💊' },
  { id: 'score', label: 'Risk', icon: '🎯' },
  { id: 'diary', label: 'Dagbok', icon: '📔' },
  { id: 'info', label: 'Info', icon: '📖' }
]

export default function NavBar({ active, onNav, notifications = {}, tabs }) {
  const visibleTabs = tabs || DEFAULT_TABS
  return (
    <nav className="navbar">
      {visibleTabs.map(tab => (
        <button
          key={tab.id}
          className={`nav-item ${active === tab.id ? 'nav-item-active' : ''}`}
          onClick={() => onNav(tab.id)}
        >
          <div className="nav-icon-wrap">
            <span className="nav-icon">{tab.icon}</span>
            {notifications[tab.id] && (
              <span className={`nav-dot nav-dot-${notifications[tab.id]}`} />
            )}
          </div>
          <span className="nav-label">{tab.label}</span>
        </button>
      ))}
    </nav>
  )
}

export { DEFAULT_TABS as TABS }
