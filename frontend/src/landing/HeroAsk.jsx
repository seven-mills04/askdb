import gsap from 'gsap'
import { useLayoutEffect, useRef, useState } from 'react'
import { ASKS } from './content.js'

const HOLD_SECONDS = 4.5

/** Splits text into words and letters so each letter can be animated on its own. */
function Letters({ text, className }) {
  return text.split(' ').map((word, w) => (
    <span className="lp-word" key={w}>
      {[...word].map((ch, c) => (
        <span className={className} key={c}>
          {ch}
        </span>
      ))}
    </span>
  ))
}

/**
 * The headline of the page is the product working: a question types itself in,
 * then the answer and the SQL behind it arrive. Animated with one GSAP timeline.
 */
export default function HeroAsk() {
  const [index, setIndex] = useState(0)
  const stage = useRef(null)
  const auto = useRef(true)
  const ask = ASKS[index]

  useLayoutEffect(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const q = gsap.utils.selector(stage)
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
      tl.from(q('.lp-q-char'), { autoAlpha: 0, duration: 0.01, stagger: 0.028 })
        .from(q('.lp-marker'), { scaleX: 0, duration: 0.55, ease: 'power4.inOut' }, '+=0.25')
        .from(q('.lp-a-char'), { yPercent: 115, duration: 0.6, stagger: 0.022, ease: 'back.out(1.6)' }, '-=0.3')
        .from(q('.lp-detail'), { autoAlpha: 0, y: 12, duration: 0.5 }, '-=0.25')
        .from(q('.lp-slip'), { autoAlpha: 0, y: 40, rotate: 7, duration: 0.7 }, '-=0.45')

      if (auto.current) {
        tl.to(q('.lp-fade'), { autoAlpha: 0, duration: 0.3, ease: 'power1.in', delay: HOLD_SECONDS }).add(() =>
          setIndex((i) => (i + 1) % ASKS.length),
        )
      }
    })
    return () => mm.revert()
  }, [index])

  const pick = (i) => {
    auto.current = false // once the visitor chooses, stop cycling
    setIndex(i)
  }

  return (
    <div className="lp-ask" ref={stage}>
      <div className="lp-ask-main" key={index}>
        <p className="lp-ask-label lp-fade">Ask</p>
        <h1 className="lp-question lp-fade" aria-label={ask.question}>
          <Letters text={ask.question} className="lp-q-char" />
        </h1>

        <div className="lp-answer-row">
          <div className="lp-answer-col lp-fade">
            <p className="lp-answer" aria-label={ask.answer}>
              <span className="lp-marker" aria-hidden />
              <span className="lp-answer-text">
                <Letters text={ask.answer} className="lp-a-char" />
              </span>
            </p>
            <p className="lp-detail">{ask.detail}</p>
          </div>

          <figure className="lp-slip lp-fade">
            <figcaption>The SQL it wrote</figcaption>
            <pre>{ask.sql}</pre>
          </figure>
        </div>
      </div>

      <div className="lp-picks" role="tablist" aria-label="Example questions">
        {ASKS.map((a, i) => (
          <button key={a.question} role="tab" aria-selected={i === index} onClick={() => pick(i)}>
            {a.question}
          </button>
        ))}
      </div>
    </div>
  )
}
