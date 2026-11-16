import { useEffect } from 'react'
import { api } from '../api.js'
import Anatomy from './Anatomy.jsx'
import { STACK } from './content.js'
import Flow from './Flow.jsx'
import HeroAsk from './HeroAsk.jsx'
import './landing.css'
import Risks from './Risks.jsx'

function Mark() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden fill="none" stroke="currentColor" strokeWidth="2.2">
      <ellipse cx="12" cy="6" rx="8" ry="3" />
      <path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" />
    </svg>
  )
}

export default function Landing({ onSignIn, onGetStarted }) {
  // The free server sleeps when idle and takes about a minute to wake. Knock on its door as
  // soon as someone lands here, so it is usually awake by the time they press Sign in.
  useEffect(() => {
    api.health().catch(() => {})
  }, [])

  return (
    <div className="lp">
      <header className="lp-nav">
        <a className="lp-brand" href="#top">
          <Mark />
          AskDB
        </a>
        <nav aria-label="Sections">
          <a href="#how">How it works</a>
          <a href="#safety">Safety</a>
        </nav>
        <button className="lp-link" onClick={onSignIn}>
          Sign in
        </button>
        <button className="lp-btn lp-btn-yellow" onClick={onGetStarted}>
          Try the demo
        </button>
      </header>

      <main id="top">
        <section className="lp-hero">
          <HeroAsk />
          <div className="lp-hero-foot">
            <p>
              AskDB turns a plain question into SQL, runs it on a read-only connection, and shows you the answer with
              its working. These are real answers from the demo database that comes with it.
            </p>
            <button className="lp-btn lp-btn-yellow lp-btn-big" onClick={onGetStarted}>
              Ask the demo database
            </button>
          </div>
        </section>

        <Flow />

        <section className="lp-paper">
          <div className="lp-wrap">
            <h2>Every question is a query you have not written yet.</h2>
            <p className="lp-lede">
              AskDB works out which of your words mean which parts of a query. Point at a phrase to see where it went.
            </p>
            <Anatomy />
          </div>
        </section>

        <section className="lp-ink" id="safety">
          <div className="lp-wrap">
            <h2>Six ways this could go wrong. Here is what stops each one.</h2>
            <p className="lp-lede">
              SQL written by an AI is not trusted. It goes through the same checks as anything a stranger might type.
            </p>
            <Risks />
          </div>
        </section>

        <section className="lp-yellow">
          <div className="lp-wrap lp-repair">
            <div>
              <h2>When its SQL is wrong, it reads the error and tries again.</h2>
              <p className="lp-lede">
                Models get things wrong: a column that does not exist, a function from another kind of database. AskDB
                hands the error back and asks for a corrected query, up to three times. You are told when it took more
                than one try.
              </p>
            </div>
            <figure className="lp-slip lp-slip-static">
              <figcaption>An example of a repair</figcaption>
              <pre>
                <b>How many listeners were active each month?</b>
                {'\n\n'}Try 1{'\n'}SELECT strftime('%Y-%m', played_at) …{'\n'}
                <span className="lp-bad">function strftime does not exist</span>
                {'\n\n'}Try 2{'\n'}SELECT TO_CHAR(played_at, 'YYYY-MM') …{'\n'}
                <span className="lp-good">18 rows</span>
              </pre>
            </figure>
          </div>
        </section>

        <div className="lp-band" aria-hidden>
          <div className="lp-band-track">
            {[...STACK, ...STACK].map((item, i) => (
              <span key={i}>{item}</span>
            ))}
          </div>
        </div>

        <section className="lp-close">
          <h2>Go on. Ask it something.</h2>
          <p>It comes with 58,000 song plays to question, so you do not need to connect anything first.</p>
          <div className="lp-close-actions">
            <button className="lp-btn lp-btn-yellow lp-btn-big" onClick={onGetStarted}>
              Create an account
            </button>
            <button className="lp-btn lp-btn-line lp-btn-big" onClick={onSignIn}>
              Sign in
            </button>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <span className="lp-brand">
          <Mark />
          AskDB
        </span>
        <span>Built with Java, Spring Boot, PostgreSQL and React.</span>
        <a href="https://github.com/seven-mills04/askdb" target="_blank" rel="noreferrer">
          Source on GitHub
        </a>
      </footer>
    </div>
  )
}
