import { useEffect, useState, useCallback } from 'react'
import { assistantApi } from '../lib/assistantClient.js'
import { supabase } from '../supabaseClient.js'

const STATUS_LABELS = {
  confirmed: 'bevestigd',
  pending: 'voorgesteld',
  rejected: 'verworpen',
}

export default function AssistantHistoryPage() {
  const [userEmail, setUserEmail] = useState(null)
  const [sessions, setSessions] = useState([])
  const [selected, setSelected] = useState(null)
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const e = data?.session?.user?.email || localStorage.getItem('leagl_assistant_user_email')
      setUserEmail(e || null)
    }).catch(() => setUserEmail(localStorage.getItem('leagl_assistant_user_email') || null))
  }, [])

  const loadSessions = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { sessions } = await assistantApi.listSessions(userEmail || null, 100)
      setSessions(sessions || [])
      if (sessions?.length && !selected) setSelected(sessions[0].id)
    } catch (e) {
      setError(e.message)
    } finally { setLoading(false) }
  }, [userEmail, selected])

  useEffect(() => { loadSessions() }, [loadSessions])

  useEffect(() => {
    if (!selected) { setDetail(null); return }
    assistantApi.getSession(selected)
      .then(setDetail)
      .catch(e => setError(e.message))
  }, [selected])

  return (
    <div style={S.page}>
      <header style={S.header}>
        <a href="/assistant" style={S.back}>← Assistent</a>
        <h1 style={S.h1}>Sessiehistoriek</h1>
        <a href="/assistant/settings" style={S.back}>⚙ Instellingen</a>
      </header>

      {error && <div style={S.error}>{error}</div>}

      <div style={S.layout}>
        <aside style={S.sidebar}>
          {loading && <div style={S.muted}>Laden…</div>}
          {!loading && sessions.length === 0 && (
            <div style={S.muted}>Nog geen sessies. Start eerst een gesprek op /assistant.</div>
          )}
          {sessions.map(s => (
            <button key={s.id} onClick={() => setSelected(s.id)}
              style={{ ...S.sessionItem, ...(s.id === selected ? S.sessionItemActive : {}) }}>
              <div style={S.sessionDate}>{formatDate(s.started_at)}</div>
              <div style={S.sessionMeta}>
                {(s.action_counts?.confirmed || 0)} bevestigd
                {s.action_counts?.pending ? ` · ${s.action_counts.pending} pending` : ''}
                {s.source ? ` · ${s.source}` : ''}
              </div>
              {s.summary && <div style={S.sessionSummary}>{truncate(s.summary, 90)}</div>}
            </button>
          ))}
        </aside>

        <main style={S.main}>
          {!detail && <div style={S.muted}>Selecteer een sessie links.</div>}
          {detail && (
            <SessionDetail
              session={detail.session}
              actions={detail.actions}
            />
          )}
        </main>
      </div>
    </div>
  )
}

function SessionDetail({ session, actions }) {
  const transcript = Array.isArray(session.transcript) ? session.transcript : []
  return (
    <>
      <h2 style={S.h2}>{formatDate(session.started_at)}</h2>
      <div style={S.muted}>
        {session.user_email || 'anoniem'} · bron: {session.source || '—'}
        {session.ended_at ? ` · duur ${durationMs(session.started_at, session.ended_at)}` : ' · open'}
      </div>

      {session.summary && (
        <Section title="Samenvatting"><p style={S.body}>{session.summary}</p></Section>
      )}
      {session.decisions?.length > 0 && (
        <Section title="Beslissingen"><Bullets items={session.decisions}/></Section>
      )}
      {session.open_questions?.length > 0 && (
        <Section title="Open vragen"><Bullets items={session.open_questions}/></Section>
      )}
      {session.risks?.length > 0 && (
        <Section title="Aandachtspunten"><Bullets items={session.risks}/></Section>
      )}

      <Section title={`Acties (${actions.length})`}>
        {actions.length === 0 && <div style={S.muted}>Geen acties geëxtraheerd.</div>}
        {actions.map(a => (
          <div key={a.id} style={S.actionRow}>
            <div style={S.actionHead}>
              <span style={S.actionSubject}>{a.subject}</span>
              <span style={{...S.statusBadge, ...statusStyle(a.status)}}>{STATUS_LABELS[a.status] || a.status}</span>
            </div>
            <div style={S.actionMeta}>
              {a.due_date && <span>📅 {a.due_date}</span>}
              {a.priority && <span>⚡ {a.priority}</span>}
              {a.assigned_to_email && <span>👤 {a.assigned_to_email}</span>}
              {a.category_hint && <span>🏷 {a.category_hint}</span>}
            </div>
            {a.description && <div style={S.actionDesc}>{a.description}</div>}
          </div>
        ))}
      </Section>

      <Section title={`Transcript (${transcript.length} beurten)`}>
        {transcript.length === 0 && <div style={S.muted}>Geen transcript bewaard.</div>}
        <div style={S.transcript}>
          {transcript.map((t, i) => (
            <div key={i} style={{...S.tLine, color: t.role === 'user' ? '#e2e8f0' : '#94a3b8'}}>
              <strong>{t.role === 'user' ? 'Jij' : 'Assistent'}: </strong>{t.text}
            </div>
          ))}
        </div>
      </Section>
    </>
  )
}

