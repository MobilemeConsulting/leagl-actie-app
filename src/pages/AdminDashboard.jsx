import React, { useState, useEffect, useCallback } from 'react';
import { adminSupabase } from '../adminSupabaseClient.js';
import {
  Users, ClipboardList, CheckCircle2, Clock, Circle,
  Plus, Trash2, Ban, RefreshCw, Download, Mail,
  LayoutDashboard, LogOut, ScrollText,
} from 'lucide-react';
import { supabase } from '../supabaseClient.js';

const BREVO_KEY  = import.meta.env.VITE_BREVO_API_KEY;
const APP_URL    = import.meta.env.VITE_APP_URL || 'https://prolific-achievement-production.up.railway.app';
const SENDER     = 'frederiek.deprest@gmail.com'; // vervang door je Brevo-verified sender

// Genereer een veilig tijdelijk wachtwoord (12 tekens, geen verwarrende chars)
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
              <tr>
                <td style="padding-bottom:12px;vertical-align:top;width:22px;padding-top:1px;"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#C8A96E;margin-top:5px;"></span></td>
                <td style="padding-bottom:12px;font-size:13px;color:#141210;line-height:1.6;"><strong>Acties inzien:</strong> Je vindt je acties direct in de app of in je vertrouwde Outlook/Microsoft To Do lijst.</td>
              </tr>
              <tr>
                <td style="padding-bottom:12px;vertical-align:top;padding-top:1px;"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#C8A96E;margin-top:5px;"></span></td>
                <td style="padding-bottom:12px;font-size:13px;color:#141210;line-height:1.6;"><strong>Updates geven:</strong> Pas eenvoudig het groeipercentage aan zodat iedereen weet hoever je bent.</td>
              </tr>
              <tr>
                <td style="vertical-align:top;padding-top:1px;"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#C8A96E;margin-top:5px;"></span></td>
                <td style="font-size:13px;color:#141210;line-height:1.6;"><strong>Snel afvinken:</strong> Klaar? Eén klik op 'Afvinken' en de actie verdwijnt naar de historie.</td>
              </tr>
            </table>
          </div>

          ${adminBlock}

          <div style="background:#FFFFFF;border:1px solid #E4E1DC;border-radius:8px;padding:20px 24px;margin-bottom:20px;">
            <div style="font-size:12px;font-weight:700;color:#8A8480;text-transform:uppercase;letter-spacing:1px;margin-bottom:14px;">Uw inloggegevens</div>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="font-size:13px;color:#8A8480;padding-bottom:8px;width:140px;">E-mailadres</td>
                <td style="font-size:13px;font-weight:600;color:#141210;padding-bottom:8px;">${to}</td>
              </tr>
              <tr>
                <td style="font-size:13px;color:#8A8480;">Tijdelijk wachtwoord</td>
                <td><span style="font-size:17px;font-weight:800;color:#4263EB;letter-spacing:2px;font-family:monospace;">${tempPassword}</span></td>
              </tr>
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
            <tr><td style="background:#4263EB;border-radius:8px;">
              <a href="${APP_URL}" style="display:block;padding:13px 28px;font-size:14px;font-weight:700;color:#FFFFFF;text-decoration:none;">Inloggen op Leagl Actie App →</a>
            </td></tr>
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
  accent:   '#C8A96E',
  blue:     '#4263EB',
  bg:       '#F7F5F2',
  surface:  '#FFFFFF',
  surface2: '#F0EDE8',
  border:   '#E4E1DC',
  text:     '#141210',
  textSec:  '#5A5856',
  muted:    '#8A8480',
  success:  '#2D9E5A',
  warning:  '#D97706',
  danger:   '#E5383B',
  purple:   '#7C3AED',
};

const NAV = [
  { id: 'dashboard', label: 'Dashboard',       icon: <LayoutDashboard size={15} /> },
  { id: 'users',     label: 'Gebruikers',       icon: <Users size={15} /> },
  { id: 'actions',   label: 'Alle Acties',      icon: <ClipboardList size={15} /> },
  { id: 'logs',      label: 'Audit Log',        icon: <ScrollText size={15} /> },
];

function StatCard({ icon, label, value, color }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 24, fontWeight: 800, color: C.text, letterSpacing: '-0.02em' }}>{value}</div>
        <div style={{ fontSize: 11, color: C.muted, fontWeight: 500 }}>{label}</div>
      </div>
    </div>
  );
}

