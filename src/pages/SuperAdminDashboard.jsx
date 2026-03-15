import React, { useState, useEffect, useCallback } from 'react';
import { adminSupabase } from '../adminSupabaseClient.js';
import { Plus, Trash2, Eye, EyeOff, LogOut, ShieldCheck, RefreshCw, Building2, Users, X, UserPlus } from 'lucide-react';

const BREVO_KEY = import.meta.env.VITE_BREVO_API_KEY;
const APP_URL   = import.meta.env.VITE_APP_URL || 'https://leagl-actionlist.up.railway.app';
const SENDER    = 'frederiek.deprest@gmail.com';

function genTempPassword() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

async function sendWelcomeEmail({ to, tempPassword, name, role = 'member', tenantName = 'LEAGL' }) {
  if (!BREVO_KEY) { console.warn('VITE_BREVO_API_KEY not set — email skipped'); return; }
  const displayName = name?.trim() || (to.split('@')[0].charAt(0).toUpperCase() + to.split('@')[0].slice(1));
  const isAdmin = role === 'admin';
  const adminBlock = isAdmin ? `
          <div style="background:#EEF2FF;border:1px solid #C7D2FE;border-radius:8px;padding:20px 24px;margin-bottom:20px;">
            <div style="font-size:12px;font-weight:700;color:#4338CA;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">🛡 Jouw beheerderstoegang</div>
            <p style="margin:0 0 10px;font-size:13px;color:#1E1B4B;line-height:1.6;">Je beschikt ook over het <strong>Admin Panel</strong> waarmee je jouw organisatie beheert:</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td style="padding-bottom:8px;vertical-align:top;width:22px;padding-top:1px;"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#4263EB;margin-top:5px;"></span></td><td style="padding-bottom:8px;font-size:13px;color:#1E1B4B;line-height:1.6;"><strong>Gebruikers beheren:</strong> nieuwe teamleden toevoegen, deactiveren of wachtwoord resetten.</td></tr>
              <tr><td style="padding-bottom:8px;vertical-align:top;padding-top:1px;"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#4263EB;margin-top:5px;"></span></td><td style="padding-bottom:8px;font-size:13px;color:#1E1B4B;line-height:1.6;"><strong>Alle acties inzien:</strong> volledig overzicht van het team met CSV-export.</td></tr>
              <tr><td style="vertical-align:top;padding-top:1px;"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#4263EB;margin-top:5px;"></span></td><td style="font-size:13px;color:#1E1B4B;line-height:1.6;"><strong>Audit log:</strong> wie heeft wat gewijzigd en wanneer.</td></tr>
            </table>
            <div style="margin-top:16px;">
              <a href="${APP_URL}/admin" style="display:inline-block;background:#4263EB;color:#FFFFFF;text-decoration:none;font-size:13px;font-weight:700;padding:10px 20px;border-radius:7px;">Naar Admin Panel →</a>
            </div>
          </div>` : '';
  const html = `<!DOCTYPE html>
<html lang="nl"><head><meta charset="UTF-8"><title>Welkom bij LEAGL Actie App</title></head>
<body style="margin:0;padding:0;background:#F7F5F2;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F5F2;padding:40px 0;">
    <tr><td align="center">
      <table width="640" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr><td style="background:#0C0D10;padding:28px 40px;">
          <div style="font-size:24px;font-weight:800;color:#C8A96E;letter-spacing:3px;">LEAGL</div>
          <div style="font-size:10px;color:rgba(255,255,255,0.4);letter-spacing:3px;text-transform:uppercase;margin-top:4px;">Actie Platform</div>
        </td></tr>
        <tr><td style="padding:40px;">
          <h1 style="margin:0 0 20px;font-size:20px;font-weight:700;color:#141210;">Welkom bij de ${tenantName} Actie App!</h1>
          <p style="margin:0 0 16px;font-size:14px;color:#141210;line-height:1.7;">Beste ${displayName},</p>
          <p style="margin:0 0 10px;font-size:14px;color:#5A5856;line-height:1.7;">Om onze manier van werken scherper, transparanter en efficiënter te beheren, stappen we vandaag over naar een nieuwe manier van samenwerken via de Team Actions App.</p>
          <p style="margin:0 0 10px;font-size:14px;color:#5A5856;line-height:1.7;">Geen versnipperde informatie meer in mailboxen of papieren actielijsten, maar één centrale <strong>single point of truth</strong>.</p>
          <p style="margin:0 0 24px;font-size:14px;color:#5A5856;line-height:1.7;">Vanaf nu heb je altijd en overal real-time inzicht in lopende acties, deadlines en prioriteiten van alle leden van het team.</p>
          <div style="background:#F0EDE8;border:1px solid #E4E1DC;border-radius:8px;padding:20px 24px;margin-bottom:24px;">
            <div style="font-size:12px;font-weight:700;color:#8A8480;text-transform:uppercase;letter-spacing:1px;margin-bottom:14px;">Wat kun je doen?</div>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td style="padding-bottom:12px;vertical-align:top;width:22px;padding-top:1px;"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#C8A96E;margin-top:5px;"></span></td><td style="padding-bottom:12px;font-size:13px;color:#141210;line-height:1.6;"><strong>Acties inzien:</strong> Je vindt al je acties direct in de app.</td></tr>
              <tr><td style="padding-bottom:12px;vertical-align:top;padding-top:1px;"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#C8A96E;margin-top:5px;"></span></td><td style="padding-bottom:12px;font-size:13px;color:#141210;line-height:1.6;"><strong>Updates geven:</strong> Pas eenvoudig het groeipercentage aan zodat iedereen weet hoever je bent.</td></tr>
              <tr><td style="vertical-align:top;padding-top:1px;"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#C8A96E;margin-top:5px;"></span></td><td style="font-size:13px;color:#141210;line-height:1.6;"><strong>Snel afvinken:</strong> Klaar? Eén klik op 'Afvinken' en de actie verdwijnt naar de historie.</td></tr>
            </table>
          </div>
          ${adminBlock}
          <div style="background:#FFFFFF;border:1px solid #E4E1DC;border-radius:8px;padding:20px 24px;margin-bottom:20px;">
            <div style="font-size:12px;font-weight:700;color:#8A8480;text-transform:uppercase;letter-spacing:1px;margin-bottom:14px;">Uw inloggegevens</div>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td style="font-size:13px;color:#8A8480;padding-bottom:8px;width:140px;">E-mailadres</td><td style="font-size:13px;font-weight:600;color:#141210;padding-bottom:8px;">${to}</td></tr>
              <tr><td style="font-size:13px;color:#8A8480;">Tijdelijk wachtwoord</td><td><span style="font-size:17px;font-weight:800;color:#4263EB;letter-spacing:2px;font-family:monospace;">${tempPassword}</span></td></tr>
            </table>
          </div>
          <div style="background:#F0EDE8;border:1px solid #E4E1DC;border-radius:8px;padding:16px 20px;margin-bottom:16px;">
            <div style="font-size:12px;font-weight:700;color:#8A8480;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">Hoe inloggen?</div>
            <p style="margin:0 0 12px;font-size:13px;color:#141210;line-height:1.6;">Je kunt inloggen met het e-mailadres en tijdelijk wachtwoord hierboven. Maar het mag ook eenvoudiger:</p>
            <p style="margin:0;font-size:13px;color:#141210;line-height:1.6;background:#FFFFFF;border:1px solid #E4E1DC;border-radius:6px;padding:12px 14px;">💡 <strong>Single Sign-On (SSO):</strong> gebruikt jouw organisatie Office 365 op dit e-mailadres, of heb je een Google-account? Dan kan je op de loginpagina eenvoudig inloggen via de knop <em>"Doorgaan met Microsoft"</em> of <em>"Doorgaan met Google"</em> — zonder apart wachtwoord.</p>
          </div>
          <div style="background:#FEF3C7;border:1px solid #F59E0B;border-radius:6px;padding:12px 16px;margin-bottom:28px;">
            <p style="margin:0;font-size:13px;color:#92400E;line-height:1.5;">⚠ Logt u in met e-mail + wachtwoord? Bij uw eerste login wordt u gevraagd een nieuw persoonlijk wachtwoord in te stellen.</p>
          </div>
          <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
            <tr><td style="background:#4263EB;border-radius:8px;"><a href="${APP_URL}" style="display:block;padding:13px 28px;font-size:14px;font-weight:700;color:#FFFFFF;text-decoration:none;">Inloggen op Leagl Actie App →</a></td></tr>
          </table>
          <p style="margin:0;font-size:14px;color:#141210;line-height:1.7;">Succes!</p>
        </td></tr>
        <tr><td style="background:#F0EDE8;padding:18px 40px;border-top:1px solid #E4E1DC;">
          <p style="margin:0;font-size:11px;color:#8A8480;">© ${new Date().getFullYear()} LEAGL — Dit is een automatisch gegenereerde e-mail.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': BREVO_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender: { name: 'LEAGL Actie App', email: SENDER },
      to: [{ email: to }],
      subject: `Welkom bij de ${tenantName} Actie App, ${displayName}!`,
      htmlContent: html,
    }),
  });
  if (!res.ok) throw new Error(`Brevo fout ${res.status}`);
}

const C = {
  accent: '#C8A96E', blue: '#4263EB', bg: '#F7F5F2',
  surface: '#FFFFFF', surface2: '#F0EDE8', border: '#E4E1DC',
  text: '#141210', muted: '#8A8480', success: '#2D9E5A', danger: '#E5383B',
};

const inputStyle = {
  width: '100%', background: C.surface2, border: `1.5px solid ${C.border}`,
  borderRadius: 8, padding: '10px 12px', fontSize: 13, color: C.text,
  outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
};

function SALogin({ onAuth }) {
  const [secret, setSecret] = useState('');
  const [show, setShow]     = useState(false);
  const [error, setError]   = useState('');

  function handle(e) {
    e.preventDefault();
    if (secret === (import.meta.env.VITE_SUPERADMIN_SECRET || '')) {
      sessionStorage.setItem('superadmin_auth', '1');
      onAuth();
    } else {
      setError('Onjuist superadmin wachtwoord.');
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0C0D10' }}>
      <div style={{ background: C.surface, borderRadius: 16, padding: '44px', width: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: C.accent, letterSpacing: '0.12em', marginBottom: 4 }}>LEAGL</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 6 }}>Super Admin</div>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 28 }}>Tenant-beheer voor Frederiek.</div>
        <form onSubmit={handle}>
          <div style={{ position: 'relative', marginBottom: 20 }}>
            <input
              type={show ? 'text' : 'password'}
              value={secret}
              onChange={e => setSecret(e.target.value)}
              placeholder="Superadmin wachtwoord"
              autoFocus
              style={{ ...inputStyle, padding: '12px 44px 12px 14px' }}
            />
            <button type="button" onClick={() => setShow(s => !s)}
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: C.muted, cursor: 'pointer', padding: 0, display: 'flex' }}>
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {error && (
            <div style={{ fontSize: 13, color: C.danger, marginBottom: 16, background: C.danger + '10', border: `1px solid ${C.danger}30`, borderRadius: 8, padding: '9px 14px' }}>
              {error}
            </div>
          )}
          <button type="submit"
            style={{ width: '100%', background: C.blue, color: '#fff', border: 'none', borderRadius: 10, padding: '13px', fontSize: 14, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 8px rgba(66,99,235,0.28)' }}>
            <ShieldCheck size={15} style={{ marginRight: 8, verticalAlign: 'middle' }} />
            Toegang
          </button>
        </form>
      </div>
    </div>
  );
}

const NAV = [
  { id: 'tenants', label: 'Tenants',    icon: <Building2 size={15} /> },
  { id: 'users',   label: 'Gebruikers', icon: <Users size={15} /> },
];

export default function SuperAdminDashboard() {
  const [authed, setAuthed]             = useState(!!sessionStorage.getItem('superadmin_auth'));
  const [activeNav, setActiveNav]       = useState('tenants');
  const [tenants, setTenants]           = useState([]);
  const [loading, setLoading]           = useState(false);
  const [toast, setToast]               = useState(null);

  // Tenant create form
  const [tName, setTName]     = useState('');
  const [tSlug, setTSlug]     = useState('');
  const [tColor, setTColor]   = useState('#C8A96E');
  const [tLogo, setTLogo]     = useState('');
  const [tCreating, setTCreating] = useState(false);

  // Users tab
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [tenantUsers, setTenantUsers]           = useState([]);
  const [usersLoading, setUsersLoading]         = useState(false);
  const [addEmail, setAddEmail]                 = useState('');
  const [addRole, setAddRole]                   = useState('member');
  const [adding, setAdding]                     = useState(false);

  // New user creation
  const [newName, setNewName]       = useState('');
  const [newEmail, setNewEmail]     = useState('');
  const [newRole, setNewRole]       = useState('member');
  const [creating, setCreating]     = useState(false);

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  const loadTenants = useCallback(async () => {
    setLoading(true);
    const { data } = await adminSupabase.from('tenants').select('*').order('name');
    setTenants(data || []);
    setLoading(false);
  }, []);

  const loadTenantUsers = useCallback(async (tenantId) => {
    if (!tenantId) return;
    setUsersLoading(true);
    const { data } = await adminSupabase
      .from('tenant_users')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('user_email');
    setTenantUsers(data || []);
    setUsersLoading(false);
  }, []);

  useEffect(() => { if (authed) loadTenants(); }, [authed]);
  useEffect(() => { if (selectedTenantId) loadTenantUsers(selectedTenantId); else setTenantUsers([]); }, [selectedTenantId]);

  async function createTenant(e) {
    e.preventDefault();
    if (!tName.trim() || !tSlug.trim()) return;
    setTCreating(true);
    const { error } = await adminSupabase.from('tenants').insert([{
      name: tName.trim(),
      slug: tSlug.trim().toLowerCase().replace(/\s+/g, '-'),
      primary_color: tColor,
      logo_url: tLogo.trim() || null,
    }]);
    if (error) {
      showToast(error.message, 'error');
    } else {
      showToast(`Tenant "${tName}" aangemaakt`);
      setTName(''); setTSlug(''); setTColor('#C8A96E'); setTLogo('');
      await loadTenants();
    }
    setTCreating(false);
  }

  async function deleteTenant(id, name) {
    if (!window.confirm(`Tenant "${name}" verwijderen?\n\nAlle tenant_users koppelingen worden ook verwijderd.`)) return;
    const { error } = await adminSupabase.from('tenants').delete().eq('id', id);
    if (error) { showToast(error.message, 'error'); return; }
    showToast(`Tenant "${name}" verwijderd`);
    setTenants(prev => prev.filter(t => t.id !== id));
  }

  async function addUser(e) {
    e.preventDefault();
    if (!addEmail.trim() || !selectedTenantId) return;
    setAdding(true);
    try {
      const { data: usersData } = await adminSupabase.auth.admin.listUsers({ perPage: 1000 });
      const user = (usersData?.users || []).find(u => u.email?.toLowerCase() === addEmail.trim().toLowerCase());
      if (!user) throw new Error(`Geen gebruiker gevonden: ${addEmail}`);
      const { error } = await adminSupabase.from('tenant_users').insert([{
        tenant_id: selectedTenantId,
        user_id: user.id,
        user_email: user.email,
        role: addRole,
      }]);
      if (error) throw error;
      showToast(`${user.email} toegevoegd`);
      setAddEmail('');
      await loadTenantUsers(selectedTenantId);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setAdding(false);
    }
  }

  async function removeUser(tu) {
    if (!window.confirm(`${tu.user_email} verwijderen uit deze tenant?`)) return;
    const { error } = await adminSupabase.from('tenant_users').delete().eq('id', tu.id);
    if (error) { showToast(error.message, 'error'); return; }
    showToast(`${tu.user_email} verwijderd`);
    setTenantUsers(prev => prev.filter(u => u.id !== tu.id));
  }

  async function createAndAddUser(e) {
    e.preventDefault();
    if (!newEmail.trim() || !selectedTenantId) return;
    setCreating(true);
    try {
      const tempPw = genTempPassword();
      const { data: created, error } = await adminSupabase.auth.admin.createUser({
        email: newEmail.trim(),
        password: tempPw,
        email_confirm: true,
        user_metadata: { must_change_password: true },
      });
      if (error) throw error;
      await adminSupabase.from('tenant_users').insert([{
        tenant_id: selectedTenantId,
        user_id: created.user.id,
        user_email: newEmail.trim(),
        role: newRole,
      }]);
      sendWelcomeEmail({ to: newEmail.trim(), tempPassword: tempPw, name: newName.trim(), role: newRole, tenantName: tenants.find(t => t.id === selectedTenantId)?.name || 'LEAGL' })
        .then(() => showToast(`Welkomstmail verstuurd naar ${newEmail.trim()}`))
        .catch(e => showToast(`Account aangemaakt maar mail mislukt: ${e.message}`, 'error'));
      setNewName(''); setNewEmail(''); setNewRole('member');
      await loadTenantUsers(selectedTenantId);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setCreating(false);
    }
  }

  if (!authed) return <SALogin onAuth={() => setAuthed(true)} />;

  return (
    <div style={{ display: 'flex', height: '100vh', background: C.bg, overflow: 'hidden', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* Sidebar */}
      <div style={{ width: 220, background: '#0C0D10', borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.accent, letterSpacing: '0.12em' }}>LEAGL</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 4 }}>Super Admin</div>
        </div>
        <nav style={{ flex: 1, padding: '10px' }}>
          {NAV.map(n => {
            const isActive = activeNav === n.id;
            return (
              <div key={n.id} onClick={() => setActiveNav(n.id)}
                style={{ padding: '9px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, borderRadius: 8, marginBottom: 2, background: isActive ? 'rgba(255,255,255,0.09)' : 'transparent', color: isActive ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.40)', fontSize: 13.5, fontWeight: isActive ? 600 : 400, transition: 'all 140ms', position: 'relative', userSelect: 'none' }}
                onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.68)'; } }}
                onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.40)'; } }}
              >
                {isActive && <span style={{ position: 'absolute', left: 0, top: '22%', bottom: '22%', width: 3, background: C.accent, borderRadius: '0 3px 3px 0' }} />}
                <span style={{ marginLeft: isActive ? 4 : 0 }}>{n.icon}</span>
                {n.label}
              </div>
            );
          })}
        </nav>
        <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <a href="/admin" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'rgba(255,255,255,0.32)', textDecoration: 'none', transition: 'color 140ms' }}
            onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.65)'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.32)'}
          >
            <LogOut size={13} /> Admin panel
          </a>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Topbar */}
        <div style={{ height: 56, background: C.surface, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', flexShrink: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{NAV.find(n => n.id === activeNav)?.label}</div>
          <button onClick={loadTenants} disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: 7, background: C.surface2, border: `1px solid ${C.border}`, color: C.muted, borderRadius: 8, padding: '7px 14px', fontSize: 12, cursor: 'pointer' }}>
            <RefreshCw size={13} style={{ animation: loading ? 'spin 0.8s linear infinite' : 'none' }} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>

          {/* ── TENANTS TAB ── */}
          {activeNav === 'tenants' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 16 }}>Nieuwe tenant aanmaken</div>
                <form onSubmit={createTenant} style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 80px 2fr auto', gap: 10, alignItems: 'end' }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Naam</div>
                    <input value={tName} onChange={e => { setTName(e.target.value); if (!tSlug) setTSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-')); }}
                      placeholder="Mijn Bedrijf" required style={inputStyle} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Slug (uniek)</div>
                    <input value={tSlug} onChange={e => setTSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                      placeholder="mijn-bedrijf" required style={inputStyle} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Kleur</div>
                    <input type="color" value={tColor} onChange={e => setTColor(e.target.value)}
                      style={{ ...inputStyle, padding: 4, height: 41, cursor: 'pointer' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Logo URL (optioneel)</div>
                    <input value={tLogo} onChange={e => setTLogo(e.target.value)} placeholder="https://..." style={inputStyle} />
                  </div>
                  <button type="submit" disabled={tCreating}
                    style={{ display: 'flex', alignItems: 'center', gap: 7, background: tCreating ? C.muted : C.blue, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 13, fontWeight: 600, cursor: tCreating ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}>
                    <Plus size={14} /> {tCreating ? 'Aanmaken...' : 'Aanmaken'}
                  </button>
                </form>
              </div>

              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr>
                      {['Naam', 'Slug', 'Accent kleur', 'Aangemaakt', ''].map(h => (
                        <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', background: C.surface2, borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tenants.map(t => (
                      <tr key={t.id} style={{ borderBottom: `1px solid ${C.border}` }}
                        onMouseEnter={e => e.currentTarget.style.background = C.surface2}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '10px 16px', fontWeight: 600, color: C.text }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {t.logo_url && <img src={t.logo_url} alt={t.name} style={{ height: 24, objectFit: 'contain' }} />}
                            {t.name}
                          </div>
                        </td>
                        <td style={{ padding: '10px 16px', color: C.muted, fontFamily: 'monospace', fontSize: 12 }}>{t.slug}</td>
                        <td style={{ padding: '10px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 20, height: 20, borderRadius: 5, background: t.primary_color, border: `1px solid ${C.border}`, flexShrink: 0 }} />
                            <span style={{ fontSize: 11, color: C.muted, fontFamily: 'monospace' }}>{t.primary_color}</span>
                          </div>
                        </td>
                        <td style={{ padding: '10px 16px', color: C.muted, fontSize: 12 }}>
                          {new Date(t.created_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          <button onClick={() => deleteTenant(t.id, t.name)}
                            style={{ background: C.danger + '10', border: `1px solid ${C.danger}30`, color: C.danger, borderRadius: 6, padding: '5px 8px', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Trash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {tenants.length === 0 && !loading && (
                  <div style={{ padding: '40px', textAlign: 'center', color: C.muted, fontSize: 13 }}>Nog geen tenants aangemaakt</div>
                )}
              </div>
            </div>
          )}

          {/* ── USERS TAB ── */}
          {activeNav === 'users' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Selecteer tenant</div>
                <select value={selectedTenantId} onChange={e => setSelectedTenantId(e.target.value)}
                  style={{ ...inputStyle, maxWidth: 340 }}>
                  <option value="">— Kies een tenant —</option>
                  {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>

              {selectedTenantId && (
                <>
                  {/* Nieuwe gebruiker aanmaken + koppelen */}
                  <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 4 }}>Nieuwe gebruiker aanmaken</div>
                    <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>Account aanmaken, koppelen aan deze tenant en welkomstmail sturen — alles in één stap.</div>
                    <form onSubmit={createAndAddUser} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 140px auto', gap: 10, alignItems: 'flex-end' }}>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Naam</div>
                        <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Jan Janssen" style={inputStyle} />
                      </div>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>E-mailadres</div>
                        <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="collega@bedrijf.be" required style={inputStyle} />
                      </div>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Rol</div>
                        <select value={newRole} onChange={e => setNewRole(e.target.value)} style={inputStyle}>
                          <option value="member">Member</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                      <button type="submit" disabled={creating}
                        style={{ display: 'flex', alignItems: 'center', gap: 7, background: creating ? C.muted : C.success, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 13, fontWeight: 600, cursor: creating ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}>
                        <UserPlus size={14} /> {creating ? 'Aanmaken...' : 'Aanmaken + uitnodigen'}
                      </button>
                    </form>
                  </div>

                  {/* Bestaande gebruiker koppelen */}
                  <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 4 }}>Bestaande gebruiker toevoegen aan tenant</div>
                    <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>De gebruiker moet al bestaan in Supabase Auth.</div>
                    <form onSubmit={addUser} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                      <div style={{ flex: 1, minWidth: 220 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>E-mailadres</div>
                        <input type="email" value={addEmail} onChange={e => setAddEmail(e.target.value)}
                          placeholder="gebruiker@bedrijf.be" required style={inputStyle} />
                      </div>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Rol</div>
                        <select value={addRole} onChange={e => setAddRole(e.target.value)}
                          style={{ ...inputStyle, width: 140 }}>
                          <option value="member">Member</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                      <button type="submit" disabled={adding}
                        style={{ display: 'flex', alignItems: 'center', gap: 7, background: adding ? C.muted : C.blue, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 13, fontWeight: 600, cursor: adding ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}>
                        <Plus size={14} /> {adding ? 'Toevoegen...' : 'Toevoegen'}
                      </button>
                    </form>
                  </div>

                  <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr>
                          {['E-mail', 'Rol', 'Toegevoegd', ''].map(h => (
                            <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', background: C.surface2, borderBottom: `1px solid ${C.border}` }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {tenantUsers.map(tu => (
                          <tr key={tu.id} style={{ borderBottom: `1px solid ${C.border}` }}
                            onMouseEnter={e => e.currentTarget.style.background = C.surface2}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <td style={{ padding: '10px 16px', fontWeight: 500, color: C.text }}>{tu.user_email}</td>
                            <td style={{ padding: '10px 16px' }}>
                              <span style={{ fontSize: 11, fontWeight: 600, background: tu.role === 'admin' ? C.blue + '12' : C.surface2, color: tu.role === 'admin' ? C.blue : C.muted, border: `1px solid ${tu.role === 'admin' ? C.blue + '30' : C.border}`, borderRadius: 6, padding: '2px 8px' }}>
                                {tu.role}
                              </span>
                            </td>
                            <td style={{ padding: '10px 16px', color: C.muted, fontSize: 12 }}>
                              {new Date(tu.created_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </td>
                            <td style={{ padding: '10px 16px' }}>
                              <button onClick={() => removeUser(tu)}
                                style={{ background: C.danger + '10', border: `1px solid ${C.danger}30`, color: C.danger, borderRadius: 6, padding: '5px 8px', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <X size={12} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {tenantUsers.length === 0 && !usersLoading && selectedTenantId && (
                      <div style={{ padding: '40px', textAlign: 'center', color: C.muted, fontSize: 13 }}>Geen gebruikers in deze tenant</div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, background: toast.type === 'error' ? C.danger : C.success, color: '#fff', borderRadius: 10, padding: '12px 20px', fontSize: 13, fontWeight: 600, boxShadow: '0 4px 16px rgba(0,0,0,0.18)', maxWidth: 380 }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
