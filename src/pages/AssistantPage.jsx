import { useState, useRef, useCallback, useEffect } from 'react'
import { Conversation } from '@11labs/client'
import { assistantApi } from '../lib/assistantClient.js'
import { supabase } from '../supabaseClient.js'

const ANALYZE_DEBOUNCE_MS = 2500

// Trefwoorden die de sessie automatisch afsluiten wanneer de gebruiker ze uitspreekt.
// Match op losstaande woorden of korte zinnen, case-insensitive.
const END_CALL_PATTERNS = [
  /\bsluit\s+(de\s+)?(sessie|gesprek|verbinding|app)?\s*af\b/i,
  /\b(stop|stoppen)(\s+(maar|nu|alsjeblieft))?\s*$/i,
  /\b(tot ziens|doei|dag|salut)\b/i,
  /\bdat was het\b/i,
  /\b(we zijn|ik ben)\s+klaar\b/i,
  /\beinde (van het )?gesprek\b/i,
  /\bbeëindig(en)?\b/i,
]
function isEndCallPhrase(text) {
  return END_CALL_PATTERNS.some(re => re.test(text))
}

// Trefwoorden die automatisch een sessiesamenvatting per e-mail triggeren.
// Ruim opgevat: detect een mail-werkwoord ergens in de zin.
const EMAIL_SUMMARY_PATTERNS = [
  /\b(mail|email|e-?mail|mailtje|mailen)\b/i,        // elk woord met 'mail'
  /\b(stuur|verstuur|stuurt|stuurde)\b.*\b(samenvatting|recap|overzicht)\b/i,
  /\b(in|naar|op)\s+(mijn\s+)?(inbox|mailbox|mail|gmail)\b/i,
]
function isEmailRequest(text) {
  const matched = EMAIL_SUMMARY_PATTERNS.some(re => re.test(text))
  if (matched) console.log('[assistant] email-trigger gedetecteerd:', text)
  return matched
}
const PRIORITY_LABELS = {
  low: 'Laag', medium: 'Normaal', high: 'Hoog', urgent: 'Urgent',
}

