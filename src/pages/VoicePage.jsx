import { useState, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

const TENANT_ID = '4e3ad38c-08a8-4eae-94dc-0b9633180e70'

export default function VoicePage() {
  const [status, setStatus] = useState('idle') // idle | listening | saving | done | error
  const [transcript, setTranscript] = useState('')
  const [lastAction, setLastAction] = useState('')
  const recognitionRef = useRef(null)

  function startListening() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setStatus('error')
      setTranscript('Spraakherkenning wordt niet ondersteund in deze browser.')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'nl-NL'
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognitionRef.current = recognition

    recognition.onstart = () => setStatus('listening')

    recognition.onresult = async (e) => {
      const text = e.results[0][0].transcript
      setTranscript(text)
      setStatus('saving')
      await saveAction(text)
    }

    recognition.onerror = (e) => {
      setStatus('error')
      setTranscript('Fout: ' + e.error)
    }

    recognition.onend = () => {
      if (status === 'listening') setStatus('idle')
    }

    recognition.start()
  }

  async function saveAction(subject) {
    const { error } = await supabase.from('actions').insert({
      subject,
      tenant_id: TENANT_ID,
      status: 'Open',
      percent_delivery: 0,
      is_private: false,
    })

    if (error) {
      setStatus('error')
      setTranscript('Opslaan mislukt: ' + error.message)
    } else {
      setLastAction(subject)
      setTranscript('')
      setStatus('done')
      setTimeout(() => setStatus('idle'), 3000)
    }
  }

  const isListening = status === 'listening'
  const isSaving = status === 'saving'

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0f172a',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, sans-serif',
      padding: '2rem',
      gap: '2rem',
    }}>
      <div style={{ color: '#94a3b8', fontSize: '1rem', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
        LEAGL — Nieuwe Actie
      </div>

      {/* Grote microfoonknop */}
      <button
        onClick={startListening}
        disabled={isListening || isSaving}
        style={{
          width: '200px',
          height: '200px',
          borderRadius: '50%',
          border: 'none',
          cursor: isListening || isSaving ? 'default' : 'pointer',
          backgroundColor: isListening ? '#ef4444' : isSaving ? '#f59e0b' : '#2563eb',
          boxShadow: isListening
            ? '0 0 0 20px rgba(239,68,68,0.2), 0 0 0 40px rgba(239,68,68,0.1)'
            : '0 8px 32px rgba(37,99,235,0.4)',
          transition: 'all 0.3s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: isListening ? 'pulse 1.5s infinite' : 'none',
        }}
      >
        {isSaving ? (
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
          </svg>
        ) : (
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
        )}
      </button>

      {/* Status tekst */}
      <div style={{ textAlign: 'center', color: 'white', fontSize: '1.4rem', fontWeight: '600', minHeight: '2rem' }}>
        {status === 'idle' && 'Tik om in te spreken'}
        {status === 'listening' && '🎙 Luisteren...'}
        {status === 'saving' && '💾 Opslaan...'}
        {status === 'done' && '✅ Actie aangemaakt!'}
        {status === 'error' && '❌ Fout'}
      </div>

      {/* Transcript of foutmelding */}
      {transcript && (
        <div style={{
          backgroundColor: '#1e293b',
          borderRadius: '12px',
          padding: '1rem 1.5rem',
          color: '#e2e8f0',
          fontSize: '1.1rem',
          maxWidth: '400px',
          textAlign: 'center',
        }}>
          "{transcript}"
        </div>
      )}

      {/* Laatste actie */}
      {status === 'done' && lastAction && (
        <div style={{ color: '#4ade80', fontSize: '1rem', textAlign: 'center', maxWidth: '400px' }}>
          "{lastAction}" is toegevoegd aan je actielijst
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(239,68,68,0.4), 0 0 0 20px rgba(239,68,68,0.2); }
          70% { box-shadow: 0 0 0 20px rgba(239,68,68,0.1), 0 0 0 40px rgba(239,68,68,0.05); }
          100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.4), 0 0 0 20px rgba(239,68,68,0.2); }
        }
      `}</style>
    </div>
  )
}
