import React, { useState, useEffect, useCallback } from 'react';
import { Plus, LogOut, ClipboardList, Loader2, CheckSquare, ListTodo, LayoutDashboard } from 'lucide-react';
import { supabase, signOut } from './supabaseClient.js';
import { adminSupabase } from './adminSupabaseClient.js';
import LoginPage from './components/LoginPage.jsx';
import ActionCard from './components/ActionCard.jsx';
import ActionTable from './components/ActionTable.jsx';
import ActionForm from './components/ActionForm.jsx';
import AdminPage from './components/AdminPage.jsx';

const BREVO_KEY = import.meta.env.VITE_BREVO_API_KEY;
const APP_URL   = 'https://prolific-achievement-production.up.railway.app';
const SENDER    = 'frederiek.deprest@gmail.com';

async function sendAssignmentEmail({ to, subject, dueDate, assignedByEmail }) {
  if (!to || !BREVO_KEY) return;
  const dueLine = dueDate
    ? `<tr><td style="font-size:13px;color:#8A8480;padding-bottom:8px;width:110px;">Deadline</td><td style="font-size:13px;font-weight:600;color:#141210;">${new Date(dueDate).toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' })}</td></tr>`
    : '';
  const html = `<!DOCTYPE html>
<html lang="nl"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#F7F5F2;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F5F2;padding:40px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr><td style="background:#0C0D10;padding:24px 40px;">
          <div style="font-size:22px;font-weight:800;color:#C8A96E;letter-spacing:3px;">LEAGL</div>
          <div style="font-size:10px;color:rgba(255,255,255,0.4);letter-spacing:3px;text-transform:uppercase;margin-top:4px;">Actie Platform</div>
        </td></tr>
        <tr><td style="padding:36px 40px;">
          <h1 style="margin:0 0 6px;font-size:18px;font-weight:700;color:#141210;">Nieuwe actie toegewezen aan jou</h1>
          <p style="margin:0 0 24px;font-size:13px;color:#8A8480;">Toegewezen door <strong>${assignedByEmail}</strong></p>
          <div style="background:#F0EDE8;border:1px solid #E4E1DC;border-radius:8px;padding:20px;margin-bottom:24px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="font-size:13px;color:#8A8480;padding-bottom:8px;width:110px;">Actie</td>
                <td style="font-size:13px;font-weight:600;color:#141210;padding-bottom:8px;">${subject}</td>
              </tr>
              ${dueLine}
            </table>
          </div>
          <table cellpadding="0" cellspacing="0">
            <tr><td style="background:#4263EB;border-radius:8px;">
              <a href="${APP_URL}" style="display:block;padding:12px 26px;font-size:14px;font-weight:700;color:#FFFFFF;text-decoration:none;">Bekijk in Leagl →</a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="background:#F0EDE8;padding:16px 40px;border-top:1px solid #E4E1DC;">
          <p style="margin:0;font-size:11px;color:#8A8480;">© ${new Date().getFullYear()} LEAGL — Automatische notificatie</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': BREVO_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender: { name: 'LEAGL Actie App', email: SENDER },
      to: [{ email: to }],
      subject: `Nieuwe actie: ${subject}`,
      htmlContent: html,
    }),
  });
}

const COLORS = {
  accent: '#C8A96E',
  blue: '#4263EB',
  bg: '#F7F5F2',
  surface: '#FFFFFF',
  surface2: '#F0EDE8',
  border: '#E4E1DC',
  text: '#141210',
  muted: '#8A8480',
  success: '#2D9E5A',
};

const NAV_ITEMS = [
  { id: 'open',   label: 'Actieve Acties',  icon: <ListTodo size={16} /> },
  { id: 'closed', label: 'Afgerond',         icon: <CheckSquare size={16} /> },
  { id: 'admin',  label: 'Stats',             icon: <LayoutDashboard size={16} /> },
];

export default function App() {
  const [session, setSession]       = useState(null);
  const [actions, setActions]       = useState([]);
  const [categories, setCategories] = useState([]);
  const [users, setUsers]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [view, setView]             = useState('open');
  const [showForm, setShowForm]     = useState(false);
  const [isMobile, setIsMobile]     = useState(window.innerWidth < 768);
  const [toast, setToast]           = useState(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      loadActions();
      loadCategories();
      loadUsers();
    }
  }, [session]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadActions = useCallback(async () => {
    const { data, error } = await supabase
      .from('actions')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error) setActions(data || []);
  }, []);

  const loadCategories = useCallback(async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true });
    if (!error) setCategories(data || []);
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      const { data } = await adminSupabase.auth.admin.listUsers({ perPage: 200 });
      setUsers((data?.users || []).filter(u => u.email).map(u => ({ id: u.id, email: u.email })));
    } catch (e) {
      console.warn('Could not load users:', e.message);
    }
  }, []);

  const handleCreateAction = async (formData) => {
    const { error } = await supabase.from('actions').insert([formData]);
    if (error) throw error;
    await loadActions();
    setShowForm(false);
    showToast('Actie aangemaakt');
    // Send assignment notification (non-blocking)
    if (formData.assigned_to_email) {
      sendAssignmentEmail({
        to: formData.assigned_to_email,
        subject: formData.subject,
        dueDate: formData.due_date,
        assignedByEmail: session?.user?.email || 'een collega',
      }).catch(e => console.warn('Assignment email failed:', e.message));
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    const updates = { status: newStatus };
    if (newStatus === 'Completed') updates.completed_at = new Date().toISOString();
    else updates.completed_at = null;

    const { error } = await supabase.from('actions').update(updates).eq('id', id);
    if (error) return;
    setActions(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  };

  const handleUpdateProgress = async (id, newProgress) => {
    const { error } = await supabase.from('actions').update({ percent_delivery: newProgress }).eq('id', id);
    if (error) return;
    setActions(prev => prev.map(a => a.id === id ? { ...a, percent_delivery: newProgress } : a));
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Weet je zeker dat je deze actie wilt verwijderen?')) return;
    const { error } = await supabase.from('actions').delete().eq('id', id);
    if (error) return;
    setActions(prev => prev.filter(a => a.id !== id));
    showToast('Actie verwijderd', 'info');
  };

  const handleSignOut = async () => {
    await signOut();
    setSession(null);
    setActions([]);
    setCategories([]);
  };

  if (!session && !loading) return <LoginPage />;

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: COLORS.bg }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 36, height: 36, border: `3px solid ${COLORS.border}`, borderTopColor: COLORS.accent, borderRadius: '50%', margin: '0 auto 14px', animation: 'spin 0.8s linear infinite' }} />
          <div style={{ fontSize: 14, color: COLORS.muted }}>Laden...</div>
        </div>
      </div>
    );
  }

  const visibleActions = actions.filter(a =>
    view === 'open' ? (a.status === 'Open' || a.status === 'In Progress') : a.status === 'Completed'
  );

  const openCount   = actions.filter(a => a.status === 'Open' || a.status === 'In Progress').length;
  const closedCount = actions.filter(a => a.status === 'Completed').length;

  const currentNavItem = NAV_ITEMS.find(n => n.id === view);

  return (
    <div className="app-shell">

      {/* ── SIDEBAR ── */}
      <div className="app-sidebar">
        {/* Brand */}
        <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: COLORS.accent, letterSpacing: '0.12em' }}>LEAGL</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 4 }}>Actie Platform</div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '10px 10px', overflowY: 'auto' }}>
          {NAV_ITEMS.map(n => {
            const isActive = view === n.id;
            const count = n.id === 'open' ? openCount : closedCount;
            return (
              <div key={n.id}
                onClick={() => setView(n.id)}
                style={{
                  padding: '9px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  borderRadius: 8,
                  marginBottom: 2,
                  background: isActive ? 'rgba(255,255,255,0.09)' : 'transparent',
                  color: isActive ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.40)',
                  fontSize: 13.5,
                  fontWeight: isActive ? 600 : 400,
                  transition: 'background 140ms ease, color 140ms ease',
                  position: 'relative',
                  userSelect: 'none',
                }}
                onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.68)'; } }}
                onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.40)'; } }}
              >
                {isActive && <span style={{ position: 'absolute', left: 0, top: '22%', bottom: '22%', width: 3, background: COLORS.accent, borderRadius: '0 3px 3px 0' }} />}
                <span style={{ fontSize: 14, opacity: isActive ? 1 : 0.75, marginLeft: isActive ? 4 : 0 }}>{n.icon}</span>
                <span style={{ flex: 1 }}>{n.label}</span>
                <span style={{ fontSize: 11, background: isActive ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)', color: isActive ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.25)', borderRadius: 10, padding: '1px 7px', fontWeight: 600 }}>{count}</span>
              </div>
            );
          })}

          {/* Divider + new action button */}
          <div style={{ margin: '14px 0', height: 1, background: 'rgba(255,255,255,0.06)' }} />
          <button
            onClick={() => setShowForm(true)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: COLORS.accent + '18', border: `1px solid ${COLORS.accent}33`, borderRadius: 8, color: COLORS.accent, fontSize: 13.5, fontWeight: 600, cursor: 'pointer', transition: 'background 140ms ease' }}
            onMouseEnter={e => e.currentTarget.style.background = COLORS.accent + '28'}
            onMouseLeave={e => e.currentTarget.style.background = COLORS.accent + '18'}
          >
            <Plus size={16} />
            Nieuwe Actie
          </button>
        </nav>

        {/* Footer */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {session?.user?.email && (
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={session.user.email}>
              {session.user.email}
            </div>
          )}
          <button
            onClick={handleSignOut}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'rgba(255,255,255,0.32)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', transition: 'color 140ms ease' }}
            onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.65)'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.32)'}
          >
            <LogOut size={13} />
            Uitloggen
          </button>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="app-content">
        {/* Topbar */}
        <div style={{ height: 56, background: COLORS.surface, borderBottom: `1px solid ${COLORS.border}`, boxShadow: '0 1px 0 rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: COLORS.muted }}>{currentNavItem?.icon}</span>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em', color: COLORS.text }}>{currentNavItem?.label}</div>
            {view !== 'admin' && (
              <span style={{ fontSize: 12, color: COLORS.muted, background: COLORS.surface2, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: '1px 9px', fontWeight: 500 }}>
                {visibleActions.length}
              </span>
            )}
          </div>
          {view !== 'admin' && (
            <button
              onClick={() => setShowForm(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 7, background: COLORS.blue, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 8px rgba(66,99,235,0.28)', transition: 'background 140ms ease' }}
              onMouseEnter={e => e.currentTarget.style.background = '#3451D1'}
              onMouseLeave={e => e.currentTarget.style.background = COLORS.blue}
            >
              <Plus size={15} />
              Nieuwe Actie
            </button>
          )}
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '16px 12px' : '24px 28px' }}>

          {/* Admin page */}
          {view === 'admin' && (
            <AdminPage session={session} />
          )}

          {/* Empty state */}
          {view !== 'admin' && visibleActions.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', textAlign: 'center' }} className="fade-in">
              <ClipboardList size={56} style={{ color: COLORS.border, marginBottom: 20 }} />
              <div style={{ fontSize: 18, fontWeight: 600, color: COLORS.text, marginBottom: 6 }}>
                {view === 'open' ? 'Geen actieve acties' : 'Geen afgeronde acties'}
              </div>
              <div style={{ fontSize: 14, color: COLORS.muted }}>
                {view === 'open' ? 'Klik op "Nieuwe Actie" om te beginnen.' : 'Afgeronde acties verschijnen hier.'}
              </div>
            </div>
          )}

          {/* Action list */}
          {view !== 'admin' && visibleActions.length > 0 && (
            <div className="fade-in">
              {isMobile ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {visibleActions.map(action => (
                    <ActionCard
                      key={action.id}
                      action={action}
                      categories={categories}
                      onStatusChange={handleUpdateStatus}
                      onProgressChange={handleUpdateProgress}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              ) : (
                <ActionTable
                  actions={visibleActions}
                  categories={categories}
                  onStatusChange={handleUpdateStatus}
                  onProgressChange={handleUpdateProgress}
                  onDelete={handleDelete}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── MODAL ── */}
      {showForm && (
        <ActionForm
          categories={categories}
          users={users}
          onSave={handleCreateAction}
          onCancel={() => setShowForm(false)}
          session={session}
          onCategoryCreated={loadCategories}
        />
      )}

      {/* ── TOAST ── */}
      {toast && (
        <div className="toast" style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          background: toast.type === 'info' ? COLORS.text : COLORS.success,
          color: '#fff', borderRadius: 10, padding: '12px 20px', fontSize: 13, fontWeight: 600,
          boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
        }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
