import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Force cache refresh - v1.0.2
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)