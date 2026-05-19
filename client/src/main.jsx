import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 2500,
          style: {
            background: '#fff',
            color: '#1D1D1F',
            border: '1px solid #E5E5EA',
            borderRadius: '10px',
            fontSize: '13px',
            fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
            boxShadow: '0 4px 16px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)',
            backdropFilter: 'blur(10px)',
          },
          success: { iconTheme: { primary: '#34C759', secondary: '#fff' } },
          error: { iconTheme: { primary: '#FF3B30', secondary: '#fff' } },
        }}
      />
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
