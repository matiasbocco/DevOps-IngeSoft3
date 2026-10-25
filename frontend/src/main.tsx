import React from 'react'
import ReactDOM from 'react-dom/client'
import * as Sentry from '@sentry/react'
import App from './App.tsx'

// TP9: errores y tiempos del navegador a Sentry. El DSN de un front no es secreto: solo sirve para
// ENVIAR datos, y viaja igual en el JavaScript que baja el navegador.
Sentry.init({
  dsn: 'https://1c11558d49d831ff650b654ebc27ddfb@o4512313735512064.ingest.us.sentry.io/4512314012401664',
  environment: window.location.host,          // de dónde vino: QA (:3000), PROD (:3001) o localhost
  integrations: [Sentry.browserTracingIntegration()],
  tracesSampleRate: 1.0,                       // medir todas las cargas y pedidos: poco tráfico
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
