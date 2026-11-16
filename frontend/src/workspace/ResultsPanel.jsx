import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Paper from '@mui/material/Paper'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TableSortLabel from '@mui/material/TableSortLabel'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import { lazy, Suspense, useMemo, useState } from 'react'
import { MONO } from '../theme.js'
import { chartPlan } from './chartPlan.js'

// The charting library is big, so it is only downloaded the first time someone opens a chart.
const ResultChart = lazy(() => import('./ResultChart.jsx'))

const countFmt = new Intl.NumberFormat('en-US')
// No thousands separators in cells: ids and years like 2024 must not become "2,024".
const cellFmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 4, useGrouping: false })

function compare(a, b) {
  if (a === b) return 0
  if (a === null) return 1 // nulls always last
  if (b === null) return -1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b), undefined, { numeric: true })
}

function toCsv(result) {
  const esc = (v) => {
    if (v === null) return ''
    const s = String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [result.columns, ...result.rows].map((r) => r.map(esc).join(',')).join('\n')
}

function Cell({ value }) {
  if (value === null) {
    return (
      <Box component="span" sx={{ fontFamily: MONO, fontSize: 11, fontStyle: 'italic', color: 'text.disabled' }}>
        NULL
      </Box>
    )
  }
  if (typeof value === 'number') return cellFmt.format(value)
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  return value
}

export default function ResultsPanel({ result }) {
  const [sort, setSort] = useState(null) // { col, dir } | null
  const [view, setView] = useState('table')

  const plan = useMemo(() => chartPlan(result), [result])
  const showChart = view === 'chart' && plan !== null

  // Columns where every non-null value is a number get right-aligned.
  const numericCols = useMemo(
    () => result.columns.map((_, i) => result.rows.every((r) => r[i] === null || typeof r[i] === 'number')),
    [result],
  )

  const rows = useMemo(() => {
    if (!sort) return result.rows
    const sorted = [...result.rows].sort((a, b) => compare(a[sort.col], b[sort.col]))
    return sort.dir === 'desc' ? sorted.reverse() : sorted
  }, [result, sort])

  const cycleSort = (col) =>
    setSort((s) => {
      if (!s || s.col !== col) return { col, dir: 'asc' }
      if (s.dir === 'asc') return { col, dir: 'desc' }
      return null
    })

  const download = () => {
    const url = URL.createObjectURL(new Blob([toCsv(result)], { type: 'text/csv;charset=utf-8' }))
    const a = Object.assign(document.createElement('a'), { href: url, download: 'askdb-result.csv' })
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1.5, py: 0.75, borderBottom: 1, borderColor: 'divider' }}>
        <Typography color="text.secondary" sx={{ fontSize: 12.5 }}>
          <Box component="strong" sx={{ color: 'text.primary' }}>
            {countFmt.format(result.rowCount)}
          </Box>{' '}
          {result.rowCount === 1 ? 'row' : 'rows'} · {result.elapsedMs < 1 ? '<1' : result.elapsedMs} ms
        </Typography>
        {result.truncated && (
          <Chip size="small" color="warning" variant="outlined" label={`Showing first ${result.rowCount} — add a LIMIT`} />
        )}
        <Box sx={{ flex: 1 }} />
        {plan && (
          <ToggleButtonGroup size="small" exclusive value={showChart ? 'chart' : 'table'} onChange={(_, v) => v && setView(v)}>
            <ToggleButton value="table" sx={{ py: 0.25, px: 1.25, fontSize: 12 }}>
              Table
            </ToggleButton>
            <ToggleButton value="chart" sx={{ py: 0.25, px: 1.25, fontSize: 12 }}>
              Chart
            </ToggleButton>
          </ToggleButtonGroup>
        )}
        <Button size="small" variant="outlined" color="inherit" onClick={download} disabled={result.rowCount === 0} sx={{ py: 0.25, fontSize: 12, borderColor: 'divider' }}>
          Download CSV
        </Button>
      </Box>

      {result.rowCount === 0 ? (
        <Typography color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>
          Query ran fine but returned no rows.
        </Typography>
      ) : showChart ? (
        <Suspense fallback={<Box sx={{ height: 380 }} />}>
          <ResultChart plan={plan} />
        </Suspense>
      ) : (
        <TableContainer sx={{ maxHeight: 'calc(100vh - 390px)', minHeight: 120 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: '1%', color: 'text.secondary', fontSize: 11 }} align="right">
                  #
                </TableCell>
                {result.columns.map((c, i) => (
                  <TableCell key={i} align={numericCols[i] ? 'right' : 'left'} sx={{ fontWeight: 600, fontSize: 12 }}>
                    <TableSortLabel active={sort?.col === i} direction={sort?.col === i ? sort.dir : 'asc'} onClick={() => cycleSort(i)}>
                      {c}
                    </TableSortLabel>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row, r) => (
                <TableRow key={r} hover>
                  <TableCell align="right" sx={{ color: 'text.secondary', fontSize: 11 }}>
                    {r + 1}
                  </TableCell>
                  {row.map((v, i) => (
                    <TableCell
                      key={i}
                      align={numericCols[i] ? 'right' : 'left'}
                      sx={numericCols[i] ? { fontFamily: MONO, fontSize: 12.5 } : { fontSize: 13 }}
                    >
                      <Cell value={v} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  )
}
