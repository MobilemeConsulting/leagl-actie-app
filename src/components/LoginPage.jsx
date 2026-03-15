import React, { useState, useEffect } from 'react';
import { signInWithGoogle, signInWithMicrosoft, signInWithEmail, updatePassword, supabase } from '../supabaseClient.js';

// Check if logged-in user must change their password (set by admin on creation)
function checkMustChangePassword(session) {
  return session?.user?.user_metadata?.must_change_password === true;
}

const C = {
  accent:   '#C8A96E',
  blue:     '#4263EB',
  bg:       '#F7F5F2',
  surface:  '#FFFFFF',
  surface2: '#F0EDE8',
  border:   '#E4E1DC',
  text:     '#141210',
  muted:    '#8A8480',
  danger:   '#E5383B',
  success:  '#2D9E5A',
};

const inputStyle = {
  width: '100%',
  background: C.surface,
  border: `1.5px solid ${C.border}`,
  borderRadius: 10,
  padding: '12px 14px',
  color: C.text,
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
  fontFamily: 'inherit',
};

const labelStyle = {
  fontSize: 12,
  color: C.muted,
  display: 'block',
  marginBottom: 7,
  fontWeight: 500,
};

// ── Detect if Supabase redirected back after a password-invite link ──
function needsPasswordSetup() {
  const hash = window.location.hash;
  return hash.includes('type=invite') || hash.includes('type=recovery');
}

