import { createTheme } from '@mui/material/styles'

// The same four colours and two typefaces as the landing page (landing/landing.css).
export const BRAND = { cobalt: '#2437e6', ink: '#0b1030', paper: '#eceef4', yellow: '#ffd640' }
export const SANS = "'Bricolage Grotesque Variable', system-ui, sans-serif"
export const MONO = "'JetBrains Mono Variable', ui-monospace, Consolas, monospace"

/** The narrow, heavy headline style. Spread into an sx prop: sx={{ ...DISPLAY, fontSize: 40 }} */
export const DISPLAY = { fontStretch: '75%', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 0.98 }

// One theme with a light and a dark colour scheme; MUI follows the operating system setting.
export const theme = createTheme({
  cssVariables: true,
  colorSchemes: {
    light: {
      palette: {
        primary: { main: BRAND.cobalt },
        secondary: { main: BRAND.yellow, contrastText: BRAND.ink },
        background: { default: BRAND.paper, paper: '#ffffff' },
        text: { primary: BRAND.ink, secondary: '#4b5175' },
        divider: '#ccd1e0',
      },
    },
    dark: {
      palette: {
        primary: { main: '#93a0ff' },
        secondary: { main: BRAND.yellow, contrastText: BRAND.ink },
        background: { default: BRAND.ink, paper: '#131a45' },
        text: { primary: BRAND.paper, secondary: '#a4abd0' },
        divider: '#2b3370',
      },
    },
  },
  shape: { borderRadius: 6 },
  typography: {
    fontFamily: SANS,
    fontSize: 14,
    button: { textTransform: 'none', fontWeight: 700 },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { borderRadius: 999 } },
    },
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiTableCell: { styleOverrides: { root: { padding: '6px 12px', whiteSpace: 'nowrap' } } },
    MuiTab: { styleOverrides: { root: { textTransform: 'none', fontWeight: 600 } } },
    MuiToggleButton: { styleOverrides: { root: { textTransform: 'none', fontWeight: 600 } } },
  },
})
