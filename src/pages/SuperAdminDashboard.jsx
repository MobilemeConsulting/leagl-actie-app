import React, { useState, useEffect, useCallback } from 'react';
import { adminSupabase } from '../adminSupabaseClient.js';
import { Plus, Trash2, Eye, EyeOff, LogOut, ShieldCheck, RefreshCw, Building2, Users, X } from 'lucide-react';

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
                  <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 4 }}>Gebruiker toevoegen aan tenant</div>
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
