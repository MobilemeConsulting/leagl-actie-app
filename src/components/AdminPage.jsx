import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient.js';
import { Users, ClipboardList, CheckCircle2, Clock, Circle, RefreshCw } from 'lucide-react';
import { useTenantContext } from '../context/TenantContext.jsx';

// eslint-disable-next-line
async function _unused() {
  if (!BREVO_KEY) { console.warn('VITE_BREVO_API_KEY not set — email skipped'); return; }
  const displayName = name?.trim() || (to.split('@')[0].charAt(0).toUpperCase() + to.split('@')[0].slice(1));
  const html = `<!DOCTYPE html>
<html lang="nl"><head><meta charset="UTF-8"><title>Welkom bij LEAGL Actie App</title></head>
<body style="margin:0;padding:0;background:#F7F5F2;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F5F2;padding:40px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr><td style="background:#0C0D10;padding:28px 40px;">
          <div style="font-size:24px;font-weight:800;color:#C8A96E;letter-spacing:3px;">LEAGL</div>
          <div style="font-size:10px;color:rgba(255,255,255,0.4);letter-spacing:3px;text-transform:uppercase;margin-top:4px;">Actie Platform</div>
        </td></tr>
        <tr><td style="padding:40px;">
          <h1 style="margin:0 0 20px;font-size:20px;font-weight:700;color:#141210;">Welkom bij de Leagl Actie App!</h1>
          <p style="margin:0 0 16px;font-size:14px;color:#141210;line-height:1.7;">Beste ${displayName},</p>
          <p style="margin:0 0 24px;font-size:14px;color:#5A5856;line-height:1.7;">We gaan vanaf nu onze team-acties bijhouden in onze nieuwe app. Geen losse mailtjes of papieren lijstjes meer, maar alles op één centrale plek.</p>

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

          <div style="background:#FFFFFF;border:1px solid #E4E1DC;border-radius:8px;padding:20px 24px;margin-bottom:20px;">
            <div style="font-size:12px;font-weight:700;color:#8A8480;text-transform:uppercase;letter-spacing:1px;margin-bottom:14px;">Uw inloggegevens</div>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="font-size:13px;color:#8A8480;padding-bottom:8px;width:140px;">E-mailadres</td>
                <td style="font-size:13px;font-weight:600;color:#141210;padding-bottom:8px;">\${to}</td>
              </tr>
              <tr>
                <td style="font-size:13px;color:#8A8480;">Tijdelijk wachtwoord</td>
                <td><span style="font-size:17px;font-weight:800;color:#4263EB;letter-spacing:2px;font-family:monospace;">\${tempPassword}</span></td>
              </tr>
            </table>
          </div>

          <div style="background:#FEF3C7;border:1px solid #F59E0B;border-radius:6px;padding:12px 16px;margin-bottom:28px;">
            <p style="margin:0;font-size:13px;color:#92400E;line-height:1.5;">⚠ Bij uw eerste login wordt u gevraagd een nieuw persoonlijk wachtwoord in te stellen.</p>
          </div>

          <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
            <tr><td style="background:#4263EB;border-radius:8px;">
              <a href="\${APP_URL}" style="display:block;padding:13px 28px;font-size:14px;font-weight:700;color:#FFFFFF;text-decoration:none;">Inloggen op Leagl Actie App →</a>
            </td></tr>
          </table>

          <p style="margin:0;font-size:14px;color:#141210;line-height:1.7;">Succes!</p>
        </td></tr>
        <tr><td style="background:#F0EDE8;padding:18px 40px;border-top:1px solid #E4E1DC;">
          <p style="margin:0;font-size:11px;color:#8A8480;">© \${new Date().getFullYear()} LEAGL — Dit is een automatisch gegenereerde e-mail.</p>
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
      subject: `Welkom bij de Leagl Actie App, ${displayName}!`,
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
};

function StatCard({ icon, label, value, color }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 26, fontWeight: 800, color: C.text, letterSpacing: '-0.02em' }}>{value}</div>
        <div style={{ fontSize: 12, color: C.muted, fontWeight: 500 }}>{label}</div>
      </div>
    </div>
  );
}

function BarChart({ data, colorFn }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 140, fontSize: 12, color: C.textSec, fontWeight: 500, textAlign: 'right', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={d.label}>
            {d.label}
          </div>
          <div style={{ flex: 1, height: 24, background: C.surface2, borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(d.value / max) * 100}%`, background: colorFn ? colorFn(i) : C.blue, borderRadius: 6, transition: 'width 600ms ease', minWidth: d.value > 0 ? 8 : 0 }} />
          </div>
          <div style={{ width: 28, fontSize: 12, fontWeight: 700, color: C.text, textAlign: 'right', flexShrink: 0 }}>{d.value}</div>
        </div>
      ))}
    </div>
  );
}

