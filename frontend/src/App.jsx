import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import { lazy, Suspense, useEffect, useState } from 'react'
import { api, getToken, setToken, setUnauthorizedHandler } from './api.js'

// Each screen is its own download: a first-time visitor gets only the landing page, and
// someone already signed in goes straight to the workspace without loading the landing page.
const Landing = lazy(() => import('./landing/Landing.jsx'))
const AuthPage = lazy(() => import('./auth/AuthPage.jsx'))
const Workspace = lazy(() => import('./workspace/Workspace.jsx'))

const Loading = () => (
  <Box sx={{ display: 'grid', placeItems: 'center', height: '100vh' }}>
    <CircularProgress size={28} />
  </Box>
)

export default function App() {
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(() => getToken() !== null)
  const [screen, setScreen] = useState('landing') // 'landing' | 'login' | 'register'

  const signOut = () => {
    setToken(null)
    setUser(null)
    setScreen('landing')
  }

  useEffect(() => {
    setUnauthorizedHandler(signOut)
    // If a token was saved from last time, check it still works before showing the app.
    if (!getToken()) return
    api
      .me()
      .then(setUser)
      .catch(() => setToken(null))
      .finally(() => setChecking(false))
  }, [])

  const handleAuth = ({ token, email }) => {
    setToken(token)
    setUser({ email })
  }

  if (checking) return <Loading />
  return (
    <Suspense fallback={<Loading />}>
      {user ? (
        <Workspace user={user} onSignOut={signOut} />
      ) : screen === 'landing' ? (
        <Landing onSignIn={() => setScreen('login')} onGetStarted={() => setScreen('register')} />
      ) : (
        <AuthPage key={screen} initialMode={screen} onAuth={handleAuth} onBack={() => setScreen('landing')} />
      )}
    </Suspense>
  )
}
