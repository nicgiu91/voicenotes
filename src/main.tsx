import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import './styles.css'
import { applySavedLanguage, recoverInterruptedRecordings, requestPersistentStorage } from './lib/db'

registerSW({ immediate: true })
void requestPersistentStorage()
void recoverInterruptedRecordings()

// applica la lingua salvata prima di mostrare l'interfaccia
void applySavedLanguage().finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
