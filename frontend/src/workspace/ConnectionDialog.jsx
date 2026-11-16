import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import { useState } from 'react'
import { api } from '../api.js'

const DEFAULT_PORT = { POSTGRES: 5432, MYSQL: 3306 }
const EMPTY = { name: '', type: 'POSTGRES', host: '', port: 5432, database: '', username: '', password: '' }

export default function ConnectionDialog({ open, onClose, onCreated }) {
  const [form, setForm] = useState(EMPTY)
  const [busy, setBusy] = useState(null) // 'test' | 'save' | null
  const [message, setMessage] = useState(null) // { severity, text }

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const setType = (_, type) => {
    if (!type) return
    // Switch the port too, unless the user already typed a custom one.
    setForm((f) => ({ ...f, type, port: f.port === DEFAULT_PORT[f.type] ? DEFAULT_PORT[type] : f.port }))
  }

  const close = () => {
    setForm(EMPTY)
    setMessage(null)
    onClose()
  }

  const submit = async (action) => {
    setBusy(action)
    setMessage(null)
    const details = { ...form, port: Number(form.port) }
    try {
      if (action === 'test') {
        await api.testConnection(details)
        setMessage({ severity: 'success', text: 'Connection works.' })
      } else {
        const created = await api.createConnection(details)
        setForm(EMPTY)
        onCreated(created)
      }
    } catch (err) {
      setMessage({ severity: 'error', text: err.message })
    } finally {
      setBusy(null)
    }
  }

  const complete = form.name && form.host && form.port && form.database && form.username

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="xs">
      <DialogTitle>Connect a database</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <ToggleButtonGroup exclusive fullWidth size="small" value={form.type} onChange={setType}>
            <ToggleButton value="POSTGRES">PostgreSQL</ToggleButton>
            <ToggleButton value="MYSQL">MySQL</ToggleButton>
          </ToggleButtonGroup>
          <TextField label="Name" size="small" placeholder="e.g. Sales reporting" value={form.name} onChange={set('name')} />
          <Stack direction="row" spacing={1.5}>
            <TextField label="Host" size="small" sx={{ flex: 1 }} placeholder="db.example.com" value={form.host} onChange={set('host')} />
            <TextField label="Port" size="small" type="number" sx={{ width: 100 }} value={form.port} onChange={set('port')} />
          </Stack>
          <TextField label="Database" size="small" value={form.database} onChange={set('database')} />
          <TextField label="Username" size="small" autoComplete="off" value={form.username} onChange={set('username')} />
          <TextField label="Password" size="small" type="password" autoComplete="new-password" value={form.password} onChange={set('password')} />
          <Typography color="text.secondary" sx={{ fontSize: 12 }}>
            Use a read-only database user if you can. The password is stored encrypted (AES-256) and never sent back to
            the browser.
          </Typography>
          {message && <Alert severity={message.severity}>{message.text}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={close} color="inherit">
          Cancel
        </Button>
        <Button onClick={() => submit('test')} disabled={!complete || busy !== null}>
          {busy === 'test' ? 'Testing…' : 'Test'}
        </Button>
        <Button variant="contained" onClick={() => submit('save')} disabled={!complete || busy !== null}>
          {busy === 'save' ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
