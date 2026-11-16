import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import InputBase from '@mui/material/InputBase'
import LinearProgress from '@mui/material/LinearProgress'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Typography from '@mui/material/Typography'
import gsap from 'gsap'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { api } from '../api.js'
import { BRAND, DISPLAY, MONO } from '../theme.js'
import AnswerSummary from './AnswerSummary.jsx'
import ConnectionDialog from './ConnectionDialog.jsx'
import DatabaseOverview from './DatabaseOverview.jsx'
import { EXAMPLE_QUESTIONS, EXAMPLES } from './examples.js'
import HistoryList from './HistoryList.jsx'
import ResultsPanel from './ResultsPanel.jsx'
import SchemaSidebar from './SchemaSidebar.jsx'
import SqlEditor from './SqlEditor.jsx'

const isMac = /Mac|iPhone|iPad/.test(navigator.platform)
const DB_LABEL = { POSTGRES: 'PostgreSQL', MYSQL: 'MySQL' }

export default function Workspace({ user, onSignOut }) {
  const [connections, setConnections] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [pageError, setPageError] = useState(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const [schema, setSchema] = useState(null)
  const [schemaError, setSchemaError] = useState(null)

  const [aiEnabled, setAiEnabled] = useState(false)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState(null) // { question, summary, attempts } for an AI-written query
  const [history, setHistory] = useState([])
  const [sideTab, setSideTab] = useState('schema')

  const [sql, setSql] = useState('')
  const [running, setRunning] = useState(null) // 'ask' | 'run' | null
  const [result, setResult] = useState(null)
  const [queryError, setQueryError] = useState(null)

  const editorRef = useRef(null)
  const inflight = useRef(null)
  const shellRef = useRef(null)
  const resultsRef = useRef(null)

  // One entrance when the workspace opens. Fades only: animating a transform on a
  // container this large leaves stale paint behind on some graphics drivers.
  useLayoutEffect(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const q = gsap.utils.selector(shellRef)
      gsap
        .timeline({ defaults: { ease: 'power2.out', duration: 0.4, clearProps: 'all' } })
        .from(q('header'), { autoAlpha: 0 })
        .from(q('aside'), { autoAlpha: 0 }, '-=0.25')
        .from(q('main'), { autoAlpha: 0 }, '-=0.3')
    })
    return () => mm.revert()
  }, [])

  // Each new result rises into place, so it is obvious that the table changed.
  useLayoutEffect(() => {
    if (!result || !resultsRef.current) return
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.from(resultsRef.current, { y: 14, autoAlpha: 0, duration: 0.4, ease: 'power2.out', clearProps: 'all' })
    })
    return () => mm.revert()
  }, [result])

  const active = connections.find((c) => c.id === activeId) ?? null

  const selectConnection = useCallback((connection) => {
    inflight.current?.abort()
    setActiveId(connection.id)
    setSchema(null)
    setSchemaError(null)
    setResult(null)
    setQueryError(null)
    setRunning(null)
    setAnswer(null)
    setQuestion('')
    setHistory([])
    setSql(connection.demo ? EXAMPLES[0].sql : '')
  }, [])

  const refreshHistory = useCallback((id) => {
    api
      .getHistory(id)
      .then(setHistory)
      .catch(() => {}) // history is a nice-to-have; never block the page on it
  }, [])

  // Load the connection list once, and open the first one (the demo database).
  useEffect(() => {
    api
      .listConnections()
      .then((list) => {
        setConnections(list)
        if (list.length > 0) selectConnection(list[0])
      })
      .catch((e) => setPageError(e.message))
    api
      .health()
      .then((h) => setAiEnabled(Boolean(h.aiEnabled)))
      .catch(() => {})
  }, [selectConnection])

  // Load the schema whenever the selected connection changes.
  useEffect(() => {
    if (activeId === null) return
    const ctrl = new AbortController()
    api
      .getSchema(activeId, ctrl.signal)
      .then(setSchema)
      .catch((e) => {
        if (!ctrl.signal.aborted) setSchemaError(e.message)
      })
    refreshHistory(activeId)
    return () => ctrl.abort()
  }, [activeId, refreshHistory])

  // Shared by "Ask" (AI writes the SQL) and "Run" (the user's own SQL).
  const execute = async (kind, call, onSuccess) => {
    inflight.current?.abort() // a newer request replaces an older one
    const ctrl = new AbortController()
    inflight.current = ctrl

    setRunning(kind)
    setQueryError(null)
    try {
      onSuccess(await call(ctrl.signal))
      refreshHistory(activeId)
    } catch (e) {
      if (ctrl.signal.aborted) return
      setQueryError({ title: kind === 'ask' ? "Couldn't answer that" : 'Query failed', text: e.message })
      if (kind === 'ask') {
        // Don't leave the previous question's answer sitting under an error about this one.
        setResult(null)
        setAnswer(null)
      }
    } finally {
      if (!ctrl.signal.aborted) setRunning(null)
    }
  }

  const run = () => {
    if (!sql.trim() || activeId === null) return
    execute(
      'run',
      (signal) => api.runQuery(activeId, sql, signal),
      (res) => {
        setResult(res)
        setAnswer(null) // the SQL was edited by hand, so the AI's summary no longer applies
      },
    )
  }

  const ask = (text = question) => {
    if (text.trim().length < 3 || activeId === null) return
    setQuestion(text)
    execute(
      'ask',
      (signal) => api.ask(activeId, text, signal),
      (res) => {
        setSql(res.sql)
        setResult(res.result)
        setAnswer({ question: res.question, summary: res.summary, summaryNote: res.summaryNote, attempts: res.attempts })
      },
    )
  }

  const pickHistory = (item) => {
    setSql(item.sql)
    setQuestion(item.question ?? '')
    setAnswer(null)
    editorRef.current?.focus()
  }

  const clearHistory = () => {
    api
      .clearHistory(activeId)
      .then(() => setHistory([]))
      .catch((e) => setPageError(e.message))
  }

  // Insert text at the cursor (used when clicking a table/column in the sidebar).
  const insertAtCursor = (text) => {
    const el = editorRef.current
    if (!el) return
    const { selectionStart: start, selectionEnd: end } = el
    setSql(sql.slice(0, start) + text + sql.slice(end))
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(start + text.length, start + text.length)
    })
  }

  const handleCreated = (connection) => {
    setConnections((list) => [...list, connection])
    setDialogOpen(false)
    selectConnection(connection)
  }

  const removeActive = async () => {
    if (!active || active.demo) return
    try {
      await api.deleteConnection(active.id)
      const remaining = connections.filter((c) => c.id !== active.id)
      setConnections(remaining)
      if (remaining.length > 0) selectConnection(remaining[0])
      else setActiveId(null)
    } catch (e) {
      setPageError(e.message)
    }
  }

  return (
    <Box ref={shellRef} sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <Box
        component="header"
        sx={{ display: 'flex', alignItems: 'center', gap: 1.5, height: 56, px: 2, bgcolor: BRAND.ink, color: BRAND.paper, flexShrink: 0 }}
      >
        <img src="/favicon.svg" alt="" width={22} height={22} />
        <Typography sx={{ fontWeight: 800, fontSize: 19, letterSpacing: '-0.02em', mr: 1 }}>AskDB</Typography>

        <Select
          size="small"
          value={activeId ?? ''}
          displayEmpty
          onChange={(e) => selectConnection(connections.find((c) => c.id === e.target.value))}
          inputProps={{ 'aria-label': 'Database connection' }}
          sx={{ minWidth: 220, fontSize: 14, color: 'inherit', borderRadius: 999, '& .MuiSelect-select': { py: 0.75, pl: 2 }, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(236, 238, 244, 0.35)' }, '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: BRAND.paper }, '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: BRAND.yellow }, '& .MuiSvgIcon-root': { color: 'inherit' } }}
        >
          {connections.length === 0 && (
            <MenuItem value="" disabled>
              No connections
            </MenuItem>
          )}
          {connections.map((c) => (
            <MenuItem key={c.id} value={c.id} sx={{ fontSize: 13 }}>
              {c.name}
            </MenuItem>
          ))}
        </Select>
        {active && (
          <Chip size="small" variant="outlined" label={`${DB_LABEL[active.type]}, read-only`} sx={{ fontSize: 12, color: 'inherit', borderColor: 'rgba(236, 238, 244, 0.35)', display: { xs: 'none', sm: 'flex' } }} />
        )}
        <Button size="small" color="inherit" onClick={() => setDialogOpen(true)} sx={{ opacity: 0.85, '&:hover': { opacity: 1 } }}>
          Connect a database
        </Button>
        {active && !active.demo && (
          <Button size="small" onClick={removeActive} sx={{ color: '#ff9d8f' }}>
            Remove
          </Button>
        )}

        <Box sx={{ flex: 1 }} />
        <Typography sx={{ fontSize: 13.5, opacity: 0.7, display: { xs: 'none', md: 'block' } }}>
          {user.email}
        </Typography>
        <Button size="small" color="inherit" onClick={onSignOut}>
          Sign out
        </Button>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '260px 1fr' }, gridTemplateRows: { xs: '200px 1fr', md: '1fr' }, flex: 1, minHeight: 0 }}>
        <Box component="aside" sx={{ display: 'flex', flexDirection: 'column', minHeight: 0, bgcolor: 'background.paper', borderRight: 1, borderColor: 'divider' }}>
          <Tabs value={sideTab} onChange={(_, v) => setSideTab(v)} variant="fullWidth" sx={{ minHeight: 40, borderBottom: 1, borderColor: 'divider' }}>
            <Tab value="schema" label="Schema" sx={{ minHeight: 40, fontSize: 12.5 }} />
            <Tab value="history" label={history.length > 0 ? `History (${history.length})` : 'History'} sx={{ minHeight: 40, fontSize: 12.5 }} />
          </Tabs>
          {sideTab === 'schema' ? (
            <SchemaSidebar
              tables={schema?.tables ?? null}
              loading={activeId !== null && !schema && !schemaError}
              error={schemaError}
              onInsert={insertAtCursor}
            />
          ) : (
            <HistoryList items={history} onPick={pickHistory} onClear={clearHistory} />
          )}
        </Box>

        <Stack component="main" spacing={2.5} sx={{ p: { xs: '16px', md: '24px 28px 40px' }, overflow: 'auto', minWidth: 0 }}>
          {pageError && (
            <Alert severity="error" onClose={() => setPageError(null)}>
              {pageError}
            </Alert>
          )}

          <Box sx={{ position: 'relative', flexShrink: 0, bgcolor: BRAND.cobalt, color: BRAND.paper, borderRadius: '6px', overflow: 'hidden', boxShadow: '8px 9px 0 rgba(36, 55, 230, 0.28)' }}>
            <Box component="form" onSubmit={(e) => { e.preventDefault(); ask() }} sx={{ display: 'flex', alignItems: 'center', gap: 2, p: { xs: '16px', md: '22px 22px 22px 26px' } }}>
              <InputBase
                fullWidth
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                disabled={!aiEnabled}
                placeholder={aiEnabled ? 'Ask a question about this data…' : 'Questions are off: no AI key on the server. You can still write SQL below.'}
                inputProps={{ 'aria-label': 'Question', maxLength: 500 }}
                sx={{
                  ...DISPLAY,
                  lineHeight: 1.1,
                  fontSize: { xs: 24, md: 38 },
                  color: 'inherit',
                  '& input::placeholder': { color: BRAND.paper, opacity: 0.7 },
                  '& input.Mui-disabled': { WebkitTextFillColor: 'rgba(236, 238, 244, 0.6)' },
                }}
              />
              <Button
                type="submit"
                variant="contained"
                color="secondary"
                disabled={!aiEnabled || running !== null || question.trim().length < 3 || activeId === null}
                sx={{ flexShrink: 0, px: 3.5, py: 1.25, fontSize: 18, '&.Mui-disabled': { bgcolor: 'rgba(236, 238, 244, 0.18)', color: 'rgba(236, 238, 244, 0.55)' } }}
              >
                {running === 'ask' ? 'Thinking…' : 'Ask'}
              </Button>
            </Box>
            {aiEnabled && active?.demo && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, px: { xs: 2, md: 3.25 }, pb: 2.5 }}>
                {EXAMPLE_QUESTIONS.map((q) => {
                  const on = question === q
                  return (
                    <Chip
                      key={q}
                      label={q}
                      clickable
                      onClick={() => ask(q)}
                      sx={{
                        fontSize: 13.5,
                        fontWeight: on ? 700 : 500,
                        color: on ? BRAND.cobalt : BRAND.paper,
                        bgcolor: on ? BRAND.paper : 'transparent',
                        border: '2px solid',
                        borderColor: on ? BRAND.paper : 'rgba(236, 238, 244, 0.4)',
                        '&:hover': { bgcolor: on ? BRAND.paper : 'rgba(236, 238, 244, 0.12)', borderColor: BRAND.paper },
                      }}
                    />
                  )
                })}
              </Box>
            )}
            {/* A yellow line runs along the bottom while a question or query is in flight. */}
            {running !== null && <LinearProgress color="secondary" sx={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 4, bgcolor: 'transparent' }} />}
          </Box>

          <Paper variant="outlined" sx={{ overflow: 'hidden', flexShrink: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 0.75, borderBottom: 1, borderColor: 'divider' }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
                SQL
              </Typography>
              {answer && (
                <Typography color="text.secondary" sx={{ fontSize: 13 }}>
                  written by AI. You can edit it and run it again.
                </Typography>
              )}
              {answer?.attempts > 1 && <Chip size="small" variant="outlined" color="warning" label={`Fixed its own error (${answer.attempts} tries)`} sx={{ fontSize: 11, height: 20 }} />}
            </Box>
            <SqlEditor inputRef={editorRef} value={sql} onChange={setSql} onRun={run} />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: '10px 12px', flexWrap: 'wrap' }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, flex: 1 }}>
                {active?.demo &&
                  !aiEnabled &&
                  EXAMPLES.map((ex) => (
                    <Chip
                      key={ex.label}
                      size="small"
                      label={ex.label}
                      clickable
                      color={sql === ex.sql ? 'primary' : 'default'}
                      variant="outlined"
                      onClick={() => setSql(ex.sql)}
                    />
                  ))}
              </Box>
              <Button variant="outlined" onClick={run} disabled={running !== null || !sql.trim() || activeId === null}>
                {running === 'run' ? 'Running…' : 'Run SQL'}
                <Box component="kbd" sx={{ ml: 1.25, fontFamily: 'inherit', fontSize: 11, fontWeight: 500, opacity: 0.8 }}>
                  {isMac ? '⌘ ↵' : 'Ctrl ↵'}
                </Box>
              </Button>
            </Box>
          </Paper>

          {queryError && (
            <Alert severity="error" variant="outlined">
              <AlertTitle sx={{ fontSize: 13, mb: 0.25 }}>{queryError.title}</AlertTitle>
              <Box component="code" sx={{ fontFamily: MONO, fontSize: 12.5, whiteSpace: 'pre-wrap' }}>
                {queryError.text}
              </Box>
            </Alert>
          )}

          {answer?.summary && result && <AnswerSummary text={answer.summary} dimmed={running !== null} />}

          {answer && !answer.summary && answer.summaryNote && result && (
            <Typography color="text.secondary" sx={{ fontSize: 13, flexShrink: 0 }}>
              {answer.summaryNote}
            </Typography>
          )}

          {result ? (
            <Box ref={resultsRef} sx={{ opacity: running ? 0.55 : 1, transition: 'opacity .15s' }}>
              <ResultsPanel result={result} />
            </Box>
          ) : (
            !queryError &&
            schema && <DatabaseOverview tables={schema.tables} name={active?.name ?? 'this database'} aiEnabled={aiEnabled} />
          )}
        </Stack>
      </Box>

      <ConnectionDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onCreated={handleCreated} />
    </Box>
  )
}
