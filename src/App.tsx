import { useEffect, useState } from 'react'
import { HashRouter, NavLink, Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import Record from './pages/Record'
import NoteDetail from './pages/NoteDetail'
import Ask from './pages/Ask'
import Settings from './pages/Settings'
import Templates from './pages/Templates'
import { getSettings, saveSettings } from './lib/db'

function PrivacyModal({ onAccept }: { onAccept: () => void }) {
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2 style={{ marginTop: 0 }}>Benvenuto in VoiceNotes</h2>
        <p>
          Questa app registra audio dal microfono del telefono. Ricorda di registrare
          conversazioni <strong>solo con il consenso delle persone presenti</strong>: in molti
          contesti registrare di nascosto non è consentito.
        </p>
        <p className="muted">
          Tutti i dati (audio, trascrizioni, chiavi API) restano salvati solo su questo
          dispositivo.
        </p>
        <button className="btn-primary" style={{ width: '100%' }} onClick={onAccept}>
          Ho capito
        </button>
      </div>
    </div>
  )
}

const icons = {
  notes: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M6 4h9l4 4v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" />
      <path d="M9 12h7M9 16h5" />
    </svg>
  ),
  rec: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </svg>
  ),
  ask: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M21 12a8 8 0 0 1-8 8H4l2-3a8 8 0 1 1 15-5Z" />
      <path d="M9 11h6" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7 7 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.06-.4.1-.8.1-1.2Z" />
    </svg>
  ),
}

export default function App() {
  const [showPrivacy, setShowPrivacy] = useState(false)

  useEffect(() => {
    void getSettings().then((s) => {
      if (!s.privacyAccepted) setShowPrivacy(true)
    })
  }, [])

  const acceptPrivacy = async () => {
    const s = await getSettings()
    await saveSettings({ ...s, privacyAccepted: true })
    setShowPrivacy(false)
  }

  return (
    <HashRouter>
      {showPrivacy && <PrivacyModal onAccept={() => void acceptPrivacy()} />}
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/registra" element={<Record />} />
          <Route path="/nota/:id" element={<NoteDetail />} />
          <Route path="/ask" element={<Ask />} />
          <Route path="/impostazioni" element={<Settings />} />
          <Route path="/template" element={<Templates />} />
        </Routes>
      </main>
      <nav className="tabbar">
        <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
          {icons.notes}
          Note
        </NavLink>
        <NavLink to="/registra" className={({ isActive }) => (isActive ? 'active' : '')}>
          {icons.rec}
          Registra
        </NavLink>
        <NavLink to="/ask" className={({ isActive }) => (isActive ? 'active' : '')}>
          {icons.ask}
          Ask
        </NavLink>
        <NavLink to="/impostazioni" className={({ isActive }) => (isActive ? 'active' : '')}>
          {icons.settings}
          Impostazioni
        </NavLink>
      </nav>
    </HashRouter>
  )
}
