import Box from '@mui/material/Box'
import { MONO } from '../theme.js'

const line = { fontFamily: MONO, fontSize: 13, lineHeight: 1.6 }

export default function SqlEditor({ value, onChange, onRun, inputRef }) {
  const lines = value.split('\n').length

  const handleKey = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      onRun()
      return
    }
    // Tab inserts two spaces instead of moving focus away.
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault()
      const el = e.currentTarget
      const { selectionStart: start, selectionEnd: end } = el
      onChange(value.slice(0, start) + '  ' + value.slice(end))
      requestAnimationFrame(() => el.setSelectionRange(start + 2, start + 2))
    }
  }

  return (
    <Box sx={{ display: 'flex', bgcolor: 'action.hover', borderBottom: 1, borderColor: 'divider' }}>
      <Box
        aria-hidden
        sx={{ ...line, display: 'flex', flexDirection: 'column', textAlign: 'right', minWidth: 36, p: '12px 8px 12px 12px', color: 'text.disabled', userSelect: 'none' }}
      >
        {Array.from({ length: lines }, (_, i) => (
          <span key={i}>{i + 1}</span>
        ))}
      </Box>
      <Box
        component="textarea"
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKey}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        aria-label="SQL query"
        placeholder="SELECT * FROM your_table LIMIT 10;"
        rows={Math.min(Math.max(lines, 6), 18)}
        sx={{ ...line, flex: 1, p: '12px 14px 12px 6px', minHeight: 120, resize: 'vertical', tabSize: 2, whiteSpace: 'pre', color: 'text.primary', bgcolor: 'transparent', border: 0, outline: 'none' }}
      />
    </Box>
  )
}
