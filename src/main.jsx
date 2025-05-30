import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// Import Bootstrap CSS
import 'bootstrap/dist/css/bootstrap.min.css'
// Import Bootstrap JS
import 'bootstrap/dist/js/bootstrap.bundle.min.js'

import './index.css'
import { FontSizeProvider } from './context/FontSizeContext'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <FontSizeProvider>
      <App />
    </FontSizeProvider>
  </React.StrictMode>
)
