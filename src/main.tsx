import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Las mismas fuentes que la app de recetas, servidas desde la propia app (funcionan sin conexión)
import '@fontsource-variable/dm-sans/wght.css'
import '@fontsource-variable/dm-sans/wght-italic.css'
import '@fontsource/libre-caslon-display/latin-400.css'
import './index.css'
import App from './App.tsx'
import { registreraServiceWorker } from './pwa.ts'

registreraServiceWorker()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
