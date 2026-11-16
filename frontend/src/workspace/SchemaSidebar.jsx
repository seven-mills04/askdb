import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import InputBase from '@mui/material/InputBase'
import Skeleton from '@mui/material/Skeleton'
import Typography from '@mui/material/Typography'
import { useState } from 'react'
import { MONO } from '../theme.js'

const fmt = new Intl.NumberFormat('en-US')

function Badge({ children, color }) {
  return (
    <Box
      component="span"
      sx={{
        fontSize: 9.5,
        fontWeight: 700,
        px: 0.5,
        borderRadius: 0.5,
        letterSpacing: '0.03em',
        color: `${color}.main`,
        border: 1,
        borderColor: `${color}.main`,
        lineHeight: 1.5,
      }}
    >
      {children}
    </Box>
  )
}

export default function SchemaSidebar({ tables, loading, error, onInsert }) {
  const [open, setOpen] = useState(() => new Set())
  const [filter, setFilter] = useState('')

  const toggle = (name) =>
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })

  const q = filter.trim().toLowerCase()
  const visible = (tables ?? []).filter(
    (t) => !q || t.name.toLowerCase().includes(q) || t.columns.some((c) => c.name.toLowerCase().includes(q)),
  )

  return (
    <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', pb: 3 }}>
      <Box sx={{ position: 'sticky', top: 0, zIndex: 1, bgcolor: 'background.paper', p: '10px 12px' }}>
        <InputBase
          fullWidth
          placeholder="Filter tables or columns"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          inputProps={{ 'aria-label': 'Filter schema' }}
          sx={{ px: 1, py: 0.25, fontSize: 13, border: 1, borderColor: 'divider', borderRadius: 1, bgcolor: 'action.hover' }}
        />
      </Box>

      {loading && (
        <Box sx={{ px: 1.5 }}>
          {[70, 55, 80, 60, 45].map((w, i) => (
            <Skeleton key={i} width={`${w}%`} height={26} />
          ))}
        </Box>
      )}
      {error && (
        <Typography color="error" sx={{ px: 1.5, fontSize: 13 }}>
          {error}
        </Typography>
      )}
      {!loading && !error && tables && visible.length === 0 && (
        <Typography color="text.secondary" sx={{ px: 1.5, fontSize: 13 }}>
          {tables.length === 0 ? 'No tables in this database.' : 'Nothing matches that filter.'}
        </Typography>
      )}

      {!loading &&
        visible.map((t) => {
          const isOpen = open.has(t.name) || Boolean(q)
          return (
            <Box key={t.name}>
              <Box sx={{ display: 'flex', alignItems: 'center', px: 1 }}>
                <ButtonBase
                  onClick={() => toggle(t.name)}
                  aria-expanded={isOpen}
                  sx={{ flex: 1, justifyContent: 'flex-start', gap: 0.75, p: '5px 4px', borderRadius: 0.75, '&:hover': { bgcolor: 'action.hover' } }}
                >
                  <Box
                    component="span"
                    aria-hidden
                    sx={{ width: 10, fontSize: 10, color: 'text.secondary', transition: 'transform .12s', transform: isOpen ? 'rotate(90deg)' : 'none' }}
                  >
                    ▸
                  </Box>
                  <Box component="span" sx={{ fontFamily: MONO, fontSize: 13, fontWeight: 600 }}>
                    {t.name}
                  </Box>
                </ButtonBase>
                <ButtonBase
                  title={`Insert "${t.name}" into the editor`}
                  onClick={() => onInsert(t.name)}
                  sx={{ fontSize: 11, color: 'text.secondary', px: 0.5, borderRadius: 0.5, fontVariantNumeric: 'tabular-nums', '&:hover': { color: 'primary.main' } }}
                >
                  {t.rowCount === null ? '–' : fmt.format(t.rowCount)}
                </ButtonBase>
              </Box>

              {isOpen && (
                <Box sx={{ mb: 0.75 }}>
                  {t.columns.map((c) => (
                    <ButtonBase
                      key={c.name}
                      onClick={() => onInsert(c.name)}
                      title={c.references ? `→ ${c.references}` : `Insert "${c.name}"`}
                      sx={{ display: 'flex', width: '100%', justifyContent: 'flex-start', gap: 0.75, p: '3px 12px 3px 34px', '&:hover': { bgcolor: 'action.hover' } }}
                    >
                      <Box
                        component="span"
                        sx={{ fontFamily: MONO, fontSize: 12.5, color: q && c.name.toLowerCase().includes(q) ? 'primary.main' : 'text.primary' }}
                      >
                        {c.name}
                      </Box>
                      {c.primaryKey && <Badge color="warning">PK</Badge>}
                      {c.references && <Badge color="primary">FK</Badge>}
                      <Box component="span" sx={{ ml: 'auto', fontFamily: MONO, fontSize: 11, color: 'text.secondary' }}>
                        {c.type}
                      </Box>
                    </ButtonBase>
                  ))}
                </Box>
              )}
            </Box>
          )
        })}
    </Box>
  )
}
