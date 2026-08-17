import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import './styles.css'
import { recoverInterruptedRecordings, requestPersistentStorage } from './lib/db'

registerSW({ immediate: true })
void requestPersistentStorage()
void recoverInterruptedRecordings()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
