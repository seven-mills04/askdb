import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import gsap from 'gsap'
import { useLayoutEffect, useRef } from 'react'
import { BRAND, DISPLAY } from '../theme.js'

const fmt = new Intl.NumberFormat('en-US')

/**
 * Shown before the first query: what is in the connected database, in four numbers.
 * The numbers count up once when the schema arrives.
 */
export default function DatabaseOverview({ tables, name, aiEnabled }) {
  const root = useRef(null)

  const stats = [
    { label: tables.length === 1 ? 'table' : 'tables', value: tables.length },
    { label: 'rows in total', value: tables.reduce((sum, t) => sum + (t.rowCount ?? 0), 0) },
    { label: 'columns', value: tables.reduce((sum, t) => sum + t.columns.length, 0) },
    { label: 'links between tables', value: tables.reduce((sum, t) => sum + t.columns.filter((c) => c.references).length, 0) },
  ].filter((s) => s.value > 0) // a database with no declared links just shows three tiles
  const biggest = [...tables].sort((a, b) => (b.rowCount ?? 0) - (a.rowCount ?? 0))[0]

  useLayoutEffect(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.utils.toArray(root.current.querySelectorAll('[data-count]')).forEach((el, i) => {
        const target = Number(el.dataset.count)
        const counter = { n: 0 }
        gsap.to(counter, {
          n: target,
          duration: 0.9,
          delay: i * 0.08,
          ease: 'power2.out',
          onUpdate: () => {
            el.textContent = fmt.format(Math.round(counter.n))
          },
        })
      })
    })
    return () => mm.revert()
  }, [tables])

  return (
    <Box ref={root} sx={{ flexShrink: 0 }}>
      <Typography component="h2" sx={{ ...DISPLAY, fontSize: { xs: 32, md: 46 }, maxWidth: '18ch' }}>
        {aiEnabled ? 'Ask it something.' : 'Run a query.'}
      </Typography>
      <Typography color="text.secondary" sx={{ mt: 1.25, fontSize: 16, maxWidth: '62ch' }}>
        This is what is inside {name}.{' '}
        {biggest && `The biggest table is ${biggest.name}. `}
        Click a table or column on the left to drop its name into the SQL.
      </Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: `repeat(${stats.length}, 1fr)` }, gap: 1.5, mt: 3 }}>
        {stats.map((s, i) => (
          <Box
            key={s.label}
            sx={{
              p: '18px 20px 16px',
              borderRadius: '6px',
              // The first tile carries the brand yellow; the rest stay quiet.
              ...(i === 0
                ? { bgcolor: BRAND.yellow, color: BRAND.ink }
                : { border: 2, borderColor: 'divider' }),
            }}
          >
            <Box data-count={s.value} sx={{ ...DISPLAY, fontSize: { xs: 38, md: 54 }, fontVariantNumeric: 'tabular-nums' }}>
              {fmt.format(s.value)}
            </Box>
            <Typography sx={{ mt: 0.75, fontSize: 14.5, fontWeight: 600, opacity: i === 0 ? 0.8 : 0.7 }}>{s.label}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  )
}
