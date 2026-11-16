import { useState } from 'react'
import { ANATOMY } from './content.js'

/**
 * One question, taken apart. Point at a phrase (or tab to it) and the piece of SQL
 * it became lights up, and the other way round.
 */
export default function Anatomy() {
  const [active, setActive] = useState(null)

  const part = (p, i, Tag) => {
    if (!p.key) return <span key={i}>{p.text}</span>
    return (
      <Tag
        key={i}
        className="lp-mark"
        data-key={p.key}
        data-dim={active !== null && active !== p.key}
        tabIndex={0}
        onMouseEnter={() => setActive(p.key)}
        onMouseLeave={() => setActive(null)}
        onFocus={() => setActive(p.key)}
        onBlur={() => setActive(null)}
      >
        {p.text}
      </Tag>
    )
  }

  return (
    <div className="lp-anatomy">
      <p className="lp-anatomy-q">{ANATOMY.question.map((p, i) => part(p, i, 'span'))}</p>
      <div className="lp-anatomy-arrow" aria-hidden>
        becomes
      </div>
      <pre className="lp-anatomy-sql">{ANATOMY.sql.map((p, i) => part(p, i, 'span'))}</pre>
    </div>
  )
}