export default function AdminPage({ session }) {
  const { tenant } = useTenantContext();
  const [actions, setActions]       = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    if (!tenant?.id) return;
    async function load() {
      const [{ data: acts }, { data: cats }] = await Promise.all([
        supabase.from('actions').select('*').eq('tenant_id', tenant.id),
        supabase.from('categories').select('*').eq('tenant_id', tenant.id),
      ]);
      setActions(acts || []);
      setCategories(cats || []);
      setLoading(false);
    }
    load();
  }, [tenant?.id]);

if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
        <div style={{ width: 32, height: 32, border: `3px solid ${C.border}`, borderTopColor: C.accent, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  // ── Stats calculations ──────────────────────────────────────────
  const total      = actions.length;
  const open       = actions.filter(a => a.status === 'Open').length;
  const inProgress = actions.filter(a => a.status === 'In Progress').length;
  const completed  = actions.filter(a => a.status === 'Completed').length;

  const avgProgress = total > 0
    ? Math.round(actions.reduce((s, a) => s + (a.percent_delivery || 0), 0) / total)
    : 0;

  // Per category
  const byCat = categories.map(cat => ({
    label: cat.name,
    value: actions.filter(a => a.category_id === cat.id).length,
  })).filter(d => d.value > 0).sort((a, b) => b.value - a.value);

  // Per assignee
  const assigneeMap = {};
  actions.forEach(a => {
    const key = a.assigned_to_email || 'Niet toegewezen';
    assigneeMap[key] = (assigneeMap[key] || 0) + 1;
  });
  const byAssignee = Object.entries(assigneeMap)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);

  // Unique team members (from assigned emails)
  const teamEmails = [...new Set(
    actions.map(a => a.assigned_to_email).filter(Boolean)
  )];

  const catColors = ['#4263EB','#C8A96E','#2D9E5A','#7C3AED','#D97706','#E5383B','#0EA5E9','#10B981'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* ── Stat cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
        <StatCard icon={<ClipboardList size={20} />} label="Totaal acties"      value={total}       color={C.blue} />
        <StatCard icon={<Circle size={20} />}        label="Open"               value={open}        color={C.blue} />
        <StatCard icon={<Clock size={20} />}         label="In behandeling"     value={inProgress}  color={C.warning} />
        <StatCard icon={<CheckCircle2 size={20} />}  label="Afgerond"           value={completed}   color={C.success} />
        <StatCard icon={<RefreshCw size={20} />}     label="Gem. voortgang"     value={`${avgProgress}%`} color={C.accent} />
        <StatCard icon={<Users size={20} />}         label="Teamleden actief"   value={teamEmails.length} color="#7C3AED" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* ── Per categorie ── */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 18, letterSpacing: '-0.01em' }}>Acties per categorie</div>
          {byCat.length > 0
            ? <BarChart data={byCat} colorFn={i => catColors[i % catColors.length]} />
            : <div style={{ fontSize: 13, color: C.muted, textAlign: 'center', padding: '20px 0' }}>Geen data</div>
          }
        </div>

        {/* ── Per persoon ── */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 18, letterSpacing: '-0.01em' }}>Acties per persoon</div>
          {byAssignee.length > 0
            ? <BarChart data={byAssignee} colorFn={() => '#4263EB'} />
            : <div style={{ fontSize: 13, color: C.muted, textAlign: 'center', padding: '20px 0' }}>Geen data</div>
          }
        </div>
      </div>

      {/* ── Status verdeling ── */}
      {total > 0 && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 16, letterSpacing: '-0.01em' }}>Status verdeling</div>
          <div style={{ display: 'flex', height: 28, borderRadius: 8, overflow: 'hidden', gap: 2 }}>
            {open > 0        && <div title={`Open: ${open}`}            style={{ flex: open,       background: C.blue,    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff', fontWeight: 700 }}>{Math.round(open/total*100)}%</div>}
            {inProgress > 0  && <div title={`In behandeling: ${inProgress}`} style={{ flex: inProgress, background: C.warning, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff', fontWeight: 700 }}>{Math.round(inProgress/total*100)}%</div>}
            {completed > 0   && <div title={`Afgerond: ${completed}`}   style={{ flex: completed,  background: C.success, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff', fontWeight: 700 }}>{Math.round(completed/total*100)}%</div>}
          </div>
          <div style={{ display: 'flex', gap: 20, marginTop: 10 }}>
            {[['Open', C.blue, open], ['In behandeling', C.warning, inProgress], ['Afgerond', C.success, completed]].map(([label, color, val]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.muted }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
                {label} ({val})
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
