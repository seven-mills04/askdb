import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Link from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import gsap from 'gsap'
import { useLayoutEffect, useRef, useState } from 'react'
import { api } from '../api.js'
import { BRAND, DISPLAY } from '../theme.js'

const COPY = {
  login: { title: 'Welcome back.', line: 'Sign in and pick up where you left off.', button: 'Sign in' },
  register: { title: 'Make an account.', line: 'It takes an email and a password. The demo database is ready as soon as you are in.', button: 'Create account' },
}

// The form sits on a white slip whatever the system theme is, so its fields are styled for
// ink on white. Two browser behaviours are handled here:
//  - Saved logins: Chrome paints autofilled fields in its own colour. The inset shadow covers that.
//  - Floating labels overlap autofilled text, so the labels sit above the fields instead.
const fieldSx = {
  '& .MuiInputBase-root': { color: BRAND.ink, bgcolor: '#fff', borderRadius: '6px', colorScheme: 'light' },
  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#b9bfd6', borderWidth: 2 },
  '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { borderColor: BRAND.ink },
  '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: BRAND.cobalt },
  '& .MuiFormHelperText-root': { color: '#4b5175', mx: 0 },
  '& input': { fontSize: 17, py: 1.6 },
  '& input:-webkit-autofill, & input:-webkit-autofill:hover, & input:-webkit-autofill:focus': {
    WebkitBoxShadow: '0 0 0 100px #fff inset',
    WebkitTextFillColor: BRAND.ink,
    caretColor: BRAND.ink,
    borderRadius: '4px',
  },
}

function Field({ id, label, ...props }) {
  return (
    <Box>
      <Typography component="label" htmlFor={id} sx={{ display: 'block', mb: 0.75, fontSize: 15, fontWeight: 700 }}>
        {label}
      </Typography>
      <TextField id={id} fullWidth hiddenLabel sx={fieldSx} {...props} />
    </Box>
  )
}

export default function AuthPage({ onAuth, onBack, initialMode = 'login' }) {
  const [mode, setMode] = useState(initialMode) // 'login' | 'register'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const root = useRef(null)

  const isRegister = mode === 'register'
  const copy = COPY[mode]

  // The headline rises in and the form drops onto the page like the SQL slip on the landing page.
  useLayoutEffect(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const q = gsap.utils.selector(root)
      gsap
        .timeline({ defaults: { ease: 'power3.out' } })
        .from(q('.auth-title'), { yPercent: 40, autoAlpha: 0, duration: 0.6 })
        .from(q('.auth-line'), { autoAlpha: 0, y: 10, duration: 0.4 }, '-=0.3')
        .from(q('.auth-slip'), { autoAlpha: 0, y: 48, rotate: 5, duration: 0.7, clearProps: 'transform' }, '-=0.45')
    })
    return () => mm.revert()
  }, [mode])

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const res = isRegister ? await api.register(email, password) : await api.login(email, password)
      onAuth(res)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Box
      ref={root}
      sx={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1.1fr) minmax(0, 440px)' },
        alignItems: 'center',
        gap: { xs: 4, md: 10 },
        px: { xs: 2.5, md: 9 },
        py: { xs: 5, md: 6 },
        bgcolor: BRAND.cobalt,
        color: BRAND.paper,
        overflow: 'hidden',
      }}
    >
      <Box>
        {onBack && (
          <Link
            component="button"
            type="button"
            underline="hover"
            onClick={onBack}
            sx={{ color: 'inherit', opacity: 0.8, fontSize: 16, fontWeight: 600, mb: { xs: 3, md: 6 }, display: 'block' }}
          >
            ← AskDB home
          </Link>
        )}
        <Typography component="h1" className="auth-title" sx={{ ...DISPLAY, fontSize: 'clamp(52px, 9vw, 132px)' }}>
          {copy.title}
        </Typography>
        <Typography className="auth-line" sx={{ mt: 3, maxWidth: '34ch', fontSize: { xs: 17, md: 20 } }}>
          {copy.line}
        </Typography>
      </Box>

      <Box
        className="auth-slip"
        sx={{
          bgcolor: '#fff',
          color: BRAND.ink,
          borderRadius: '6px',
          p: { xs: 3, md: 4 },
          boxShadow: `10px 12px 0 rgba(11, 16, 48, 0.35)`,
        }}
      >
        <Stack component="form" spacing={2.5} onSubmit={submit}>
          <Field
            id="auth-email"
            label="Email"
            type="email"
            required
            autoFocus
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Field
            id="auth-password"
            label="Password"
            type="password"
            required
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            helperText={isRegister ? 'At least 8 characters' : undefined}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && (
            <Alert severity="error" sx={{ bgcolor: '#fde7e3', color: '#8a1c10', '& .MuiAlert-icon': { color: '#d23a28' } }}>
              {error}
            </Alert>
          )}
          <Button
            type="submit"
            variant="contained"
            color="secondary"
            size="large"
            disabled={busy}
            sx={{ py: 1.5, fontSize: 17, '&.Mui-disabled': { bgcolor: '#e6e8f0', color: '#8a90ad' } }}
          >
            {busy ? 'One moment…' : copy.button}
          </Button>
        </Stack>

        <Typography sx={{ mt: 3, fontSize: 15, color: '#4b5175' }}>
          {isRegister ? 'Already have an account? ' : 'New here? '}
          <Link
            component="button"
            type="button"
            onClick={() => {
              setMode(isRegister ? 'login' : 'register')
              setError(null)
            }}
            sx={{ color: BRAND.cobalt, fontWeight: 700, fontSize: 'inherit', verticalAlign: 'baseline' }}
          >
            {isRegister ? 'Sign in' : 'Create an account'}
          </Link>
        </Typography>
      </Box>
    </Box>
  )
}
