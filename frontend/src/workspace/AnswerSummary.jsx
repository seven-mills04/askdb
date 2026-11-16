import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import gsap from 'gsap'
import { useLayoutEffect, useRef } from 'react'
import { BRAND } from '../theme.js'

/**
 * The plain-English answer, shown the way the landing page shows one: ink on a yellow
 * highlighter block. The block sweeps in each time a new answer arrives.
 */
export default function AnswerSummary({ text, dimmed }) {
  const root = useRef(null)

  useLayoutEffect(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const q = gsap.utils.selector(root)
      gsap
        .timeline()
        .from(q('.sum-marker'), { scaleX: 0, duration: 0.5, ease: 'power4.inOut' })
        .from(q('.sum-text'), { autoAlpha: 0, y: 8, duration: 0.4, ease: 'power3.out' }, '-=0.15')
    })
    return () => mm.revert()
  }, [text])

  return (
    <Box ref={root} sx={{ position: 'relative', flexShrink: 0, p: '16px 20px 14px', color: BRAND.ink, opacity: dimmed ? 0.55 : 1 }}>
      <Box className="sum-marker" aria-hidden sx={{ position: 'absolute', inset: 0, bgcolor: BRAND.yellow, borderRadius: '6px', transformOrigin: 'left center' }} />
      <Box className="sum-text" sx={{ position: 'relative' }}>
        <Typography sx={{ fontSize: { xs: 19, md: 23 }, fontWeight: 700, fontStretch: '85%', letterSpacing: '-0.015em', lineHeight: 1.25, maxWidth: '60ch' }}>
          {text}
        </Typography>
        <Typography sx={{ fontSize: 12.5, mt: 0.75, opacity: 0.75 }}>
          Written by AI from the result below. Check the table for exact figures.
        </Typography>
      </Box>
    </Box>
  )
}
