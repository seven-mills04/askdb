import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useLayoutEffect, useRef } from 'react'
import { FLOW } from './content.js'

gsap.registerPlugin(ScrollTrigger)

const SCROLL_LENGTH = 3000 // pixels of scrolling the whole walkthrough takes

/**
 * "What happens when you press Ask", as a walkthrough the visitor drives by scrolling.
 * The section pins to the screen; scrolling moves through five steps, and each step
 * plays its own small animation on the dark panel on the right.
 *
 * On phones, and for people who ask for reduced motion, nothing is pinned: the five
 * panels are simply stacked and fully visible.
 */
export default function Flow() {
  const root = useRef(null)

  useLayoutEffect(() => {
    const mm = gsap.matchMedia()
    mm.add('(min-width: 901px) and (min-height: 620px) and (prefers-reduced-motion: no-preference)', () => {
      const el = root.current
      const q = gsap.utils.selector(el)
      el.classList.add('is-live') // switches the CSS from "stacked" to "one panel at a time"

      const steps = q('.lp-flow-step')
      const panels = q('.lp-flow-art')
      gsap.set(steps, { opacity: 0.32 })
      gsap.set(panels, { autoAlpha: 0 })
      gsap.set(q('.lp-flow-rail i'), { scaleY: 0 })

      const tl = gsap.timeline({
        defaults: { ease: 'power2.out' },
        scrollTrigger: { trigger: el, start: 'top top', end: `+=${SCROLL_LENGTH}`, pin: true, scrub: 0.5 },
      })

      panels.forEach((panel, i) => {
        const p = gsap.utils.selector(panel)
        tl.addLabel(`step${i}`)
          .to(steps[i], { opacity: 1, duration: 0.3 })
          .to(q('.lp-flow-rail i'), { scaleY: (i + 1) / panels.length, duration: 0.6, ease: 'none' }, '<')
          .to(panel, { autoAlpha: 1, duration: 0.3 }, '<')

        // Each panel's own moment.
        if (i === 0) tl.from(p('.fl-char'), { autoAlpha: 0, duration: 0.01, stagger: 0.02 })
        if (i === 1) {
          tl.from(p('.fl-table'), { autoAlpha: 0, y: 14, duration: 0.25, stagger: 0.07 })
            .to(p('.fl-table:not(.fl-used)'), { opacity: 0.3, duration: 0.3 })
            .to(p('.fl-used'), { backgroundColor: '#ffd640', color: '#0b1030', duration: 0.3 }, '<')
        }
        if (i === 2) tl.from(p('.fl-line'), { autoAlpha: 0, x: -14, duration: 0.25, stagger: 0.12 })
        if (i === 3) {
          tl.from(p('.fl-check'), { autoAlpha: 0, x: -14, duration: 0.25, stagger: 0.22 })
            .from(p('.fl-tick'), { scale: 0, duration: 0.25, stagger: 0.22, ease: 'back.out(3)' }, '<0.12')
        }
        if (i === 4) {
          tl.from(p('.fl-marker'), { scaleX: 0, duration: 0.4, ease: 'power4.inOut' })
            .from(p('.fl-answer'), { autoAlpha: 0, duration: 0.2 }, '-=0.1')
            .from(p('.fl-bar i'), { scaleX: 0, duration: 0.5, stagger: 0.1 })
        }

        tl.to({}, { duration: 0.5 }) // a pause to read
        if (i < panels.length - 1) {
          tl.to(panel, { autoAlpha: 0, duration: 0.25 }).to(steps[i], { opacity: 0.32, duration: 0.25 }, '<')
        }
      })

      return () => el.classList.remove('is-live')
    })
    return () => mm.revert()
  }, [])

  const max = Math.max(...FLOW.bars.map((b) => b[1]))

  return (
    <section className="lp-flow" id="how" ref={root}>
      <div className="lp-flow-inner">
        <h2>What happens when you press Ask.</h2>

        <div className="lp-flow-stage">
          <div className="lp-flow-rail" aria-hidden>
            <i />
          </div>

          <ol className="lp-flow-steps">
            {FLOW.steps.map((s) => (
              <li className="lp-flow-step" key={s.title}>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>

          <div className="lp-flow-screen">
            <div className="lp-flow-art">
              <p className="fl-cap">{FLOW.steps[0].title}</p>
              <p className="fl-question" aria-label={FLOW.question}>
                {[...FLOW.question].map((ch, i) => (
                  <span className="fl-char" key={i}>
                    {ch}
                  </span>
                ))}
              </p>
            </div>

            <div className="lp-flow-art">
              <p className="fl-cap">{FLOW.steps[1].title}</p>
              <div className="fl-tables">
                {FLOW.tables.map(([name, rows, used]) => (
                  <span className={`fl-table ${used ? 'fl-used' : ''}`} key={name}>
                    {name}
                    <small>{rows}</small>
                  </span>
                ))}
              </div>
            </div>

            <div className="lp-flow-art">
              <p className="fl-cap">{FLOW.steps[2].title}</p>
              <pre className="fl-sql">
                {FLOW.sql.map((line) => (
                  <span className="fl-line" key={line}>
                    {line}
                    {'\n'}
                  </span>
                ))}
              </pre>
            </div>

            <div className="lp-flow-art">
              <p className="fl-cap">{FLOW.steps[3].title}</p>
              <ul className="fl-checks">
                {FLOW.checks.map(([title, text]) => (
                  <li className="fl-check" key={title}>
                    <span className="fl-tick" aria-hidden>
                      <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.6">
                        <path d="M3 8.5l3.2 3.2L13 4.8" />
                      </svg>
                    </span>
                    <span>
                      <b>{title}</b>
                      {text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="lp-flow-art">
              <p className="fl-cap">{FLOW.steps[4].title}</p>
              <p className="fl-answer-wrap">
                <span className="fl-marker" aria-hidden />
                <span className="fl-answer">{FLOW.answer}</span>
              </p>
              <div className="fl-bars">
                {FLOW.bars.map(([label, value]) => (
                  <div className="fl-bar" key={label}>
                    <span>{label}</span>
                    <i style={{ width: `${(value / max) * 100}%` }} />
                    <b>{value}</b>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
