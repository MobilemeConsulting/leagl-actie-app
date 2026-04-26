import { useEffect, useRef, useState, useCallback } from 'react'
import { assistantApi } from '../lib/assistantClient.js'
import { supabase } from '../supabaseClient.js'

const PERSONAS = [
  { value: 'zakelijk-direct', label: 'Zakelijk en direct' },
  { value: 'coachend', label: 'Coachende sparringpartner' },
  { value: 'bondig', label: 'Extreem bondig' },
]
const PRIORITIES = [
  { value: 'low', label: 'Laag' },
  { value: 'medium', label: 'Normaal' },
  { value: 'high', label: 'Hoog' },
  { value: 'urgent', label: 'Urgent' },
]

export default function AssistantSettingsPage() {
  const [userEmail, setUserEmail] = useState(null)
  const [emailInput, setEmailInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState(null)
  const [google, setGoogle] = useState(null)
  const [savedAt, setSavedAt] = useState(null)
  const [error, setError] = useState(null)
  const popupRef = useRef(null)

  // Probeer user uit supabase sessie te halen → localStorage cache → manueel invullen
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const e = data?.session?.user?.email || localStorage.getItem('leagl_assistant_user_email')
      if (e) setUserEmail(e)
      else setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  // Cache user_email in localStorage zodat /assistant pagina 'm ook kent
  useEffect(() => {
    if (userEmail) localStorage.setItem('leagl_assistant_user_email', userEmail)
  }, [userEmail])

  const loadAll = useCallback(async (email) => {
    if (!email) return
    setLoading(true)
    setError(null)
    try {
      const [s, g] = await Promise.all([
        assistantApi.getSettings(email),
        assistantApi.getGoogleStatus(email).catch(() => ({ connected: false, configured: false })),
      ])
      setSettings(s.settings)
      setGoogle(g)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { if (userEmail) loadAll(userEmail) }, [userEmail, loadAll])

  // Luister naar postMessage van OAuth-popup
  useEffect(() => {
    function onMsg(ev) {
      if (ev.data?.google === 'connected' && userEmail) loadAll(userEmail)
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [userEmail, loadAll])

  const update = (patch) => setSettings(prev => ({ ...prev, ...patch }))

  const save = async () => {
    if (!userEmail || !settings) return
    setError(null)
    try {
      const { settings: saved } = await assistantApi.saveSettings(userEmail, settings)
      setSettings(saved)
      setSavedAt(new Date())
    } catch (e) {
      setError(e.message)
    }
  }

  const connectGoogle = async () => {
    if (!userEmail) return
    setError(null)
    try {
      const scopes = ['tasks', 'calendar']
      if (settings?.google_gmail_enabled) scopes.push('gmail_readonly')
      const { url } = await assistantApi.getGoogleAuthUrl(userEmail, scopes)
      popupRef.current = window.open(url, 'google-oauth', 'width=520,height=640')
    } catch (e) {
      setError(e.message)
    }
  }

  const disconnectGoogle = async () => {
    if (!userEmail) return
    if (!confirm('Google-koppeling verwijderen?')) return
    try {
      await assistantApi.disconnectGoogle(userEmail)
      await loadAll(userEmail)
    } catch (e) { setError(e.message) }
  }

  if (!userEmail) {
    return (
      <Page>
        <H1>Instellingen</H1>
        <P>Vul je e-mailadres in om je instellingen te beheren.</P>
        <form onSubmit={(e) => { e.preventDefault(); setUserEmail(emailInput.trim()) }}
          style={{ display: 'flex', gap: 8, maxWidth: 360 }}>
          <input type="email" value={emailInput} onChange={e => setEmailInput(e.target.value)}
            placeholder="jij@bedrijf.be" style={S.input} required />
          <button type="submit" style={S.primaryBtn}>OK</button>
        </form>
      </Page>
    )
  }

  if (loading || !settings) return <Page><H1>Instellingen</H1><P>Laden…</P></Page>

  return (
    <Page>
      <a href="/assistant" style={S.back}>← Assistent</a>
      <H1>Instellingen voor {userEmail}</H1>

      <Section title="Persona & gedrag">
        <Field label="Persona">
          <select value={settings.persona || 'zakelijk-direct'}
            onChange={e => update({ persona: e.target.value })} style={S.input}>
            {PERSONAS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </Field>
        <Field label={`Beknoptheid (${settings.brevity || 2})`}>
          <input type="range" min={1} max={3} value={settings.brevity || 2}
            onChange={e => update({ brevity: Number(e.target.value) })} style={{ width: '100%' }} />
          <SubLabel>1 = uitgebreid · 3 = ultrakort</SubLabel>
        </Field>
        <Field label={`Proactiviteit (${settings.proactivity || 2})`}>
          <input type="range" min={1} max={3} value={settings.proactivity || 2}
            onChange={e => update({ proactivity: Number(e.target.value) })} style={{ width: '100%' }} />
          <SubLabel>1 = passief · 3 = stelt proactief vragen</SubLabel>
        </Field>
        <Toggle label="Bevestiging vragen vóór een actie wordt opgeslagen"
          checked={!!settings.confirm_before_save}
          onChange={v => update({ confirm_before_save: v })} />
      </Section>

      <Section title="Defaults voor nieuwe acties">
        <Field label="Default toegewezen aan (e-mail)">
          <input type="email" value={settings.default_assignee_email || ''}
            onChange={e => update({ default_assignee_email: e.target.value || null })} style={S.input} />
        </Field>
        <Field label="Default prioriteit">
          <select value={settings.default_priority || 'medium'}
            onChange={e => update({ default_priority: e.target.value })} style={S.input}>
            {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </Field>
        <Field label="Default e-mail voor samenvattingen (leeg = jezelf)">
          <input type="email" value={settings.email_summary_to || ''}
            onChange={e => update({ email_summary_to: e.target.value || null })} style={S.input} />
        </Field>
      </Section>

      <Section title="Google connector">
        {!google?.configured && (
          <Notice>Google OAuth is nog niet geconfigureerd op de server. Vraag de beheerder om <code>GOOGLE_CLIENT_ID</code>, <code>GOOGLE_CLIENT_SECRET</code> en <code>GOOGLE_REDIRECT_URI</code> in te stellen.</Notice>
        )}
        {google?.configured && !google?.connected && (
          <button onClick={connectGoogle} style={S.primaryBtn}>Verbind met Google</button>
        )}
        {google?.connected && (
          <>
            <P>✅ Verbonden ({google.scope ? google.scope.split(' ').length : '?'} scopes
              {google.has_refresh_token ? ', met refresh-token' : ''})</P>
            <button onClick={disconnectGoogle} style={S.secondaryBtn}>Verwijder koppeling</button>
          </>
        )}
        <div style={{ marginTop: 16 }}>
          <Toggle label="Push bevestigde acties naar Google Tasks"
            checked={!!settings.google_tasks_enabled}
            onChange={v => update({ google_tasks_enabled: v })} />
          <Toggle label="Maak Google Calendar event voor acties met deadline"
            checked={!!settings.google_calendar_enabled}
            onChange={v => update({ google_calendar_enabled: v })} />
          <Toggle label="Gmail context (binnenkort beschikbaar)"
            checked={!!settings.google_gmail_enabled}
            onChange={v => update({ google_gmail_enabled: v })} />
          <Field label="Google Tasks lijst-id (leeg = standaardlijst)">
            <input type="text" value={settings.google_tasklist_id || ''}
              onChange={e => update({ google_tasklist_id: e.target.value || null })}
              placeholder="@default" style={S.input} />
          </Field>
          <Field label="Google Calendar id">
            <input type="text" value={settings.google_calendar_id || 'primary'}
              onChange={e => update({ google_calendar_id: e.target.value })} style={S.input} />
          </Field>
        </div>
      </Section>

      <Section title="Microsoft connector">
        <Notice>Microsoft To Do vereist administrator-toegang voor je tenant — voorlopig uitgeschakeld.</Notice>
      </Section>

      {error && <div style={S.error}>{error}</div>}

      <div style={S.saveBar}>
        <button onClick={save} style={S.primaryBtn}>Opslaan</button>
        {savedAt && <span style={S.subtle}>Opgeslagen om {savedAt.toLocaleTimeString('nl-BE')}</span>}
      </div>
    </Page>
  )
}

// ─── Layout helpers ──────────────────────────────────────────────────
function Page({ children }) {
  return <div style={S.page}>{children}</div>
}
function H1({ children }) { return <h1 style={S.h1}>{children}</h1> }
function P({ children }) { return <p style={S.p}>{children}</p> }
function SubLabel({ children }) { return <div style={S.sub}>{children}</div> }
function Notice({ children }) { return <div style={S.notice}>{children}</div> }
function Section({ title, children }) {
  return (
    <div style={S.section}>
      <h2 style={S.h2}>{title}</h2>
      {children}
    </div>
  )
}
function Field({ label, children }) {
  return (
    <div style={S.field}>
      <label style={S.label}>{label}</label>
      {children}
    </div>
  )
}
function Toggle({ label, checked, onChange }) {
  return (
    <label style={S.toggle}>
      <input type="checkbox" checked={!!checked} onChange={e => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  )
}

const S = {
  page: {
    minHeight: '100vh', backgroundColor: '#0f172a', color: '#e2e8f0',
    padding: '1.5rem 1rem 4rem',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem',
  },
  back: { color: '#64748b', fontSize: '0.85rem', textDecoration: 'none' },
  h1: { fontSize: '1.4rem', fontWeight: 700, margin: 0 },
  h2: { fontSize: '1rem', fontWeight: 600, margin: '0 0 12px', color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: 1 },
  p: { fontSize: 14, lineHeight: 1.5, margin: 0 },
  sub: { fontSize: 11, color: '#64748b', marginTop: 2 },
  section: { backgroundColor: '#1e293b', borderRadius: 12, padding: '1.1rem 1.2rem' },
  field: { marginBottom: 14 },
  label: { display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 6 },
  input: {
    width: '100%', boxSizing: 'border-box',
    backgroundColor: '#0f172a', border: '1px solid #334155',
    color: '#e2e8f0', borderRadius: 6, padding: '8px 10px', fontSize: 14,
  },
  toggle: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#e2e8f0', padding: '6px 0', cursor: 'pointer' },
  primaryBtn: {
    padding: '8px 16px', backgroundColor: '#2563eb', color: 'white',
    border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 600,
  },
  secondaryBtn: {
    padding: '6px 12px', backgroundColor: 'transparent', color: '#cbd5e1',
    border: '1px solid #475569', borderRadius: 6, cursor: 'pointer', fontSize: 13, marginTop: 8,
  },
  notice: {
    backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: 8,
    padding: '10px 12px', fontSize: 13, color: '#cbd5e1',
  },
  error: {
    backgroundColor: '#450a0a', border: '1px solid #7f1d1d', borderRadius: 8,
    padding: '10px 12px', color: '#fca5a5', fontSize: 14,
  },
  saveBar: { display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 },
  subtle: { color: '#64748b', fontSize: 12 },
}