export default function LoginPage() {
  const [mode, setMode]               = useState('sso'); // 'sso' | 'email'
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [ssoLoading, setSsoLoading]   = useState(false);
  const [error, setError]             = useState('');

  // Password-setup screen: na invite link OF na eerste login met temp password
  const [showPwSetup, setShowPwSetup]   = useState(needsPasswordSetup);
  const [newPw, setNewPw]               = useState('');
  const [confirmPw, setConfirmPw]       = useState('');
  const [pwLoading, setPwLoading]       = useState(false);
  const [pwError, setPwError]           = useState('');

  // Handle Supabase auth state — detecteer must_change_password na login
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        setSsoLoading(false);
        if (checkMustChangePassword(session)) setShowPwSetup(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleProvider(fn) {
    setError('');
    setSsoLoading(true);
    try { await fn(); }
    catch (e) { setError(e.message); setSsoLoading(false); }
  }

  async function handleEmailLogin() {
    if (!email || !password) { setError('Vul e-mail en wachtwoord in.'); return; }
    setError('');
    setLoginLoading(true);
    try { await signInWithEmail(email, password); }
    catch (e) { setError(e.message); setLoginLoading(false); }
  }

  async function handlePasswordSetup() {
    if (newPw !== confirmPw) { setPwError('Wachtwoorden komen niet overeen.'); return; }
    if (newPw.length < 8)    { setPwError('Minimaal 8 tekens vereist.'); return; }
    setPwError('');
    setPwLoading(true);
    try {
      // Update wachtwoord + clear must_change_password flag
      await supabase.auth.updateUser({
        password: newPw,
        data: { must_change_password: false },
      });
      setShowPwSetup(false);
      window.history.replaceState(null, '', window.location.pathname);
    } catch (e) { setPwError(e.message); setPwLoading(false); }
  }

  // ── Password-setup screen ──────────────────────────────────────────
  if (showPwSetup) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: C.bg }}>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: '44px 44px 40px', width: 420, boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.accent, letterSpacing: '0.12em', marginBottom: 4 }}>LEAGL</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 6, letterSpacing: '-0.01em' }}>Wachtwoord instellen</div>
          <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, marginBottom: 28 }}>Welkom! Kies een persoonlijk wachtwoord om door te gaan.</div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Nieuw wachtwoord</label>
            <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)}
              placeholder="Minimaal 8 tekens" style={inputStyle} />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Bevestig wachtwoord</label>
            <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handlePasswordSetup()}
              placeholder="Herhaal wachtwoord" style={inputStyle} />
          </div>

          {pwError && (
            <div style={{ color: C.danger, fontSize: 13, marginBottom: 16, background: C.danger + '10', border: `1px solid ${C.danger}30`, borderRadius: 8, padding: '10px 14px' }}>
              {pwError}
            </div>
          )}

          <button onClick={handlePasswordSetup} disabled={pwLoading || !newPw || !confirmPw}
            style={{ width: '100%', background: pwLoading || !newPw || !confirmPw ? C.muted : C.blue, border: 'none', color: '#fff', borderRadius: 10, padding: '13px', fontSize: 14, fontWeight: 600, cursor: pwLoading ? 'not-allowed' : 'pointer', boxShadow: pwLoading ? 'none' : '0 2px 8px rgba(66,99,235,0.28)' }}>
            {pwLoading ? 'Opslaan...' : 'Wachtwoord instellen & doorgaan →'}
          </button>
        </div>
      </div>
    );
  }

  // ── Main login screen ──────────────────────────────────────────────
  return (
    <div className="login-split" style={{ display: 'flex', height: '100vh' }}>

      {/* Left — dark brand panel */}
      <div className="login-brand" style={{ width: 420, background: '#0C0D10', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '52px 48px 44px', flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 26, fontWeight: 800, color: C.accent, letterSpacing: '0.12em' }}>LEAGL</div>
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
                <span style={{ color: C.accent, fontSize: 15, flexShrink: 0 }}>{f.icon}</span>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>© {new Date().getFullYear()} LEAGL — Alle rechten voorbehouden</div>
      </div>

      {/* Right — form panel */}
      <div className="login-form" style={{ flex: 1, background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 }}>
        <div style={{ width: '100%', maxWidth: 380 }}>

          <div style={{ marginBottom: 36 }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: C.text, marginBottom: 8, letterSpacing: '-0.02em' }}>Welkom terug</div>
            <div style={{ fontSize: 14, color: C.muted }}>Log in op uw Leagl account</div>
          </div>

          {/* SSO loading spinner */}
          {ssoLoading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: C.muted }}>
              <div style={{ width: 32, height: 32, border: `3px solid ${C.border}`, borderTopColor: C.accent, borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 0.8s linear infinite' }} />
              <div style={{ fontSize: 14 }}>Inloggen via SSO...</div>
            </div>

          ) : mode === 'email' ? (
            /* ── Email login form ── */
            <>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>E-mailadres</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="naam@bedrijf.be" style={inputStyle} />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={labelStyle}>Wachtwoord</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleEmailLogin()}
                  placeholder="••••••••" style={inputStyle} />
              </div>

              {error && (
                <div style={{ color: C.danger, fontSize: 13, marginBottom: 16, background: C.danger + '10', border: `1px solid ${C.danger}30`, borderRadius: 8, padding: '10px 14px' }}>
                  {error}
                </div>
              )}

              <button onClick={handleEmailLogin} disabled={loginLoading}
                style={{ width: '100%', background: loginLoading ? C.muted : C.blue, border: 'none', color: '#fff', borderRadius: 10, padding: '13px', fontSize: 14, fontWeight: 600, cursor: loginLoading ? 'not-allowed' : 'pointer', marginBottom: 12, boxShadow: loginLoading ? 'none' : '0 2px 8px rgba(66,99,235,0.28)' }}>
                {loginLoading ? 'Bezig...' : 'Inloggen →'}
              </button>
              <button onClick={() => { setMode('sso'); setError(''); }}
                style={{ width: '100%', background: 'transparent', border: `1.5px solid ${C.border}`, color: C.muted, borderRadius: 10, padding: '12px', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>
                ← Terug naar SSO
              </button>
            </>

          ) : (
            /* ── SSO buttons ── */
            <>
              {/* Google */}
              <button onClick={() => handleProvider(signInWithGoogle)}
                style={{ width: '100%', background: C.surface, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: '13px 18px', fontSize: 14, fontWeight: 500, cursor: 'pointer', color: C.text, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#B0ADA8'}
                onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
              >
                <svg width="18" height="18" viewBox="0 0 48 48">
                  <path fill="#4285F4" d="M45.5 24.5c0-1.5-.1-3-.4-4.5H24v8.5h12.1c-.5 2.8-2.1 5.1-4.4 6.7v5.5h7.1c4.2-3.8 6.7-9.5 6.7-16.2z"/>
                  <path fill="#34A853" d="M24 46c6 0 11-2 14.7-5.3l-7.1-5.5c-2 1.3-4.5 2.1-7.6 2.1-5.8 0-10.8-3.9-12.5-9.2H4.2v5.7C7.9 41.1 15.4 46 24 46z"/>
                  <path fill="#FBBC05" d="M11.5 28.1c-.5-1.3-.7-2.7-.7-4.1s.3-2.8.7-4.1v-5.7H4.2C2.8 17.1 2 20.4 2 24s.8 6.9 2.2 9.8l7.3-5.7z"/>
                  <path fill="#EA4335" d="M24 10.7c3.3 0 6.2 1.1 8.5 3.3l6.3-6.3C35 4.2 30 2 24 2 15.4 2 7.9 6.9 4.2 14.2l7.3 5.7c1.7-5.3 6.7-9.2 12.5-9.2z"/>
                </svg>
                Inloggen met Google
              </button>

              {/* Microsoft */}
              <button onClick={() => handleProvider(signInWithMicrosoft)}
                style={{ width: '100%', background: C.surface, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: '13px 18px', fontSize: 14, fontWeight: 500, cursor: 'pointer', color: C.text, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#B0ADA8'}
                onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
              >
                <svg width="18" height="18" viewBox="0 0 21 21">
                  <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
                  <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
                  <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
                  <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
                </svg>
                Inloggen met Microsoft
              </button>

              {/* Divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
                <div style={{ flex: 1, height: 1, background: C.border }} />
                <span style={{ fontSize: 12, color: C.muted, fontWeight: 500 }}>of met e-mail</span>
                <div style={{ flex: 1, height: 1, background: C.border }} />
              </div>

              <button onClick={() => { setMode('email'); setError(''); }}
                style={{ width: '100%', background: 'transparent', border: `1.5px solid ${C.border}`, color: C.text, borderRadius: 10, padding: '13px', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#B0ADA8'}
                onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
              >
                Inloggen met e-mail
              </button>

              {error && (
                <div style={{ color: C.danger, fontSize: 13, marginTop: 16, background: C.danger + '10', border: `1px solid ${C.danger}30`, borderRadius: 8, padding: '10px 14px' }}>
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
