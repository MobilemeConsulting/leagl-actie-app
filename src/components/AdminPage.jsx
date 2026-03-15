import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient.js';
import { Users, ClipboardList, CheckCircle2, Clock, Circle, Mail, Loader2, RefreshCw } from 'lucide-react';

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
  const [actions, setActions]       = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting]     = useState(false);
  const [inviteMsg, setInviteMsg]   = useState(null); // { type: 'success'|'error', text }

  useEffect(() => {
    async function load() {
      const [{ data: acts }, { data: cats }] = await Promise.all([
        supabase.from('actions').select('*'),
        supabase.from('categories').select('*'),
      ]);
      setActions(acts || []);
      setCategories(cats || []);
      setLoading(false);
    }
    load();
  }, []);

  async function handleInvite(e) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteMsg(null);
    try {
      // Send magic link — user clicks it and is instantly logged in
      const { error } = await supabase.auth.signInWithOtp({
        email: inviteEmail.trim(),
        options: { shouldCreateUser: true },
      });
      if (error) throw error;
      setInviteMsg({ type: 'success', text: `Uitnodiging verstuurd naar ${inviteEmail.trim()}` });
      setInviteEmail('');
    } catch (err) {
      setInviteMsg({ type: 'error', text: err.message });
    } finally {
      setInviting(false);
    }
  }

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

      {/* ── Gebruikersbeheer ── */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 4, letterSpacing: '-0.01em' }}>Gebruikersbeheer</div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 20 }}>Nodig teamleden uit — zij ontvangen een magic link om direct in te loggen.</div>

        {/* Invite form */}
        <form onSubmit={handleInvite} style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <input
            type="email"
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            placeholder="collega@bedrijf.be"
            style={{ flex: 1, background: C.surface2, border: `1.5px solid ${C.border}`, borderRadius: 8, padding: '10px 14px', fontSize: 13, color: C.text, outline: 'none', fontFamily: 'inherit' }}
          />
          <button type="submit" disabled={inviting || !inviteEmail.trim()}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: inviting ? C.muted : C.blue, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 13, fontWeight: 600, cursor: inviting ? 'not-allowed' : 'pointer', boxShadow: inviting ? 'none' : '0 2px 8px rgba(66,99,235,0.28)', whiteSpace: 'nowrap' }}>
            {inviting ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Mail size={14} />}
            {inviting ? 'Versturen...' : 'Uitnodigen'}
          </button>
        </form>

        {inviteMsg && (
          <div style={{ fontSize: 13, padding: '10px 14px', borderRadius: 8, marginBottom: 16, background: inviteMsg.type === 'success' ? C.success + '12' : C.danger + '10', border: `1px solid ${inviteMsg.type === 'success' ? C.success + '30' : C.danger + '30'}`, color: inviteMsg.type === 'success' ? C.success : C.danger }}>
            {inviteMsg.text}
          </div>
        )}

        {/* Active team members */}
        {teamEmails.length > 0 && (
          <>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Actieve teamleden</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {teamEmails.map(email => (
                <div key={email} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: C.surface2, borderRadius: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: C.blue + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: C.blue, flexShrink: 0 }}>
                    {email[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1, fontSize: 13, color: C.text, fontWeight: 500 }}>{email}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>
                    {actions.filter(a => a.assigned_to_email === email && a.status !== 'Completed').length} open
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