function Section({ title, children }) {
  return (
    <div style={S.section}>
      <h3 style={S.sectionTitle}>{title}</h3>
      {children}
    </div>
  )
}
function Bullets({ items }) {
  return <ul style={S.bullets}>{items.map((it, i) => <li key={i}>{it}</li>)}</ul>
}

function formatDate(ts) {
  if (!ts) return '—'
  const d = new Date(ts)
  return d.toLocaleString('nl-BE', { dateStyle: 'medium', timeStyle: 'short' })
}
function truncate(s, n) {
  if (!s) return ''
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}
function durationMs(a, b) {
  const ms = new Date(b).getTime() - new Date(a).getTime()
  if (ms < 60000) return `${Math.round(ms / 1000)}s`
  return `${Math.round(ms / 60000)}m`
}
function statusStyle(status) {
  if (status === 'confirmed') return { backgroundColor: '#16a34a', color: 'white' }
  if (status === 'rejected') return { backgroundColor: '#475569', color: '#cbd5e1' }
  return { backgroundColor: '#1e293b', color: '#fbbf24', border: '1px solid #fbbf24' }
}

const S = {
  page: { minHeight: '100vh', backgroundColor: '#0f172a', color: '#e2e8f0',
    fontFamily: 'system-ui, -apple-system, sans-serif', padding: '1.25rem',
  },
  header: { display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' },
  h1: { margin: 0, fontSize: '1.4rem', flex: 1 },
  back: { color: '#64748b', textDecoration: 'none', fontSize: '0.85rem' },
  layout: { display: 'flex', gap: '1.25rem', maxWidth: 1280, margin: '0 auto', alignItems: 'flex-start' },
  sidebar: { width: 320, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 },
  main: { flex: 1, backgroundColor: '#1e293b', borderRadius: 12, padding: '1.25rem 1.5rem', minHeight: '70vh' },
  sessionItem: {
    background: '#1e293b', border: '1px solid transparent', borderRadius: 10,
    padding: '0.75rem 0.9rem', cursor: 'pointer', textAlign: 'left',
    color: '#e2e8f0', fontFamily: 'inherit',
  },
  sessionItemActive: { borderColor: '#2563eb', background: '#1e3a8a' },
  sessionDate: { fontSize: 13, fontWeight: 600 },
  sessionMeta: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  sessionSummary: { fontSize: 12, color: '#cbd5e1', marginTop: 6, lineHeight: 1.4 },
  h2: { margin: '0 0 4px', fontSize: '1.1rem' },
  muted: { color: '#64748b', fontSize: 13 },
  section: { marginTop: 18 },
  sectionTitle: { fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 8px' },
  body: { fontSize: 14, lineHeight: 1.5, margin: 0 },
  bullets: { margin: 0, paddingLeft: 18, fontSize: 14, lineHeight: 1.5 },
  actionRow: { background: '#0f172a', borderRadius: 8, padding: '0.65rem 0.85rem', marginBottom: 6 },
  actionHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  actionSubject: { fontSize: 14, fontWeight: 600 },
  statusBadge: { fontSize: 11, padding: '2px 8px', borderRadius: 10 },
  actionMeta: { display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 12, color: '#94a3b8', marginTop: 4 },
  actionDesc: { fontSize: 13, color: '#cbd5e1', marginTop: 4 },
  transcript: { display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 360, overflowY: 'auto', padding: '0.5rem', background: '#0f172a', borderRadius: 8 },
  tLine: { fontSize: 13, lineHeight: 1.5 },
  error: { background: '#450a0a', border: '1px solid #7f1d1d', color: '#fca5a5', padding: '0.6rem 0.9rem', borderRadius: 8, marginBottom: 12, fontSize: 13 },
}
