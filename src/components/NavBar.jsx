const TABS = [
  { id: 'register', label: 'Registrera', icon: '💓' },
  { id: 'graph', label: 'Graf', icon: '📈' },
  { id: 'meds', label: 'Mediciner', icon: '💊' },
  { id: 'score', label: 'Risk', icon: '🎯' },
  { id: 'info', label: 'Info', icon: '📖' }
]

export default function NavBar({ active, onNav }) {
  return (
    <nav className="navbar">
      {TABS.map(tab => (
        <button
          key={tab.id}
          className={`nav-item ${active === tab.id ? 'nav-item-active' : ''}`}
          onClick={() => onNav(tab.id)}
        >
          <span className="nav-icon">{tab.icon}</span>
          <span className="nav-label">{tab.label}</span>
        </button>
      ))}
    </nav>
  )
}

export { TABS }
