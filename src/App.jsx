import React, { useState, useEffect, useCallback } from 'react';
import { Plus, LogOut, ClipboardList, Loader2, CheckSquare, ListTodo, LayoutDashboard, Users, Search, X } from 'lucide-react';
import { supabase, signOut } from './supabaseClient.js';
import { TenantProvider, useTenantContext } from './context/TenantContext.jsx';
import { useLanguage } from './context/LanguageContext.jsx';
import LoginPage from './components/LoginPage.jsx';
import ActionCard from './components/ActionCard.jsx';
import ActionTable from './components/ActionTable.jsx';
import ActionForm from './components/ActionForm.jsx';
import AdminPage from './components/AdminPage.jsx';
import TeamPage from './components/TeamPage.jsx';
import TenantPicker from './components/TenantPicker.jsx';

const BREVO_KEY = import.meta.env.VITE_BREVO_API_KEY;
const APP_URL   = import.meta.env.VITE_APP_URL || 'https://leagl-actionlist.up.railway.app';
const SENDER    = 'frederiek.deprest@gmail.com';

function buildIcs({ subject, dueDate, assignedByEmail }) {
  if (!dueDate) return null;
  // Format date as YYYYMMDD for an all-day event
  const dateStr = dueDate.replace(/-/g, '');
  // DTEND is the next day (exclusive end for all-day events)
  const endDate = new Date(dueDate);
  endDate.setDate(endDate.getDate() + 1);
  const endStr = endDate.toISOString().slice(0, 10).replace(/-/g, '');
  const uid = `${Date.now()}-${Math.random().toString(36).slice(2)}@leagl`;
  const now = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//LEAGL//Actie Platform//NL',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART;VALUE=DATE:${dateStr}`,
    `DTEND;VALUE=DATE:${endStr}`,
    `SUMMARY:Actie: ${subject}`,
    `DESCRIPTION:Toegewezen door ${assignedByEmail}\\nBekijk in Leagl: ${APP_URL}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  // btoa with Unicode support
  return btoa(unescape(encodeURIComponent(ics)));
}

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

  const icsBase64 = buildIcs({ subject, dueDate, assignedByEmail });
  const body = {
    sender: { name: 'LEAGL Actie App', email: SENDER },
    to: [{ email: to }],
    subject: `Nieuwe actie: ${subject}`,
    htmlContent: html,
  };
  if (icsBase64) {
    body.attachment = [{ content: icsBase64, name: 'actie.ics' }];
  }

  await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': BREVO_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const COLORS = {
  accent: '#C8A96E', blue: '#4263EB', bg: '#F7F5F2',
  surface: '#FFFFFF', surface2: '#F0EDE8', border: '#E4E1DC',
  text: '#141210', muted: '#8A8480', success: '#2D9E5A',
};

const NAV_IDS = ['admin', 'open', 'closed', 'team'];
const NAV_ICONS = {
  admin:  <LayoutDashboard size={16} />,
  open:   <ListTodo size={16} />,
  closed: <CheckSquare size={16} />,
  team:   <Users size={16} />,
};
const NAV_KEY = {
  admin:  'nav_dashboard',
  open:   'nav_active',
  closed: 'nav_completed',
  team:   'nav_team',
};

// ── AppShell uses TenantContext ────────────────────────────────────────────
function AppShell({ session, onSignOut }) {
  const { tenant, needsPicker, tenantError, tenantLoading } = useTenantContext();
  const { lang, setLang, t } = useLanguage();

  const [actions, setActions]       = useState([]);
  const [categories, setCategories] = useState([]);
  const [users, setUsers]           = useState([]);
  const [view, setView]             = useState('admin');
  const [filterSubject, setFilterSubject]   = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus]     = useState('');
  const [showForm, setShowForm]     = useState(false);
  const [editAction, setEditAction] = useState(null);
  const [isMobile, setIsMobile]     = useState(window.innerWidth < 768);
  const [toast, setToast]           = useState(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (tenant?.id) {
      loadActions();
      loadCategories();
      loadUsers();
    }
  }, [tenant?.id]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadActions = useCallback(async () => {
    if (!tenant?.id) return;
    const { data, error } = await supabase
      .from('actions')
      .select('*')
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false });
    if (error) return;
    const actions = data || [];
    // Herstel: afgeronde acties moeten altijd 100% zijn
    const toFix = actions.filter(a => a.status === 'Completed' && (a.percent_delivery || 0) < 100);
    if (toFix.length > 0) {
      await supabase.from('actions').update({ percent_delivery: 100 }).in('id', toFix.map(a => a.id));
      toFix.forEach(a => { a.percent_delivery = 100; });
    }
    setActions(actions);
  }, [tenant?.id]);

  const loadCategories = useCallback(async () => {
    if (!tenant?.id) return;
    // Laad zowel tenant-scoped als null-tenant categorieën (legacy data)
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .or(`tenant_id.eq.${tenant.id},tenant_id.is.null`)
      .order('name', { ascending: true });
    if (!error) setCategories(data || []);
  }, [tenant?.id]);

  const loadUsers = useCallback(async () => {
    if (!tenant?.id) return;
    try {
      const { data } = await supabase
        .from('tenant_users')
        .select('user_id, user_email')
        .eq('tenant_id', tenant.id);
      setUsers((data || []).map(u => ({ id: u.user_id, email: u.user_email })));
    } catch (e) {
      console.warn('Could not load users:', e.message);
    }
  }, [tenant?.id]);

  const writeLog = useCallback(async ({ actionId, actionSubject, changeType, oldValue, newValue }) => {
    if (!tenant?.id) return;
    try {
      await supabase.from('action_logs').insert([{
        action_id: actionId,
        action_subject: actionSubject,
        changed_by_email: session?.user?.email || 'onbekend',
        change_type: changeType,
        old_value: oldValue ?? null,
        new_value: newValue ?? null,
        tenant_id: tenant.id,
      }]);
    } catch (e) {
      console.warn('Log schrijven mislukt:', e.message);
    }
  }, [session, tenant?.id]);

  const handleCreateAction = async (formData) => {
    const payload = { ...formData, tenant_id: tenant.id };
    const { data, error } = await supabase.from('actions').insert([payload]).select().single();
    if (error) throw error;
    await loadActions();
    setShowForm(false);
    showToast(t('toast_created'));
    writeLog({ actionId: data?.id, actionSubject: formData.subject, changeType: 'aangemaakt', newValue: `Toegewezen aan: ${formData.assigned_to_email || '—'}` });
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
    if (newStatus === 'Completed') {
      updates.completed_at = new Date().toISOString();
      updates.percent_delivery = 100;
    } else {
      updates.completed_at = null;
    }
    const { error } = await supabase.from('actions').update(updates).eq('id', id);
    if (error) return;
    const action = actions.find(a => a.id === id);
    setActions(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
    writeLog({ actionId: id, actionSubject: action?.subject, changeType: 'status', oldValue: action?.status, newValue: newStatus });
  };

  const handleUpdateProgress = async (id, newProgress) => {
    const action = actions.find(a => a.id === id);
    const { error } = await supabase.from('actions').update({ percent_delivery: newProgress }).eq('id', id);
    if (error) return;
    setActions(prev => prev.map(a => a.id === id ? { ...a, percent_delivery: newProgress } : a));
    writeLog({ actionId: id, actionSubject: action?.subject, changeType: 'voortgang', oldValue: `${action?.percent_delivery ?? 0}%`, newValue: `${newProgress}%` });
  };

  const handleUpdateAction = async (formData, id) => {
    const old = actions.find(a => a.id === id);
    const updates = { ...formData };
    if (formData.status === 'Completed') updates.completed_at = new Date().toISOString();
    else updates.completed_at = null;
    if (formData.assigned_to_email && old?.needs_reassignment) {
      updates.needs_reassignment = false;
    }
    const { error } = await supabase.from('actions').update(updates).eq('id', id);
    if (error) throw error;
    setActions(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
    setEditAction(null);
    showToast(t('toast_updated'));
    const fields = [
      { key: 'subject',           label: 'onderwerp' },
      { key: 'status',            label: 'status' },
      { key: 'assigned_to_email', label: 'toegewezen aan' },
      { key: 'due_date',          label: 'deadline' },
      { key: 'category_id',       label: 'categorie' },
      { key: 'is_private',        label: 'privé' },
    ];
    fields.forEach(({ key, label }) => {
      const ov = String(old?.[key] ?? '');
      const nv = String(formData[key] ?? '');
      if (ov !== nv) writeLog({ actionId: id, actionSubject: formData.subject, changeType: label, oldValue: ov || '—', newValue: nv || '—' });
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('confirm_delete'))) return;
    const action = actions.find(a => a.id === id);
    const { error } = await supabase.from('actions').delete().eq('id', id);
    if (error) return;
    setActions(prev => prev.filter(a => a.id !== id));
    showToast(t('toast_deleted'), 'info');
    writeLog({ actionId: id, actionSubject: action?.subject, changeType: 'verwijderd', oldValue: action?.status });
  };

  // ── Loading / error / picker states ──
  if (tenantLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: COLORS.bg }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 36, height: 36, border: `3px solid ${COLORS.border}`, borderTopColor: COLORS.accent, borderRadius: '50%', margin: '0 auto 14px', animation: 'spin 0.8s linear infinite' }} />
          <div style={{ fontSize: 14, color: COLORS.muted }}>{t('loading_org')}</div>
        </div>
      </div>
    );
  }

  if (tenantError) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: COLORS.bg }}>
        <div style={{ maxWidth: 400, textAlign: 'center', padding: 24 }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.text, marginBottom: 8 }}>{t('no_access')}</div>
          <div style={{ fontSize: 13, color: COLORS.muted, marginBottom: 24, lineHeight: 1.6 }}>{tenantError}</div>
          <button onClick={onSignOut}
            style={{ background: COLORS.blue, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {t('nav_sign_out')}
          </button>
        </div>
      </div>
    );
  }

  if (needsPicker) return <TenantPicker />;

  const accentColor = tenant?.primary_color || COLORS.accent;
  const brandName   = tenant?.name || 'LEAGL';

  const handleSetView = (id) => {
    setView(id);
    setFilterSubject('');
    setFilterCategory('');
    setFilterStatus('');
  };

  // Bouw een volledige id→naam map (inclusief null-tenant legacy categorieën)
  const categoryNameById = {};
  categories.forEach(c => { categoryNameById[c.id] = c.name; });
  const selectedCategoryName = filterCategory ? categoryNameById[filterCategory] : null;

  const visibleActions = actions.filter(a => {
    const matchesView = view === 'open'
      ? (a.status === 'Open' || a.status === 'In Progress')
      : a.status === 'Completed';
    const matchesSubject  = !filterSubject  || a.subject.toLowerCase().includes(filterSubject.toLowerCase());
    // Vergelijk op naam zodat oude (null-tenant) en nieuwe (tenant-scoped) UUIDs beiden matchen
    const matchesCategory = !filterCategory || categoryNameById[a.category_id] === selectedCategoryName;
    const matchesStatus   = !filterStatus   || a.status === filterStatus;
    return matchesView && matchesSubject && matchesCategory && matchesStatus;
  });
  const openCount   = actions.filter(a => a.status === 'Open' || a.status === 'In Progress').length;
  const closedCount = actions.filter(a => a.status === 'Completed').length;
  const navItems = NAV_IDS.map(id => ({ id, label: t(NAV_KEY[id]), icon: NAV_ICONS[id] }));
  const currentNavItem = navItems.find(n => n.id === view);

  return (
    <div className="app-shell">

      {/* ── SIDEBAR ── */}
      <div className="app-sidebar">
        {/* Brand */}
        <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {tenant?.logo_url ? (
            <img src={tenant.logo_url} alt={brandName} style={{ height: 28, objectFit: 'contain', marginBottom: 4 }} />
          ) : (
            <div style={{ fontSize: 20, fontWeight: 800, color: accentColor, letterSpacing: '0.12em' }}>{brandName}</div>
          )}
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 4 }}>{t('nav_subtitle')}</div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '10px 10px', overflowY: 'auto' }}>
          {navItems.map(n => {
            const isActive = view === n.id;
            const count = n.id === 'open' ? openCount : n.id === 'closed' ? closedCount : null;
            return (
              <div key={n.id}
                onClick={() => handleSetView(n.id)}
                style={{ padding: '9px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, borderRadius: 8, marginBottom: 2, background: isActive ? 'rgba(255,255,255,0.09)' : 'transparent', color: isActive ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.40)', fontSize: 13.5, fontWeight: isActive ? 600 : 400, transition: 'background 140ms ease, color 140ms ease', position: 'relative', userSelect: 'none' }}
                onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.68)'; } }}
                onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.40)'; } }}
              >
                {isActive && <span style={{ position: 'absolute', left: 0, top: '22%', bottom: '22%', width: 3, background: accentColor, borderRadius: '0 3px 3px 0' }} />}
                <span style={{ fontSize: 14, opacity: isActive ? 1 : 0.75, marginLeft: isActive ? 4 : 0 }}>{n.icon}</span>
                <span style={{ flex: 1 }}>{n.label}</span>
                {count !== null && <span style={{ fontSize: 11, background: isActive ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)', color: isActive ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.25)', borderRadius: 10, padding: '1px 7px', fontWeight: 600 }}>{count}</span>}
              </div>
            );
          })}

          <div style={{ margin: '14px 0', height: 1, background: 'rgba(255,255,255,0.06)' }} />
          <button
            onClick={() => setShowForm(true)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: accentColor + '18', border: `1px solid ${accentColor}33`, borderRadius: 8, color: accentColor, fontSize: 13.5, fontWeight: 600, cursor: 'pointer', transition: 'background 140ms ease' }}
            onMouseEnter={e => e.currentTarget.style.background = accentColor + '28'}
            onMouseLeave={e => e.currentTarget.style.background = accentColor + '18'}
          >
            <Plus size={16} />
            {t('nav_new_action')}
          </button>

          <a href="/voice" style={{ marginTop: 8, width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.25)', borderRadius: 8, color: 'rgba(196,168,255,0.85)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', textDecoration: 'none', boxSizing: 'border-box' }}>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
            Spraakassistent
          </a>
        </nav>

        {/* Footer */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {/* Language switcher */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
            {['nl', 'fr', 'en'].map(l => (
              <button key={l} onClick={() => setLang(l)}
                style={{ flex: 1, padding: '4px 0', fontSize: 11, fontWeight: lang === l ? 700 : 400, background: lang === l ? 'rgba(255,255,255,0.12)' : 'transparent', color: lang === l ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.30)', border: `1px solid ${lang === l ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 6, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.06em', transition: 'all 140ms ease' }}>
                {l}
              </button>
            ))}
          </div>
          {session?.user?.email && (
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={session.user.email}>
              {session.user.email}
            </div>
          )}
          <button
            onClick={onSignOut}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'rgba(255,255,255,0.32)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', transition: 'color 140ms ease' }}
            onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.65)'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.32)'}
          >
            <LogOut size={13} />
            {t('nav_sign_out')}
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
            {view !== 'admin' && view !== 'team' && (
              <span style={{ fontSize: 12, color: COLORS.muted, background: COLORS.surface2, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: '1px 9px', fontWeight: 500 }}>
                {visibleActions.length}
              </span>
            )}
          </div>
          {view !== 'admin' && view !== 'team' && (
            <button
              onClick={() => setShowForm(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 7, background: COLORS.blue, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 8px rgba(66,99,235,0.28)', transition: 'background 140ms ease' }}
              onMouseEnter={e => e.currentTarget.style.background = '#3451D1'}
              onMouseLeave={e => e.currentTarget.style.background = COLORS.blue}
            >
              <Plus size={15} />
              {t('nav_new_action')}
            </button>
          )}
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '16px 12px' : '24px 28px' }}>
          {view === 'admin' && <AdminPage session={session} />}
          {view === 'team'  && <TeamPage />}

          {/* Filter bar */}
          {view !== 'admin' && view !== 'team' && (
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Onderwerp zoeken */}
              <div style={{ position: 'relative', flex: '1 1 180px', minWidth: 140 }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: COLORS.muted, pointerEvents: 'none' }} />
                <input
                  type="text"
                  placeholder={t('search_placeholder')}
                  value={filterSubject}
                  onChange={e => setFilterSubject(e.target.value)}
                  style={{ width: '100%', paddingLeft: 32, paddingRight: filterSubject ? 28 : 10, paddingTop: 7, paddingBottom: 7, background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 8, fontSize: 13, color: COLORS.text, outline: 'none', boxSizing: 'border-box' }}
                />
                {filterSubject && (
                  <button onClick={() => setFilterSubject('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: COLORS.muted, cursor: 'pointer', padding: 0, display: 'flex' }}>
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Categorie */}
              <select
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
                style={{ flex: '1 1 140px', minWidth: 120, padding: '7px 10px', background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 8, fontSize: 13, color: filterCategory ? COLORS.text : COLORS.muted, outline: 'none', cursor: 'pointer' }}
              >
                <option value="">{t('all_categories')}</option>
                {/* Dedupliceer op naam — toon elke categorienaam maar één keer */}
                {categories
                  .filter((c, idx, arr) => arr.findIndex(x => x.name === c.name) === idx)
                  .map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>

              {/* Status (alleen actieve view) */}
              {view === 'open' && (
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  style={{ flex: '1 1 130px', minWidth: 110, padding: '7px 10px', background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 8, fontSize: 13, color: filterStatus ? COLORS.text : COLORS.muted, outline: 'none', cursor: 'pointer' }}
                >
                  <option value="">{t('all_statuses')}</option>
                  <option value="Open">{t('status_open')}</option>
                  <option value="In Progress">{t('status_in_progress')}</option>
                </select>
              )}

              {/* Reset */}
              {(filterSubject || filterCategory || filterStatus) && (
                <button
                  onClick={() => { setFilterSubject(''); setFilterCategory(''); setFilterStatus(''); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', background: COLORS.surface2, border: `1px solid ${COLORS.border}`, borderRadius: 8, fontSize: 12, color: COLORS.muted, cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  <X size={13} /> {t('reset_filters')}
                </button>
              )}
            </div>
          )}

          {view !== 'admin' && view !== 'team' && visibleActions.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', textAlign: 'center' }} className="fade-in">
              <ClipboardList size={56} style={{ color: COLORS.border, marginBottom: 20 }} />
              {(filterSubject || filterCategory || filterStatus) ? (
                <>
                  <div style={{ fontSize: 18, fontWeight: 600, color: COLORS.text, marginBottom: 6 }}>{t('no_results')}</div>
                  <div style={{ fontSize: 14, color: COLORS.muted, marginBottom: 16 }}>{t('no_results_sub')}</div>
                  <button onClick={() => { setFilterSubject(''); setFilterCategory(''); setFilterStatus(''); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: COLORS.blue, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    <X size={14} /> {t('reset_filters')}
                  </button>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 18, fontWeight: 600, color: COLORS.text, marginBottom: 6 }}>
                    {view === 'open' ? t('no_active') : t('no_completed')}
                  </div>
                  <div style={{ fontSize: 14, color: COLORS.muted }}>
                    {view === 'open' ? t('no_active_sub') : t('no_completed_sub')}
                  </div>
                </>
              )}
            </div>
          )}

          {view !== 'admin' && view !== 'team' && visibleActions.length > 0 && (
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
                      onEdit={setEditAction}
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
                  onEdit={setEditAction}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── MODALS ── */}
      {showForm && (
        <ActionForm
          categories={categories}
          users={users}
          onSave={handleCreateAction}
          onCancel={() => setShowForm(false)}
          session={session}
          onCategoryCreated={loadCategories}
          tenantId={tenant?.id}
        />
      )}
      {editAction && (
        <ActionForm
          categories={categories}
          users={users}
          onSave={handleUpdateAction}
          onCancel={() => setEditAction(null)}
          session={session}
          onCategoryCreated={loadCategories}
          editAction={editAction}
          tenantId={tenant?.id}
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

// ── App: manages session, wraps AppShell in TenantProvider ─────────────────
export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

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

  const handleSignOut = async () => {
    await signOut();
    setSession(null);
  };

  if (!session && !loading) return <LoginPage />;

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#F7F5F2' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 36, height: 36, border: '3px solid #E4E1DC', borderTopColor: '#C8A96E', borderRadius: '50%', margin: '0 auto 14px', animation: 'spin 0.8s linear infinite' }} />
          <div style={{ fontSize: 14, color: '#8A8480' }}>{/* loading text shown before language context is ready */}Laden...</div>
        </div>
      </div>
    );
  }

  return (
    <TenantProvider session={session}>
      <AppShell session={session} onSignOut={handleSignOut} />
    </TenantProvider>
  );
}
