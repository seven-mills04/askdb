// Fonts are bundled with the app (no request to Google), and used on every screen.
import '@fontsource-variable/bricolage-grotesque/wdth.css'
import '@fontsource-variable/jetbrains-mono/wght.css'
import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider } from '@mui/material/styles'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { theme } from './theme.js'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </StrictMode>,
)
