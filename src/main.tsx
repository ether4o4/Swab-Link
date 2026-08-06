import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App.tsx'
import './index.css'

// HashRouter keeps routes in the URL hash (e.g. .../#/work-orders/123). That
// means the app works on any static host — GitHub Pages, a plain file, a
// single-file bundle — with no server-side routing config and no 404 on reload.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
)