export default function AssistantPage() {
  const [status, setStatus] = useState('idle')        // idle | starting | listening | speaking | stopping | error
  const [errorMsg, setErrorMsg] = useState(null)
  const [transcript, setTranscript] = useState([])    // [{role:'user'|'assistant', text, ts}]
  const [extracted, setExtracted] = useState([])      // pending acties
  const [confirmed, setConfirmed] = useState([])      // bevestigde {extracted_id, action_id, subject}
  const [summary, setSummary] = useState(null)
  const [decisions, setDecisions] = useState([])
  const [openQs, setOpenQs] = useState([])
  const [risks, setRisks] = useState([])
  const [analyzing, setAnalyzing] = useState(false)
  const [emailStatus, setEmailStatus] = useState(null)

  const convRef = useRef(null)
  const sessionIdRef = useRef(null)
  const userEmailRef = useRef(null)
  const transcriptRef = useRef([])
  const analyzeTimerRef = useRef(null)
  const wakeLockRef = useRef(null)

  const autostart = typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('autostart') === '1'

  // Probeer user_email op te halen via auth → localStorage → null
  // (auth-sessie is niet vereist voor /assistant; localStorage cache komt uit Settings pagina)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const email = data?.session?.user?.email || localStorage.getItem('leagl_assistant_user_email') || null
      userEmailRef.current = email
      if (email) localStorage.setItem('leagl_assistant_user_email', email)
    }).catch(() => {
      userEmailRef.current = localStorage.getItem('leagl_assistant_user_email') || null
    })
  }, [])

  const requestWakeLock = useCallback(async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen')
        wakeLockRef.current.addEventListener?.('release', () => {
          // Browser kan lock automatisch vrijgeven (bv bij background) — referentie wissen
          wakeLockRef.current = null
        })
      }
    } catch (e) { /* niet kritisch */ }
  }, [])

  const releaseWakeLock = useCallback(async () => {
    try { await wakeLockRef.current?.release() } catch {}
    wakeLockRef.current = null
  }, [])

  // Re-acquire wake-lock bij terug naar voorgrond (iOS verbreekt 'm bij background)
  useEffect(() => {
    const onVisibility = () => {
      const isActive = convRef.current && document.visibilityState === 'visible'
      if (isActive && !wakeLockRef.current) requestWakeLock()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [requestWakeLock])

  const triggerAnalyze = useCallback(() => {
    if (analyzeTimerRef.current) clearTimeout(analyzeTimerRef.current)
    analyzeTimerRef.current = setTimeout(async () => {
      const sessionId = sessionIdRef.current
      const tr = transcriptRef.current
      if (!sessionId || tr.length === 0) return
      try {
        setAnalyzing(true)
        const result = await assistantApi.analyze(sessionId, tr, userEmailRef.current)
        setSummary(result.summary || null)
        setDecisions(result.decisions || [])
        setOpenQs(result.open_questions || [])
        setRisks(result.risks || [])
        if (result.extracted?.length) {
          const autoIds = new Set((result.auto_confirmed || []).map(c => c.extracted_id))
          // Pending = alleen extracted die NIET auto-bevestigd zijn
          setExtracted(prev => {
            const existing = new Set(prev.map(e => e.id))
            const fresh = result.extracted.filter(e => !existing.has(e.id) && !autoIds.has(e.id))
            return [...prev, ...fresh]
          })
        }
        if (result.auto_confirmed?.length) {
          setConfirmed(prev => [...prev, ...result.auto_confirmed])
        }
      } catch (e) {
        console.warn('[assistant] analyze fout:', e.message)
      } finally {
        setAnalyzing(false)
      }
    }, ANALYZE_DEBOUNCE_MS)
  }, [])

  const handleMessage = useCallback((msg) => {
    // ElevenLabs SDK: msg.source = 'user' | 'ai', msg.message = transcript-tekst
    const source = msg?.source
    const text = msg?.message || msg?.text || ''
    if (!source || !text) return
    const role = source === 'user' ? 'user' : 'assistant'
    const entry = { role, text, ts: Date.now() }
    transcriptRef.current = [...transcriptRef.current, entry]
    setTranscript(t => [...t, entry])
    if (role === 'user') {
      triggerAnalyze()
      if (isEmailRequest(text)) {
        // Wacht tot Claude de samenvatting heeft bijgewerkt (analyze + buffer), stuur dan automatisch
        setTimeout(() => { sendEmailRef.current?.() }, ANALYZE_DEBOUNCE_MS + 1500)
      }
      if (isEndCallPhrase(text)) {
        // Geef de assistent ~1 sec om iets terug te zeggen, sluit dan af
        setTimeout(() => { stopRef.current?.() }, 1200)
      }
    }
  }, [triggerAnalyze])

  const stopRef = useRef(null)
  const sendEmailRef = useRef(null)

  const start = useCallback(async () => {
    setErrorMsg(null)
    setStatus('starting')
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true })
      const config = await assistantApi.getVoiceConfig()
      const params = new URLSearchParams(window.location.search)
      const isStandalone = window.matchMedia?.('(display-mode: standalone)').matches
        || window.navigator.standalone === true
      const source = params.get('source') || (isStandalone ? 'pwa' : 'web')
      const session = await assistantApi.startSession(source, userEmailRef.current)
      sessionIdRef.current = session.session_id

      const conv = await Conversation.startSession({
        agentId: config.agent_id,
        onStatusChange: ({ status: s }) => {
          if (s === 'connected') setStatus('listening')
          else if (s === 'disconnected') setStatus('idle')
        },
        onModeChange: ({ mode }) => {
          if (mode === 'speaking') setStatus('speaking')
          else if (mode === 'listening') setStatus('listening')
        },
        onMessage: handleMessage,
        onError: (err) => {
          const msg = typeof err === 'string' ? err : err?.message || JSON.stringify(err)
          console.error('ElevenLabs error:', msg)
          setErrorMsg(msg)
          setStatus('error')
        },
        onDisconnect: ({ reason } = {}) => {
          if (reason) setErrorMsg(`Verbinding verbroken: ${reason}`)
          setStatus('idle')
        },
      })
      convRef.current = conv
      requestWakeLock()
    } catch (err) {
      setErrorMsg(err?.message || 'Kon assistent niet starten.')
      setStatus('error')
    }
  }, [handleMessage])

  const stop = useCallback(async () => {
    if (status === 'stopping' || status === 'idle') return
    setStatus('stopping')
    try { await convRef.current?.endSession() } catch {}
    convRef.current = null
    if (sessionIdRef.current) {
      // forceer laatste analyse
      if (transcriptRef.current.length) {
        try { await assistantApi.analyze(sessionIdRef.current, transcriptRef.current, userEmailRef.current) } catch {}
      }
      try { await assistantApi.endSession(sessionIdRef.current) } catch {}
    }
    releaseWakeLock()
    setStatus('idle')
  }, [status])

  // Houd stopRef gesynchroniseerd zodat handleMessage de meest recente versie kan oproepen
  useEffect(() => { stopRef.current = stop }, [stop])

  // Auto-start na eerste tap (browser vereist user gesture voor mic)
  const [autoArmed, setAutoArmed] = useState(false)
  useEffect(() => {
    if (autostart && !autoArmed && status === 'idle') {
      // wacht tot user iets tapt — knop hieronder triggert dat
    }
  }, [autostart, autoArmed, status])

  // Cleanup
  useEffect(() => () => {
    convRef.current?.endSession?.()
    releaseWakeLock()
  }, [])

  const confirmOne = async (extractedId) => {
    try {
      const res = await assistantApi.confirmActions([extractedId], userEmailRef.current)
      setConfirmed(prev => [...prev, ...(res.created || [])])
      setExtracted(prev => prev.filter(e => e.id !== extractedId))
    } catch (e) { console.warn(e) }
  }

  const confirmAll = async () => {
    if (extracted.length === 0) return
    try {
      const res = await assistantApi.confirmActions(extracted.map(e => e.id), userEmailRef.current)
      setConfirmed(prev => [...prev, ...(res.created || [])])
      setExtracted([])
    } catch (e) { console.warn(e) }
  }

  const rejectOne = async (extractedId) => {
    try {
      await assistantApi.rejectActions([extractedId])
      setExtracted(prev => prev.filter(e => e.id !== extractedId))
    } catch (e) { console.warn(e) }
  }

  const sendEmail = useCallback(async () => {
    if (!sessionIdRef.current) {
      console.warn('[assistant] sendEmail: geen session_id')
      return
    }
    console.log('[assistant] sendEmail trigger voor sessie', sessionIdRef.current)
    setEmailStatus('sending')
    try {
      const res = await assistantApi.emailSummary(sessionIdRef.current)
      console.log('[assistant] sendEmail OK:', res)
      setEmailStatus(`Verstuurd naar ${res.sent_to}`)
    } catch (e) {
      console.error('[assistant] sendEmail FOUT:', e)
      setEmailStatus(`Fout: ${e.message}`)
    }
  }, [])

  // Houd sendEmailRef in sync zodat handleMessage de meest recente versie kan oproepen
  useEffect(() => { sendEmailRef.current = sendEmail }, [sendEmail])

  const isActive = status === 'listening' || status === 'speaking'
  const isStarting = status === 'starting'
  const isStopping = status === 'stopping'
  const isSpeaking = status === 'speaking'
  const isListening = status === 'listening'

  return (
    <div style={S.page}>
      <div style={S.topRow}>
        <a href="/" style={S.back}>← Actielijst</a>
        <div style={{ display: 'flex', gap: 16 }}>
          <a href="/assistant/history" style={S.back} title="Historiek">📜 Sessies</a>
          <a href="/assistant/settings" style={S.back} title="Instellingen">⚙ Instellingen</a>
        </div>
      </div>
      <div style={S.brand}>LEAGL — Executive Assistent</div>

      <button
        onClick={isActive ? stop : start}
        disabled={isStarting || isStopping}
        style={{
          ...S.bigButton,
          backgroundColor: isSpeaking ? '#7c3aed' : isListening ? '#ef4444'
            : isStarting ? '#334155' : '#2563eb',
          boxShadow: isSpeaking ? '0 8px 32px rgba(124,58,237,0.4)'
            : isListening ? '0 8px 32px rgba(239,68,68,0.4)'
            : '0 8px 32px rgba(37,99,235,0.4)',
          animation: isSpeaking ? 'spreek 1.2s ease-in-out infinite'
            : isListening ? 'pulse 1.5s infinite' : 'none',
          cursor: isStarting || isStopping ? 'default' : 'pointer',
        }}
      >
        {isSpeaking ? <SpeakerIcon size={72}/>
          : isStarting ? <SpinnerIcon size={48}/>
          : <MicIcon size={72}/>}
      </button>

      <div style={S.statusText}>
        {status === 'idle' && !errorMsg && (autostart ? 'Tik om te starten' : 'Tik op de knop')}
        {isStarting && 'Verbinden...'}
        {isListening && 'Ik luister...'}
        {isSpeaking && 'Aan het spreken...'}
        {isStopping && 'Stoppen...'}
      </div>

      {analyzing && <div style={S.subtle}>Analyseren...</div>}

      {errorMsg && (
        <div style={S.error}>
          {errorMsg}
          <div style={{ marginTop: '0.6rem' }}>
            <button onClick={() => { setErrorMsg(null); start() }} style={S.errorBtn}>Opnieuw</button>
          </div>
        </div>
      )}

      {/* Transcript */}
      {transcript.length > 0 && (
        <div style={S.transcriptBox}>
          {transcript.slice(-6).map((t, i) => (
            <div key={i} style={{ ...S.transcriptLine, color: t.role === 'user' ? '#e2e8f0' : '#94a3b8' }}>
              <span style={{ fontWeight: 600, marginRight: 6 }}>{t.role === 'user' ? 'Jij' : 'Assistent'}:</span>
              {t.text}
            </div>
          ))}
        </div>
      )}

      {/* Voorgestelde acties */}
      {extracted.length > 0 && (
        <div style={S.panel}>
          <div style={S.panelHeader}>
            <span>Voorgestelde acties ({extracted.length})</span>
            <button onClick={confirmAll} style={S.acceptAllBtn}>Alles bevestigen</button>
          </div>
          {extracted.map(a => (
            <div key={a.id} style={S.actionCard}>
              <div style={S.actionSubject}>{a.subject}</div>
              <div style={S.actionMeta}>
                {a.due_date && <span style={S.metaTag}>📅 {a.due_date}</span>}
                {a.priority && <span style={S.metaTag}>⚡ {PRIORITY_LABELS[a.priority] || a.priority}</span>}
                {a.assigned_to_email && <span style={S.metaTag}>👤 {a.assigned_to_email}</span>}
                {a.category_hint && <span style={S.metaTag}>🏷 {a.category_hint}</span>}
              </div>
              {a.description && <div style={S.actionDesc}>{a.description}</div>}
              <div style={S.actionRow}>
                <button onClick={() => confirmOne(a.id)} style={S.confirmBtn}>Bevestig</button>
                <button onClick={() => rejectOne(a.id)} style={S.rejectBtn}>Verwerp</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bevestigde acties */}
      {confirmed.length > 0 && (
        <div style={S.panel}>
          <div style={S.panelHeader}><span>Bevestigde acties ({confirmed.length})</span></div>
          {confirmed.map(c => (
            <div key={c.action_id} style={S.confirmedRow}>✅ {c.subject}</div>
          ))}
        </div>
      )}

      {/* Samenvatting */}
      {(summary || decisions.length || openQs.length || risks.length) && (
        <div style={S.panel}>
          <div style={S.panelHeader}>
            <span>Samenvatting</span>
            <button onClick={sendEmail} disabled={emailStatus === 'sending'} style={S.mailBtn}>
              {emailStatus === 'sending' ? 'Versturen...' : 'Mail me dit'}
            </button>
          </div>
          {summary && <div style={S.summaryText}>{summary}</div>}
          {decisions.length > 0 && <Section title="Beslissingen" items={decisions}/>}
          {openQs.length > 0 && <Section title="Open vragen" items={openQs}/>}
          {risks.length > 0 && <Section title="Aandachtspunten" items={risks}/>}
          {emailStatus && emailStatus !== 'sending' && (
            <div style={S.subtle}>{emailStatus}</div>
          )}
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%   { box-shadow: 0 0 0 0 rgba(239,68,68,0.5), 0 0 0 16px rgba(239,68,68,0.2); }
          70%  { box-shadow: 0 0 0 16px rgba(239,68,68,0.1), 0 0 0 32px rgba(239,68,68,0.05); }
          100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.5), 0 0 0 16px rgba(239,68,68,0.2); }
        }
        @keyframes spreek {
          0%,100% { box-shadow: 0 0 0 0 rgba(124,58,237,0.6), 0 0 0 12px rgba(124,58,237,0.2); transform: scale(1); }
          50%     { box-shadow: 0 0 0 16px rgba(124,58,237,0.2), 0 0 0 32px rgba(124,58,237,0.08); transform: scale(1.04); }
        }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

function Section({ title, items }) {
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{title}</div>
      <ul style={{ margin: 0, paddingLeft: 20, color: '#e2e8f0', fontSize: 14, lineHeight: 1.5 }}>
        {items.map((it, i) => <li key={i}>{it}</li>)}
      </ul>
    </div>
  )
}

const S = {
  page: {
    minHeight: '100vh', backgroundColor: '#0f172a',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    padding: '1.5rem 1rem 4rem', gap: '1.25rem',
  },
  topRow: {
    width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
  back: {
    color: '#64748b', fontSize: '0.85rem', textDecoration: 'none',
  },
  brand: {
    color: '#64748b', fontSize: '0.75rem',
    letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 600,
    marginTop: 4,
  },
  bigButton: {
    width: 180, height: 180, borderRadius: '50%', border: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'background-color 0.3s, box-shadow 0.3s', flexShrink: 0,
    marginTop: 8,
  },
  statusText: { color: '#e2e8f0', fontSize: '1.1rem', fontWeight: 600, textAlign: 'center' },
  subtle: { color: '#475569', fontSize: '0.85rem', textAlign: 'center' },
  error: {
    backgroundColor: '#450a0a', border: '1px solid #7f1d1d',
    borderRadius: 10, padding: '0.75rem 1.25rem',
    color: '#fca5a5', fontSize: '0.9rem', maxWidth: 360, textAlign: 'center',
  },
  errorBtn: {
    padding: '0.4rem 1rem', borderRadius: 6, border: 'none',
    backgroundColor: '#7f1d1d', color: 'white', cursor: 'pointer', fontSize: '0.85rem',
  },
  transcriptBox: {
    width: '100%', maxWidth: 560,
    backgroundColor: '#1e293b', borderRadius: 12,
    padding: '1rem', display: 'flex', flexDirection: 'column', gap: 6,
  },
  transcriptLine: { fontSize: 14, lineHeight: 1.5 },
  panel: {
    width: '100%', maxWidth: 560,
    backgroundColor: '#1e293b', borderRadius: 12, padding: '1rem',
  },
  panelHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    color: '#e2e8f0', fontSize: 14, fontWeight: 600, marginBottom: 10,
  },
  acceptAllBtn: {
    padding: '0.35rem 0.8rem', borderRadius: 6, border: 'none',
    backgroundColor: '#16a34a', color: 'white', cursor: 'pointer', fontSize: 13,
  },
  actionCard: {
    backgroundColor: '#0f172a', borderRadius: 8,
    padding: '0.75rem 0.9rem', marginBottom: 10,
    border: '1px solid #334155',
  },
  actionSubject: { color: '#f1f5f9', fontSize: 15, fontWeight: 600, marginBottom: 6 },
  actionMeta: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  metaTag: { fontSize: 12, color: '#94a3b8', backgroundColor: '#1e293b', padding: '2px 8px', borderRadius: 10 },
  actionDesc: { color: '#cbd5e1', fontSize: 13, marginBottom: 8 },
  actionRow: { display: 'flex', gap: 8 },
  confirmBtn: {
    padding: '0.4rem 0.9rem', borderRadius: 6, border: 'none',
    backgroundColor: '#16a34a', color: 'white', cursor: 'pointer', fontSize: 13,
  },
  rejectBtn: {
    padding: '0.4rem 0.9rem', borderRadius: 6, border: '1px solid #475569',
    backgroundColor: 'transparent', color: '#cbd5e1', cursor: 'pointer', fontSize: 13,
  },
  confirmedRow: { color: '#86efac', fontSize: 14, padding: '4px 0' },
  summaryText: { color: '#e2e8f0', fontSize: 14, lineHeight: 1.5 },
  mailBtn: {
    padding: '0.35rem 0.8rem', borderRadius: 6, border: '1px solid #475569',
    backgroundColor: 'transparent', color: '#cbd5e1', cursor: 'pointer', fontSize: 13,
  },
}

function MicIcon({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  )
}

function SpeakerIcon({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
  )
}

function SpinnerIcon({ size }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      border: '4px solid rgba(255,255,255,0.2)',
      borderTopColor: 'white', animation: 'spin 1s linear infinite',
    }} />
  )
}
