import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useLayoutEffect, useRef } from 'react'
import { RISKS } from './content.js'

gsap.registerPlugin(ScrollTrigger)

/** Each risk is crossed out as it scrolls into view, and its fix appears beside it. */
export default function Risks() {
  const list = useRef(null)

  useLayoutEffect(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.utils.toArray(list.current.children).forEach((row) => {
        gsap
          .timeline({ scrollTrigger: { trigger: row, start: 'top 80%', once: true } })
          .fromTo(row.querySelector('.lp-risk span'), { backgroundSize: '0% 0.09em' }, { backgroundSize: '100% 0.09em', duration: 0.7, ease: 'power2.inOut' })
          .to(row.querySelector('.lp-risk'), { opacity: 0.6, duration: 0.4 }, '-=0.2')
          .from(row.querySelector('.lp-fix'), { autoAlpha: 0, x: -16, duration: 0.5, ease: 'power3.out' }, '-=0.4')
      })
    })
    return () => mm.revert()
  }, [])

  return (
    <ul className="lp-risks" ref={list}>
      {RISKS.map((r) => (
        <li key={r.risk}>
          <p className="lp-risk">
            <span>{r.risk}</span>
          </p>
          <p className="lp-fix">{r.fix}</p>
        </li>
      ))}
    </ul>
  )
}