function BarChart({ data, colorFn }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 130, fontSize: 12, color: C.textSec, textAlign: 'right', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={d.label}>{d.label}</div>
          <div style={{ flex: 1, height: 22, background: C.surface2, borderRadius: 5, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(d.value / max) * 100}%`, background: colorFn ? colorFn(i) : C.blue, borderRadius: 5, transition: 'width 600ms ease', minWidth: d.value > 0 ? 6 : 0 }} />
          </div>
          <div style={{ width: 24, fontSize: 12, fontWeight: 700, color: C.text, textAlign: 'right', flexShrink: 0 }}>{d.value}</div>
        </div>
      ))}
    </div>
  );
}


// ── Scoped tenant picker (only tenants the user belongs to) ─────────────
function AdminTenantPicker({ tenants, onPick }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0C0D10' }}>
      <div style={{ background: C.surface, borderRadius: 16, padding: '44px 44px 40px', width: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: C.accent, letterSpacing: '0.12em', marginBottom: 4 }}>LEAGL</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 6 }}>Kies jouw organisatie</div>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 28 }}>Je hebt toegang tot meerdere organisaties.</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {tenants.map(t => (
            <button key={t.id} onClick={() => onPick(t.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 14, background: C.surface2, border: `1.5px solid ${C.border}`, borderRadius: 12, padding: '14px 18px', cursor: 'pointer', textAlign: 'left', transition: 'border-color 140ms' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = t.primary_color || C.accent}
              onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
            >
              {t.logo_url
                ? <img src={t.logo_url} alt={t.name} style={{ height: 28, width: 28, objectFit: 'contain', flexShrink: 0 }} />
                : <div style={{ width: 28, height: 28, borderRadius: 6, background: (t.primary_color || C.accent) + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: t.primary_color || C.accent, flexShrink: 0 }}>{t.name[0]}</div>
              }
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{t.name}</div>
                <div style={{ fontSize: 11, color: C.muted }}>{t.slug}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main admin dashboard ───────────────────────────────────────────────
export default function AdminDashboard() {
  const [selectedTenantId, setSelectedTenantId] = useState('');
  // null = loading, [] = not logged in or no admin role
  const [userTenants, setUserTenants]     = useState(null);
  const [activeNav, setActiveNav]         = useState('dashboard');
  const [users, setUsers]                 = useState([]);
  const [actions, setActions]             = useState([]);
  const [categories, setCategories]       = useState([]);
  const [loading, setLoading]             = useState(false);
  const [toast, setToast]                 = useState(null);
  const [tenantsList, setTenantsList]     = useState([]); // for name/color lookup
  const [adminEmail, setAdminEmail]       = useState('');

  // Create user form
  const [newEmail, setNewEmail]   = useState('');
  const [newName, setNewName]     = useState('');
  const [newPw, setNewPw]         = useState('');
  const [creating, setCreating]   = useState(false);

  // Actions filter
  const [actionFilter, setActionFilter] = useState('all');
  const [actionSearch, setActionSearch] = useState('');

  // Logs
  const [logs, setLogs]             = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logFilter, setLogFilter]    = useState('all'); // 'all' | 'actions' | 'users'

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  // Resolve admin tenants from Supabase session on mount
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { setUserTenants([]); return; }
      setAdminEmail(session.user.email || '');
      const { data: memberships } = await adminSupabase
        .from('tenant_users')
        .select('tenant_id, role, tenants(id, slug, name, logo_url, primary_color)')
        .eq('user_id', session.user.id)
        .eq('role', 'admin');
      const tenants = (memberships || []).map(m => m.tenants).filter(Boolean);
      setUserTenants(tenants);
      if (tenants.length === 1) setSelectedTenantId(tenants[0].id);
    });
  }, []);

  const loadData = useCallback(async () => {
    if (!selectedTenantId) return;
    setLoading(true);
    const { data: tenantsData } = await adminSupabase.from('tenants').select('*').order('name');
    setTenantsList(tenantsData || []);

    const [{ data: tenantUsersData }, { data: allAuthData }, { data: actsData }, { data: catsData }] = await Promise.all([
      adminSupabase.from('tenant_users').select('user_id, user_email, role').eq('tenant_id', selectedTenantId),
      adminSupabase.auth.admin.listUsers(),
      adminSupabase.from('actions').select('*').order('created_at', { ascending: false }).eq('tenant_id', selectedTenantId),
      adminSupabase.from('categories').select('*').eq('tenant_id', selectedTenantId),
    ]);
    const tenantUserIds = new Set((tenantUsersData || []).map(u => u.user_id));
    setUsers((allAuthData?.users || []).filter(u => tenantUserIds.has(u.id)));
    setActions(actsData || []);
    setCategories(catsData || []);
    setLoading(false);
  }, [selectedTenantId]);

  const loadLogs = useCallback(async () => {
    if (!selectedTenantId) return;
    setLogsLoading(true);
    const { data } = await supabase.from('action_logs').select('*').order('created_at', { ascending: false }).limit(200).eq('tenant_id', selectedTenantId);
    setLogs(data || []);
    setLogsLoading(false);
  }, [selectedTenantId]);

  useEffect(() => { if (selectedTenantId) { loadData(); loadLogs(); } }, [selectedTenantId]);

  const writeUserLog = useCallback(async ({ changeType, targetEmail, oldValue, newValue }) => {
    if (!selectedTenantId) return;
    try {
      await adminSupabase.from('action_logs').insert([{
        action_id: null,
        action_subject: targetEmail,
        changed_by_email: adminEmail || 'admin',
        change_type: changeType,
        old_value: oldValue ?? null,
        new_value: newValue ?? null,
        tenant_id: selectedTenantId,
      }]);
    } catch (e) {
      console.warn('User log mislukt:', e.message);
    }
  }, [selectedTenantId, adminEmail]);

  async function createUser(e) {
    e.preventDefault();
    if (!newEmail.trim() || !selectedTenantId) return;
    setCreating(true);
    try {
      // Genereer automatisch een tijdelijk wachtwoord als het veld leeg is
      const tempPw = newPw.trim() || genTempPassword();

      const { data: created, error } = await adminSupabase.auth.admin.createUser({
        email: newEmail.trim(),
        password: tempPw,
        email_confirm: true,
        user_metadata: { must_change_password: true },
      });
      if (error) throw error;

      // Always link to current tenant
      if (created?.user?.id) {
        await adminSupabase.from('tenant_users').insert([{
          tenant_id: selectedTenantId,
          user_id: created.user.id,
          user_email: newEmail.trim(),
          role: 'member',
        }]);
      }

      // Stuur welkomstmail met tijdelijk wachtwoord (non-blocking)
      sendWelcomeEmail({ to: newEmail.trim(), tempPassword: tempPw, name: newName.trim(), role: 'member', tenantName: activeTenant?.name || 'LEAGL' })
        .then(async () => {
          showToast(`Welkomstmail verstuurd naar ${newEmail.trim()}`);
          await writeUserLog({ changeType: 'uitnodiging verstuurd', targetEmail: newEmail.trim(), newValue: newName.trim() || null });
          await loadLogs();
        })
        .catch(e => showToast(`Gebruiker aangemaakt maar mail mislukt: ${e.message}`, 'error'));

      setNewEmail(''); setNewName(''); setNewPw('');
      await loadData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setCreating(false);
    }
  }

  async function deleteUser(userId, email) {
    if (!window.confirm(`Gebruiker "${email}" definitief verwijderen?\n\nOpen acties van deze persoon worden gemarkeerd als "Eigenaar ontbreekt".`)) return;
    const { error } = await adminSupabase.auth.admin.deleteUser(userId);
    if (error) { showToast(error.message, 'error'); return; }
    // Flag open actions assigned to this user
    await adminSupabase.from('actions')
      .update({ needs_reassignment: true })
      .eq('assigned_to_email', email)
      .neq('status', 'Completed')
      .eq('tenant_id', selectedTenantId);
    showToast(`Gebruiker ${email} verwijderd — open acties gemarkeerd`);
    setUsers(prev => prev.filter(u => u.id !== userId));
    await writeUserLog({ changeType: 'gebruiker verwijderd', targetEmail: email });
    await Promise.all([loadData(), loadLogs()]);
  }

  async function toggleBan(user) {
    const isBanned = !!user.banned_until;
    const { error } = await adminSupabase.auth.admin.updateUserById(user.id, {
      ban_duration: isBanned ? 'none' : '87600h', // 10 years = effectively permanent
    });
    if (error) { showToast(error.message, 'error'); return; }
    const label = isBanned ? 'gebruiker geactiveerd' : 'gebruiker gedeactiveerd';
    showToast(isBanned ? `${user.email} geactiveerd` : `${user.email} gedeactiveerd`);
    await writeUserLog({ changeType: label, targetEmail: user.email });
    await Promise.all([loadData(), loadLogs()]);
  }

  async function resetPassword(userId, email) {
    const newPass = Math.random().toString(36).slice(-10) + 'A1!';
    const { error } = await adminSupabase.auth.admin.updateUserById(userId, { password: newPass });
    if (error) { showToast(error.message, 'error'); return; }
    showToast(`Nieuw tijdelijk wachtwoord: ${newPass}`, 'info');
  }

  function exportCSV() {
    const rows = actions.map(a => ({
      id: a.id, subject: a.subject,
      category: categories.find(c => c.id === a.category_id)?.name || '',
      status: a.status, progress: a.percent_delivery,
      due_date: a.due_date || '', assigned: a.assigned_to_email || '',
      created: a.created_at, completed: a.completed_at || '',
    }));
    const keys = ['id','subject','category','status','progress','due_date','assigned','created','completed'];
    const escape = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [keys.map(escape).join(','), ...rows.map(r => keys.map(k => escape(r[k])).join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `leagl-acties-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  // Loading session
  if (userTenants === null) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0C0D10' }}>
      <div style={{ width: 36, height: 36, border: '3px solid rgba(255,255,255,0.1)', borderTopColor: C.accent, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

  // Not logged in, or no admin role on any tenant
  if (userTenants.length === 0) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0C0D10' }}>
      <div style={{ background: C.surface, borderRadius: 16, padding: '44px', width: 420, textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: C.accent, letterSpacing: '0.12em', marginBottom: 16 }}>LEAGL</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 10 }}>Geen toegang</div>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 24 }}>Je hebt geen beheerdersrol. Log in met een account dat admin-rechten heeft, of vraag je beheerder om toegang.</div>
        <a href="/" style={{ display: 'inline-block', background: C.blue, color: '#fff', textDecoration: 'none', borderRadius: 8, padding: '10px 22px', fontSize: 13, fontWeight: 600 }}>Naar inlogpagina →</a>
      </div>
    </div>
  );

  // Multiple admin tenants → scoped picker
  if (!selectedTenantId) return <AdminTenantPicker tenants={userTenants} onPick={id => setSelectedTenantId(id)} />;

  // Stats
  const total      = actions.length;
  const open       = actions.filter(a => a.status === 'Open').length;
  const inProgress = actions.filter(a => a.status === 'In Progress').length;
  const completed  = actions.filter(a => a.status === 'Completed').length;
  const avgProg    = total > 0 ? Math.round(actions.reduce((s,a) => s + (a.percent_delivery||0), 0) / total) : 0;

  const byCat = categories.map(cat => ({
    label: cat.name,
    value: actions.filter(a => a.category_id === cat.id).length,
  })).filter(d => d.value > 0).sort((a,b) => b.value - a.value);

  const byUser = Object.entries(
    actions.reduce((acc, a) => {
      const k = a.assigned_to_email || 'Niet toegewezen';
      acc[k] = (acc[k] || 0) + 1; return acc;
    }, {})
  ).map(([label, value]) => ({ label, value })).sort((a,b) => b.value - a.value);

  const catColors = ['#4263EB','#C8A96E','#2D9E5A','#7C3AED','#D97706','#E5383B','#0EA5E9'];

  // Filtered actions
  const filteredActions = actions.filter(a => {
    const matchStatus = actionFilter === 'all' || a.status === actionFilter;
    const q = actionSearch.toLowerCase();
    const matchSearch = !q || a.subject?.toLowerCase().includes(q) || a.assigned_to_email?.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const formatDate = d => d ? new Date(d).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
  const timeAgo = iso => {
    const diff = (Date.now() - new Date(iso)) / 1000;
    if (diff < 3600)  return `${Math.round(diff/60)}m geleden`;
    if (diff < 86400) return `${Math.round(diff/3600)}u geleden`;
    return `${Math.round(diff/86400)}d geleden`;
  };

  const STATUS_C = { 'Open': C.blue, 'In Progress': C.warning, 'Completed': C.success };

  const activeTenant  = tenantsList.find(t => t.id === selectedTenantId) || null;
  const brandName     = activeTenant?.name || 'LEAGL';
  const accentColor   = activeTenant?.primary_color || C.accent;

  return (
    <div style={{ display: 'flex', height: '100vh', background: C.bg, overflow: 'hidden', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* ── Sidebar ── */}
      <div style={{ width: 220, background: '#0C0D10', borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: accentColor, letterSpacing: '0.12em' }}>{brandName}</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 4 }}>Admin Panel</div>
        </div>
        <nav style={{ flex: 1, padding: '10px 10px' }}>
          {NAV.map(n => {
            const isActive = activeNav === n.id;
            return (
              <div key={n.id} onClick={() => setActiveNav(n.id)}
                style={{ padding: '9px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, borderRadius: 8, marginBottom: 2, background: isActive ? 'rgba(255,255,255,0.09)' : 'transparent', color: isActive ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.40)', fontSize: 13.5, fontWeight: isActive ? 600 : 400, transition: 'all 140ms ease', position: 'relative', userSelect: 'none' }}
                onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.68)'; }}}
                onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.40)'; }}}
              >
                {isActive && <span style={{ position: 'absolute', left: 0, top: '22%', bottom: '22%', width: 3, background: accentColor, borderRadius: '0 3px 3px 0' }} />}
                <span style={{ marginLeft: isActive ? 4 : 0 }}>{n.icon}</span>
                {n.label}
              </div>
            );
          })}
        </nav>
        <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {userTenants?.length > 1 && (
            <button onClick={() => setSelectedTenantId('')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'rgba(255,255,255,0.32)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, transition: 'color 140ms' }}
              onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.65)'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.32)'}
            >
              <RefreshCw size={13} /> Wissel organisatie
            </button>
          )}
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'rgba(255,255,255,0.32)', textDecoration: 'none', transition: 'color 140ms' }}
            onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.65)'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.32)'}
          >
            <LogOut size={13} /> Terug naar app
          </a>
        </div>
      </div>

      {/* ── Main ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Topbar */}
        <div style={{ height: 56, background: C.surface, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{NAV.find(n => n.id === activeNav)?.label}</div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {activeNav === 'actions' && (
              <button onClick={exportCSV}
                style={{ display: 'flex', alignItems: 'center', gap: 7, background: C.surface2, border: `1px solid ${C.border}`, color: C.text, borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                <Download size={13} /> CSV Export
              </button>
            )}
            <button onClick={loadData} disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: 7, background: C.surface2, border: `1px solid ${C.border}`, color: C.muted, borderRadius: 8, padding: '7px 14px', fontSize: 12, cursor: 'pointer' }}>
              <RefreshCw size={13} style={{ animation: loading ? 'spin 0.8s linear infinite' : 'none' }} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>

          {/* ── DASHBOARD ── */}
          {activeNav === 'dashboard' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12 }}>
                <StatCard icon={<ClipboardList size={18} />} label="Totaal acties"      value={total}        color={C.blue} />
                <StatCard icon={<Circle size={18} />}        label="Open"               value={open}         color={C.blue} />
                <StatCard icon={<Clock size={18} />}         label="In behandeling"     value={inProgress}   color={C.warning} />
                <StatCard icon={<CheckCircle2 size={18} />}  label="Afgerond"           value={completed}    color={C.success} />
                <StatCard icon={<RefreshCw size={18} />}     label="Gem. voortgang"     value={`${avgProg}%`} color={C.accent} />
                <StatCard icon={<Users size={18} />}         label="Gebruikers"         value={users.length} color={C.purple} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '20px 22px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 16 }}>Per categorie</div>
                  {byCat.length > 0 ? <BarChart data={byCat} colorFn={i => catColors[i % catColors.length]} /> : <div style={{ color: C.muted, fontSize: 13, textAlign: 'center', padding: '20px 0' }}>Geen data</div>}
                </div>
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '20px 22px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 16 }}>Per persoon</div>
                  {byUser.length > 0 ? <BarChart data={byUser} colorFn={() => C.blue} /> : <div style={{ color: C.muted, fontSize: 13, textAlign: 'center', padding: '20px 0' }}>Geen data</div>}
                </div>
              </div>

              {total > 0 && (
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '20px 22px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 14 }}>Status verdeling</div>
                  <div style={{ display: 'flex', height: 26, borderRadius: 7, overflow: 'hidden', gap: 2 }}>
                    {open > 0       && <div style={{ flex: open,       background: C.blue,    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff', fontWeight: 700 }}>{Math.round(open/total*100)}%</div>}
                    {inProgress > 0 && <div style={{ flex: inProgress, background: C.warning, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff', fontWeight: 700 }}>{Math.round(inProgress/total*100)}%</div>}
                    {completed > 0  && <div style={{ flex: completed,  background: C.success, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff', fontWeight: 700 }}>{Math.round(completed/total*100)}%</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 20, marginTop: 10 }}>
                    {[['Open', C.blue, open], ['In behandeling', C.warning, inProgress], ['Afgerond', C.success, completed]].map(([label, color, val]) => (
                      <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: C.muted }}>
                        <div style={{ width: 9, height: 9, borderRadius: 3, background: color }} /> {label} ({val})
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── USERS ── */}
          {activeNav === 'users' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Create user */}
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 4 }}>Nieuwe gebruiker aanmaken</div>
                <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>De gebruiker ontvangt automatisch een welkomstmail met tijdelijk wachtwoord. Bij eerste login wordt gevraagd een persoonlijk wachtwoord in te stellen.</div>
                <form onSubmit={createUser} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 10, alignItems: 'end' }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Naam</div>
                    <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Jan Janssen"
                      style={{ width: '100%', background: C.surface2, border: `1.5px solid ${C.border}`, borderRadius: 8, padding: '10px 12px', fontSize: 13, color: C.text, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>E-mailadres</div>
                    <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="collega@bedrijf.be" required
                      style={{ width: '100%', background: C.surface2, border: `1.5px solid ${C.border}`, borderRadius: 8, padding: '10px 12px', fontSize: 13, color: C.text, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Tijdelijk wachtwoord <span style={{ color: C.muted, fontWeight: 400, textTransform: 'none' }}>(leeg = auto)</span></div>
                    <input type="text" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Automatisch gegenereerd"
                      style={{ width: '100%', background: C.surface2, border: `1.5px solid ${C.border}`, borderRadius: 8, padding: '10px 12px', fontSize: 13, color: C.text, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
                  </div>
                  <button type="submit" disabled={creating}
                    style={{ display: 'flex', alignItems: 'center', gap: 7, background: creating ? C.muted : C.blue, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 13, fontWeight: 600, cursor: creating ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', boxShadow: creating ? 'none' : '0 2px 8px rgba(66,99,235,0.24)' }}>
                    <Plus size={14} /> {creating ? 'Aanmaken...' : 'Aanmaken'}
                  </button>
                </form>
              </div>

              {/* Users table */}
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr>
                        {['E-mail', 'Provider', 'Aangemaakt', 'Laatste login', 'Onboarding', 'Status', 'Acties'].map(h => (
                          <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', background: C.surface2, borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(user => {
                        const isBanned = !!user.banned_until;
                        const provider = user.app_metadata?.provider || 'email';
                        return (
                          <tr key={user.id} style={{ borderBottom: `1px solid ${C.border}` }}
                            onMouseEnter={e => e.currentTarget.style.background = C.surface2}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <td style={{ padding: '10px 16px', color: C.text, fontWeight: 500 }}>{user.email}</td>
                            <td style={{ padding: '10px 16px' }}>
                              <span style={{ fontSize: 11, background: C.accent + '18', color: C.accent, border: `1px solid ${C.accent}33`, borderRadius: 6, padding: '2px 8px', fontWeight: 600 }}>
                                {provider}
                              </span>
                            </td>
                            <td style={{ padding: '10px 16px', color: C.muted, fontSize: 12 }}>{formatDate(user.created_at)}</td>
                            <td style={{ padding: '10px 16px', color: C.muted, fontSize: 12 }}>{user.last_sign_in_at ? timeAgo(user.last_sign_in_at) : '—'}</td>
                            <td style={{ padding: '10px 16px' }}>
                              {user.last_sign_in_at ? (
                                <span style={{ fontSize: 11, fontWeight: 700, background: C.success + '12', color: C.success, border: `1px solid ${C.success}30`, borderRadius: 6, padding: '2px 8px' }}>
                                  Ingelogd
                                </span>
                              ) : (
                                <span style={{ fontSize: 11, fontWeight: 700, background: C.warning + '12', color: C.warning, border: `1px solid ${C.warning}30`, borderRadius: 6, padding: '2px 8px' }}>
                                  Nog niet ingelogd
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '10px 16px' }}>
                              <span style={{ fontSize: 11, fontWeight: 700, background: isBanned ? C.danger + '12' : C.success + '12', color: isBanned ? C.danger : C.success, border: `1px solid ${isBanned ? C.danger + '30' : C.success + '30'}`, borderRadius: 6, padding: '2px 8px' }}>
                                {isBanned ? 'Inactief' : 'Actief'}
                              </span>
                            </td>
                            <td style={{ padding: '10px 16px' }}>
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button onClick={() => toggleBan(user)} title={isBanned ? 'Activeren' : 'Deactiveren'}
                                  style={{ background: isBanned ? C.success + '12' : C.warning + '12', border: `1px solid ${isBanned ? C.success + '30' : C.warning + '30'}`, color: isBanned ? C.success : C.warning, borderRadius: 6, padding: '5px 8px', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <Ban size={12} /> {isBanned ? 'Activeer' : 'Deactiveer'}
                                </button>
                                {provider === 'email' && (
                                  <button onClick={() => resetPassword(user.id, user.email)} title="Reset wachtwoord"
                                    style={{ background: C.blue + '12', border: `1px solid ${C.blue}30`, color: C.blue, borderRadius: 6, padding: '5px 8px', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <RefreshCw size={12} /> Reset PW
                                  </button>
                                )}
                                <button onClick={() => deleteUser(user.id, user.email)} title="Verwijderen"
                                  style={{ background: C.danger + '10', border: `1px solid ${C.danger}30`, color: C.danger, borderRadius: 6, padding: '5px 8px', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {users.length === 0 && !loading && (
                    <div style={{ padding: '40px', textAlign: 'center', color: C.muted, fontSize: 13 }}>Geen gebruikers gevonden</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── ALL ACTIONS ── */}
          {activeNav === 'actions' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Filters */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <input value={actionSearch} onChange={e => setActionSearch(e.target.value)} placeholder="Zoeken op onderwerp of persoon..."
                  style={{ flex: 1, minWidth: 200, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '9px 14px', fontSize: 13, color: C.text, outline: 'none', fontFamily: 'inherit' }} />
                {['all', 'Open', 'In Progress', 'Completed'].map(s => (
                  <button key={s} onClick={() => setActionFilter(s)}
                    style={{ padding: '9px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `1px solid ${actionFilter === s ? C.blue : C.border}`, background: actionFilter === s ? C.blue : C.surface, color: actionFilter === s ? '#fff' : C.muted, transition: 'all 140ms' }}>
                    {s === 'all' ? 'Alle' : s === 'In Progress' ? 'In behandeling' : s}
                  </button>
                ))}
              </div>

              {/* Table */}
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr>
                        {['#', 'Onderwerp', 'Categorie', 'Status', '% Status', 'Deadline', 'Toegewezen aan', 'Aangemaakt'].map(h => (
                          <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', background: C.surface2, borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredActions.map((action, i) => {
                        const sc = STATUS_C[action.status] || C.muted;
                        return (
                          <tr key={action.id} style={{ borderBottom: `1px solid ${C.border}` }}
                            onMouseEnter={e => e.currentTarget.style.background = C.surface2}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <td style={{ padding: '9px 14px', color: C.muted, fontFamily: 'monospace', fontSize: 11 }}>{i + 1}</td>
                            <td style={{ padding: '9px 14px', maxWidth: 260 }}>
                              <span style={{ fontWeight: 500, color: C.text, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{action.subject}</span>
                            </td>
                            <td style={{ padding: '9px 14px', whiteSpace: 'nowrap' }}>
                              <span style={{ fontSize: 11, background: C.accent + '18', color: C.accent, border: `1px solid ${C.accent}33`, borderRadius: 5, padding: '2px 7px', fontWeight: 600 }}>
                                {categories.find(c => c.id === action.category_id)?.name || '—'}
                              </span>
                            </td>
                            <td style={{ padding: '9px 14px', whiteSpace: 'nowrap' }}>
                              <span style={{ fontSize: 11, fontWeight: 700, background: sc + '12', color: sc, border: `1px solid ${sc}30`, borderRadius: 5, padding: '2px 7px' }}>{action.status}</span>
                            </td>
                            <td style={{ padding: '9px 14px', whiteSpace: 'nowrap' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <div style={{ width: 48, height: 4, background: C.surface2, borderRadius: 99, overflow: 'hidden' }}>
                                  <div style={{ height: '100%', width: `${action.percent_delivery || 0}%`, background: C.blue, borderRadius: 99 }} />
                                </div>
                                <span style={{ fontSize: 11, color: C.muted }}>{action.percent_delivery || 0}%</span>
                              </div>
                            </td>
                            <td style={{ padding: '9px 14px', color: C.muted, fontSize: 12, whiteSpace: 'nowrap' }}>{formatDate(action.due_date)}</td>
                            <td style={{ padding: '9px 14px', color: C.textSec, fontSize: 12, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{action.assigned_to_email || '—'}</td>
                            <td style={{ padding: '9px 14px', color: C.muted, fontSize: 12, whiteSpace: 'nowrap' }}>{timeAgo(action.created_at)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {filteredActions.length === 0 && (
                    <div style={{ padding: '40px', textAlign: 'center', color: C.muted, fontSize: 13 }}>Geen acties gevonden</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Logs tab ── */}
          {activeNav === 'logs' && (() => {
            const USER_TYPES = ['uitnodiging verstuurd', 'gebruiker verwijderd', 'gebruiker gedeactiveerd', 'gebruiker geactiveerd'];
            const filteredLogs = logs.filter(log => {
              if (logFilter === 'actions') return !USER_TYPES.includes(log.change_type);
              if (logFilter === 'users')   return USER_TYPES.includes(log.change_type);
              return true;
            });
            const typeColors = {
              'status':                  C.blue,
              'voortgang':               C.accent,
              'aangemaakt':              C.success,
              'verwijderd':              C.danger,
              'toegewezen aan':          C.purple,
              'uitnodiging verstuurd':   '#0EA5E9',
              'gebruiker verwijderd':    C.danger,
              'gebruiker gedeactiveerd': C.warning,
              'gebruiker geactiveerd':   C.success,
            };
            return (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: C.text, letterSpacing: '-0.01em' }}>Activiteitenlog</div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Acties, uitnodigingen en gebruikersbeheer — wie, wat en wanneer</div>
                  </div>
                  <button onClick={loadLogs} disabled={logsLoading}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 600, color: C.muted, cursor: 'pointer' }}>
                    <RefreshCw size={13} style={{ animation: logsLoading ? 'spin 0.8s linear infinite' : 'none' }} /> Vernieuwen
                  </button>
                </div>

                {/* Filter tabs */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                  {[
                    { id: 'all',     label: 'Alle activiteit',           count: logs.length },
                    { id: 'actions', label: 'Actie wijzigingen',         count: logs.filter(l => !USER_TYPES.includes(l.change_type)).length },
                    { id: 'users',   label: 'Gebruikers & Uitnodigingen', count: logs.filter(l => USER_TYPES.includes(l.change_type)).length },
                  ].map(tab => (
                    <button key={tab.id} onClick={() => setLogFilter(tab.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `1px solid ${logFilter === tab.id ? C.blue : C.border}`, background: logFilter === tab.id ? C.blue : C.surface, color: logFilter === tab.id ? '#fff' : C.muted, transition: 'all 140ms' }}>
                      {tab.label}
                      <span style={{ fontSize: 11, background: logFilter === tab.id ? 'rgba(255,255,255,0.2)' : C.surface2, borderRadius: 10, padding: '0 6px' }}>{tab.count}</span>
                    </button>
                  ))}
                </div>

                {logsLoading ? (
                  <div style={{ textAlign: 'center', padding: '60px 0' }}>
                    <div style={{ width: 28, height: 28, border: `3px solid ${C.border}`, borderTopColor: C.accent, borderRadius: '50%', margin: '0 auto', animation: 'spin 0.8s linear infinite' }} />
                  </div>
                ) : filteredLogs.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 0', color: C.muted, fontSize: 13 }}>
                    {logs.length === 0 ? 'Nog geen activiteit. Maak een actie aan of nodig een gebruiker uit.' : 'Geen resultaten voor dit filter.'}
                  </div>
                ) : (
                  <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                          <tr>
                            {['Tijdstip', 'Door', 'Type', 'Onderwerp / Gebruiker', 'Detail', 'Status'].map(h => (
                              <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', background: C.surface2, borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {filteredLogs.map((log, i) => {
                            const isUserEvent = USER_TYPES.includes(log.change_type);
                            const isInvite    = log.change_type === 'uitnodiging verstuurd';
                            const typeColor   = typeColors[log.change_type] || C.muted;

                            // For invite rows: derive onboarding status from users list
                            let onboardStatus = null;
                            if (isInvite) {
                              const invitedUser = users.find(u => u.email === log.action_subject);
                              if (invitedUser) {
                                onboardStatus = invitedUser.last_sign_in_at ? 'onboarded' : 'pending';
                              } else {
                                onboardStatus = 'pending';
                              }
                            }

                            // For action logs: show old→new value
                            const detailText = isUserEvent
                              ? (log.new_value || log.old_value || '—')
                              : (log.old_value && log.new_value ? `${log.old_value} → ${log.new_value}` : (log.new_value || log.old_value || '—'));

                            return (
                              <tr key={log.id} style={{ background: i % 2 === 0 ? C.surface : C.surface2, borderBottom: `1px solid ${C.border}` }}>
                                <td style={{ padding: '10px 16px', whiteSpace: 'nowrap', color: C.muted, fontSize: 12 }}>
                                  {new Date(log.created_at).toLocaleString('nl-BE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </td>
                                <td style={{ padding: '10px 16px', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: C.textSec, fontSize: 12 }} title={log.changed_by_email}>
                                  {log.changed_by_email}
                                </td>
                                <td style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}>
                                  <span style={{ fontSize: 11, fontWeight: 700, background: typeColor + '14', color: typeColor, border: `1px solid ${typeColor}30`, borderRadius: 5, padding: '2px 8px', textTransform: 'capitalize' }}>
                                    {log.change_type}
                                  </span>
                                </td>
                                <td style={{ padding: '10px 16px', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500, color: isUserEvent ? '#0EA5E9' : C.text }} title={log.action_subject}>
                                  {log.action_subject || '—'}
                                </td>
                                <td style={{ padding: '10px 16px', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: C.muted, fontSize: 12 }} title={detailText}>
                                  {detailText}
                                </td>
                                <td style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}>
                                  {isInvite && onboardStatus === 'onboarded' && (
                                    <span style={{ fontSize: 11, fontWeight: 700, background: C.success + '12', color: C.success, border: `1px solid ${C.success}30`, borderRadius: 5, padding: '2px 8px' }}>
                                      Onboarded
                                    </span>
                                  )}
                                  {isInvite && onboardStatus === 'pending' && (
                                    <span style={{ fontSize: 11, fontWeight: 700, background: C.warning + '12', color: C.warning, border: `1px solid ${C.warning}30`, borderRadius: 5, padding: '2px 8px' }}>
                                      Nog niet ingelogd
                                    </span>
                                  )}
                                  {!isInvite && <span style={{ color: C.border, fontSize: 12 }}>—</span>}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, background: toast.type === 'error' ? C.danger : toast.type === 'info' ? C.blue : C.success, color: '#fff', borderRadius: 10, padding: '12px 20px', fontSize: 13, fontWeight: 600, boxShadow: '0 4px 16px rgba(0,0,0,0.18)', maxWidth: 380 }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
