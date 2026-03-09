import { useState, useEffect } from 'react'

function getInstallState() {
  const ua = navigator.userAgent
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true

  if (isStandalone) return 'installed'

  const isIOS = /iPhone|iPad|iPod/.test(ua) && !window.MSStream
  if (isIOS) {
    // Chrome on iOS uses CriOS, Firefox uses FxiOS, Opera uses OPiOS
    const isNonSafari = /CriOS|FxiOS|OPiOS|EdgiOS/.test(ua)
    if (isNonSafari) return 'ios-wrong-browser'
    return 'ios-not-installed'
  }

  const isAndroid = /Android/.test(ua)
  if (isAndroid) return 'android-not-installed'

  return null // Desktop – no banner
}

export default function InstallBanner() {
  const [state, setState] = useState(null)
  const [dismissed, setDismissed] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [step, setStep] = useState(0) // for iOS guide steps

  useEffect(() => {
    // Check if user already dismissed
    if (sessionStorage.getItem('install-banner-dismissed')) {
      setDismissed(true)
      return
    }
    setState(getInstallState())

    // Capture Android install prompt
    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  function dismiss() {
    setDismissed(true)
    sessionStorage.setItem('install-banner-dismissed', '1')
  }

  async function handleAndroidInstall() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const result = await deferredPrompt.userChoice
    if (result.outcome === 'accepted') {
      setDismissed(true)
    }
    setDeferredPrompt(null)
  }

  if (dismissed || state === null || state === 'installed') return null

  // ── iOS wrong browser ─────────────────────────────────────────────────────
  if (state === 'ios-wrong-browser') {
    return (
      <div className="install-banner install-banner-warn">
        <div className="install-banner-body">
          <span className="install-banner-icon">🧭</span>
          <div className="install-banner-text">
            <strong>Öppna i Safari för bästa upplevelse</strong>
            <span>
              På iPhone/iPad kan appen bara installeras via Safari.
              Tryck på länken nedan och välj "Öppna i Safari".
            </span>
          </div>
        </div>
        <button className="install-banner-close" onClick={dismiss} aria-label="Stäng">✕</button>
      </div>
    )
  }

  // ── iOS Safari, not installed ─────────────────────────────────────────────
  if (state === 'ios-not-installed') {
    const steps = [
      { icon: '1', text: 'Tryck på dela-ikonen  (□↑) längst ned i Safari' },
      { icon: '2', text: 'Scrolla ned och tryck "Lägg till på hemskärmen"' },
      { icon: '3', text: 'Tryck "Lägg till" – klart!' },
    ]
    return (
      <div className="install-banner install-banner-info">
        <div className="install-banner-body">
          <span className="install-banner-icon">📱</span>
          <div className="install-banner-text">
            <strong>Installera appen för att spara data</strong>
            <span>Utan installation kan data försvinna när Safari rensas.</span>
          </div>
        </div>
        <div className="install-guide">
          {steps.map((s, i) => (
            <div key={i} className="install-guide-step">
              <span className="install-guide-num">{s.icon}</span>
              <span>{s.text}</span>
            </div>
          ))}
        </div>
        <button className="install-banner-dismiss-btn" onClick={dismiss}>
          Jag har installerat den
        </button>
        <button className="install-banner-close" onClick={dismiss} aria-label="Stäng">✕</button>
      </div>
    )
  }

  // ── Android not installed ─────────────────────────────────────────────────
  if (state === 'android-not-installed') {
    return (
      <div className="install-banner install-banner-info">
        <div className="install-banner-body">
          <span className="install-banner-icon">📲</span>
          <div className="install-banner-text">
            <strong>Installera som app</strong>
            <span>Data sparas säkrare och appen fungerar offline.</span>
          </div>
        </div>
        {deferredPrompt ? (
          <button className="install-banner-cta" onClick={handleAndroidInstall}>
            Installera nu
          </button>
        ) : (
          <p className="install-banner-manual">
            Tryck på ⋮ i Chrome → "Lägg till på startskärmen"
          </p>
        )}
        <button className="install-banner-close" onClick={dismiss} aria-label="Stäng">✕</button>
      </div>
    )
  }

  return null
}
