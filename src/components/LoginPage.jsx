import React, { useState } from 'react';
import { signInWithMicrosoft } from '../supabaseClient.js';

const COLORS = {
  accent: '#C8A96E',
  blue: '#4263EB',
  bg: '#F7F5F2',
  surface: '#FFFFFF',
  surface2: '#F0EDE8',
  border: '#E4E1DC',
  text: '#141210',
  muted: '#8A8480',
  danger: '#E5383B',
};

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const handleMicrosoftLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithMicrosoft();
    } catch (err) {
      setError('Inloggen mislukt. Controleer je verbinding en probeer opnieuw.');
      setLoading(false);
    }
  };

  return (
    <div className="login-split" style={{ display: 'flex', height: '100vh' }}>

      {/* ── Left — brand panel ── */}
      <div className="login-brand" style={{ width: 420, background: '#0C0D10', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '52px 48px 44px', flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 26, fontWeight: 800, color: COLORS.accent, letterSpacing: '0.12em' }}>LEAGL</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.22em', textTransform: 'uppercase', marginTop: 6 }}>Actie Platform</div>
        </div>
        <div>
          <div style={{ fontSize: 30, fontWeight: 700, color: '#F5F4F2', lineHeight: 1.3, marginBottom: 20, letterSpacing: '-0.02em' }}>
            Team acties,<br />altijd onder controle.
          </div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.40)', lineHeight: 1.75, marginBottom: 40 }}>
            Beheer actiepunten, volg voortgang en sync met Microsoft To Do — alles in één overzicht.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { icon: '◆', text: 'Sync met Microsoft To Do' },
              { icon: '◎', text: 'Automatische e-mail reminders' },
              { icon: '⬡', text: 'Desktop tabel & mobiele cards' },
            ].map(f => (
              <div key={f.text} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <span style={{ color: COLORS.accent, fontSize: 15, flexShrink: 0 }}>{f.icon}</span>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>© {new Date().getFullYear()} LEAGL — Alle rechten voorbehouden</div>
      </div>

      {/* ── Right — form panel ── */}
      <div className="login-form" style={{ flex: 1, background: COLORS.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          <div style={{ marginBottom: 36 }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: COLORS.text, marginBottom: 8, letterSpacing: '-0.02em' }}>Welkom terug</div>
            <div style={{ fontSize: 14, color: COLORS.muted }}>Log in met je Microsoft account om door te gaan.</div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: COLORS.muted }}>
              <div style={{ width: 32, height: 32, border: `3px solid ${COLORS.border}`, borderTopColor: COLORS.accent, borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 0.8s linear infinite' }} />
              <div style={{ fontSize: 14 }}>Inloggen via Microsoft...</div>
            </div>
          ) : (
            <>
              <button
                onClick={handleMicrosoftLogin}
                style={{ width: '100%', background: COLORS.surface, border: `1.5px solid ${COLORS.border}`, borderRadius: 10, padding: '13px 18px', fontSize: 14, fontWeight: 500, cursor: 'pointer', color: COLORS.text, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', transition: 'border-color 160ms ease, box-shadow 160ms ease' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#B0ADA8'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = COLORS.border; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'; }}
              >
                <svg width="18" height="18" viewBox="0 0 21 21">
                  <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
                  <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
                  <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
                  <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
                </svg>
                Inloggen met Microsoft
              </button>

              {error && (
                <div style={{ color: COLORS.danger, fontSize: 13, marginTop: 16, background: COLORS.danger + '10', border: `1px solid ${COLORS.danger}30`, borderRadius: 8, padding: '10px 14px' }}>
                  {error}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
