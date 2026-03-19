import { useState, useRef, useCallback } from 'react'
import { Conversation } from '@11labs/client'

const AGENT_ID = 'agent_4401km2r3djfeqvrvtwhepda4qqk'

export default function VoicePage() {
  const [status, setStatus] = useState('disconnected') // connecting | connected | disconnecting | disconnected
  const [mode, setMode]     = useState('listening')    // listening | speaking
  const [fout, setFout]     = useState(null)
  const convRef = useRef(null)

  const verbind = useCallback(async () => {
    setFout(null)
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true })
      const conv = await Conversation.startSession({
        agentId: AGENT_ID,
        overrides: {
          tts: { voiceId: 'DYvUSWzbIy47Jl54JlkE' },
        },
        onStatusChange: ({ status }) => setStatus(status),
        onModeChange:   ({ mode })   => setMode(mode),
        onError: (err) => {
          const msg = typeof err === 'string' ? err : err?.message || JSON.stringify(err)
          console.error('ElevenLabs error:', msg)
          setFout(msg)
        },
        onDisconnect: ({ reason } = {}) => {
          console.warn('ElevenLabs disconnect, reason:', reason)
          setFout(`Verbinding verbroken: ${reason || 'onbekend'}`)
          setStatus('disconnected')
          setMode('listening')
        },
      })
      convRef.current = conv
    } catch (err) {
      setFout(err?.message || 'Microfoon toegang geweigerd of agent niet bereikbaar.')
      setStatus('disconnected')
    }
  }, [])

  const verbreek = useCallback(async () => {
    await convRef.current?.endSession()
    convRef.current = null
  }, [])

  const isVerbonden  = status === 'connected'
  const isVerbinding = status === 'connecting'
  const spreekt      = isVerbonden && mode === 'speaking'
  const luistert     = isVerbonden && mode === 'listening'

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0f172a',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: '2rem 1rem',
      gap: '2rem',
    }}>

      <div style={{ color: '#64748b', fontSize: '0.8rem', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 600 }}>
        LEAGL — Spraakassistent
      </div>

      {/* Grote knop */}
      <button
        onClick={isVerbonden ? verbreek : verbind}
        disabled={isVerbinding || status === 'disconnecting'}
        style={{
          width: '180px',
          height: '180px',
          borderRadius: '50%',
          border: 'none',
          cursor: isVerbinding ? 'default' : 'pointer',
          backgroundColor: spreekt ? '#7c3aed' : luistert ? '#ef4444' : isVerbinding ? '#334155' : '#2563eb',
          boxShadow: spreekt
            ? '0 8px 32px rgba(124,58,237,0.4)'
            : luistert ? '0 8px 32px rgba(239,68,68,0.4)'
            : '0 8px 32px rgba(37,99,235,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background-color 0.3s ease, box-shadow 0.3s ease',
          animation: spreekt ? 'spreek 1.2s ease-in-out infinite' : luistert ? 'pulse 1.5s infinite' : 'none',
          flexShrink: 0,
        }}
      >
        {spreekt
          ? <SpeakerIcon size={72} />
          : isVerbinding
          ? <SpinnerIcon size={48} />
          : <MicIcon size={72} />
        }
      </button>

      {/* Status */}
      <div style={{ color: '#e2e8f0', fontSize: '1.2rem', fontWeight: 600, textAlign: 'center' }}>
        {status === 'disconnected' && !fout && 'Tik om te beginnen'}
        {isVerbinding && 'Verbinden...'}
        {spreekt  && 'Aan het spreken...'}
        {luistert && 'Ik luister...'}
        {status === 'disconnecting' && 'Verbinding verbreken...'}
      </div>

      {/* Subtekst */}
      {status === 'disconnected' && !fout && (
        <div style={{ color: '#475569', fontSize: '0.85rem', textAlign: 'center', maxWidth: '280px' }}>
          Zeg "nieuwe actie" of "overzicht van mijn acties"
        </div>
      )}
      {isVerbonden && (
        <div style={{ color: '#475569', fontSize: '0.85rem' }}>
          Tik op de knop om te stoppen
        </div>
      )}

      {/* Foutmelding */}
      {fout && (
        <div style={{
          backgroundColor: '#450a0a',
          border: '1px solid #7f1d1d',
          borderRadius: '10px',
          padding: '0.75rem 1.25rem',
          color: '#fca5a5',
          fontSize: '0.9rem',
          maxWidth: '360px',
          textAlign: 'center',
        }}>
          {fout}
          <div style={{ marginTop: '0.75rem' }}>
            <button onClick={() => { setFout(null); verbind() }} style={{
              padding: '0.4rem 1rem', borderRadius: '6px', border: 'none',
              backgroundColor: '#7f1d1d', color: 'white', cursor: 'pointer', fontSize: '0.85rem',
            }}>
              Opnieuw proberen
            </button>
          </div>
        </div>
      )}

      {/* Link naar actielijst */}
      <a href="/" style={{ color: '#334155', fontSize: '0.8rem', textDecoration: 'none', marginTop: '1rem' }}>
        ← Naar actielijst
      </a>

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
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
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
      width: size,
      height: size,
      borderRadius: '50%',
      border: '4px solid rgba(255,255,255,0.2)',
      borderTopColor: 'white',
      animation: 'spin 1s linear infinite',
    }} />
  )
}
