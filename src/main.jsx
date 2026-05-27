// src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { initObservability } from './lib/observability'
import { initFeatureFlags } from './services/featureFlags'
import { loadGoogleMaps } from './utils/loadGoogleMaps'

// Safe DOM access with null check
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found. Make sure there is a <div id="root"></div> in your HTML.');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Boot optional runtime services (non-blocking)
initObservability();
initFeatureFlags();
loadGoogleMaps().catch(() => {
  console.warn('Google Maps API failed to load. Map features may be limited.');
});