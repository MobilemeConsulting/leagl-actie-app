import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient.js';
import { adminSupabase } from '../adminSupabaseClient.js';
import { Mail, Loader2 } from 'lucide-react';
import { useTenantContext } from '../context/TenantContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';

const BREVO_KEY = import.meta.env.VITE_BREVO_API_KEY;
const APP_URL   = import.meta.env.VITE_APP_URL || 'https://leagl-actionlist.up.railway.app';
const SENDER    = 'frederiek.deprest@gmail.com';

async function sendWelcomeEmail({ to, tempPassword, name }) {
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
          <p style="margin:0 0 10px;font-size:14px;color:#5A5856;line-height:1.7;">Om onze manier van werken scherper, transparanter en efficiënter te beheren, stappen we vandaag over naar een nieuwe manier van samenwerken via de Team Actions App.</p>
          <p style="margin:0 0 10px;font-size:14px;color:#5A5856;line-height:1.7;">Geen versnipperde informatie meer in mailboxen of papieren actielijsten, maar één centrale <strong>single point of truth</strong>.</p>
          <p style="margin:0 0 24px;font-size:14px;color:#5A5856;line-height:1.7;">Vanaf nu heb je altijd en overal real-time inzicht in lopende acties, deadlines en prioriteiten van alle leden van het team.</p>
          <div style="background:#F0EDE8;border:1px solid #E4E1DC;border-radius:8px;padding:20px 24px;margin-bottom:24px;">
            <div style="font-size:12px;font-weight:700;color:#8A8480;text-transform:uppercase;letter-spacing:1px;margin-bottom:14px;">Wat kun je doen?</div>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td style="padding-bottom:12px;vertical-align:top;width:22px;padding-top:1px;"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#C8A96E;margin-top:5px;"></span></td><td style="padding-bottom:12px;font-size:13px;color:#141210;line-height:1.6;"><strong>Acties inzien:</strong> Je vindt je acties direct in de app of in je vertrouwde Outlook/Microsoft To Do lijst.</td></tr>
              <tr><td style="padding-bottom:12px;vertical-align:top;padding-top:1px;"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#C8A96E;margin-top:5px;"></span></td><td style="padding-bottom:12px;font-size:13px;color:#141210;line-height:1.6;"><strong>Updates geven:</strong> Pas eenvoudig het groeipercentage aan zodat iedereen weet hoever je bent.</td></tr>
              <tr><td style="vertical-align:top;padding-top:1px;"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#C8A96E;margin-top:5px;"></span></td><td style="font-size:13px;color:#141210;line-height:1.6;"><strong>Snel afvinken:</strong> Klaar? Eén klik op 'Afvinken' en de actie verdwijnt naar de historie.</td></tr>
            </table>
          </div>
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
      subject: `Welkom bij de Leagl Actie App, ${displayName}!`,
      htmlContent: html,
    }),
  });
  if (!res.ok) throw new Error(`Brevo fout ${res.status}`);
}

function genTempPassword() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

const C = {
  accent: '#C8A96E', blue: '#4263EB', bg: '#F7F5F2',
  surface: '#FFFFFF', surface2: '#F0EDE8', border: '#E4E1DC',
  text: '#141210', muted: '#8A8480', success: '#2D9E5A', danger: '#E5383B',
};

export default function TeamPage() {
  const { tenant } = useTenantContext();
  const { t } = useLanguage();
  const [actions, setActions]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName]   = useState('');
  const [inviting, setInviting]       = useState(false);
  const [inviteMsg, setInviteMsg]     = useState(null);

  useEffect(() => {
    if (!tenant?.id) return;
    supabase.from('actions').select('assigned_to_email, status').eq('tenant_id', tenant.id).then(({ data }) => {
      setActions(data || []);
      setLoading(false);
    });
  }, [tenant?.id]);

  async function handleInvite(e) {
    e.preventDefault();
    const email = inviteEmail.trim();
    if (!email) return;
    setInviting(true);
    setInviteMsg(null);
    try {
      const tempPassword = genTempPassword();
      const { data: created, error } = await adminSupabase.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { must_change_password: true },
      });
      if (error) throw error;
      // Add user to this tenant
      if (tenant?.id && created?.user?.id) {
        await supabase.from('tenant_users').insert([{
          tenant_id: tenant.id,
          user_id: created.user.id,
          user_email: email,
          role: 'member',
        }]).throwOnError();
      }
      sendWelcomeEmail({ to: email, tempPassword, name: inviteName.trim() }).catch(err =>
        console.warn('Welcome email failed:', err.message)
      );
      setInviteMsg({ type: 'success', text: `${t('team_invite_ok')} ${email}` });
      setInviteEmail(''); setInviteName('');
    } catch (err) {
      setInviteMsg({ type: 'error', text: err.message });
    } finally {
      setInviting(false);
    }
  }

  const teamEmails = [...new Set(actions.map(a => a.assigned_to_email).filter(Boolean))];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Invite form */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '24px 28px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 4, letterSpacing: '-0.01em' }}>{t('team_invite_title')}</div>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 20, lineHeight: 1.6 }}>
          {t('team_invite_sub')}
        </div>
        <form onSubmit={handleInvite} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input
            type="text"
            value={inviteName}
            onChange={e => setInviteName(e.target.value)}
            placeholder={t('team_name_ph')}
            style={{ width: 160, background: C.surface2, border: `1.5px solid ${C.border}`, borderRadius: 8, padding: '10px 14px', fontSize: 13, color: C.text, outline: 'none', fontFamily: 'inherit', flexShrink: 0 }}
          />
          <input
            type="email"
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            placeholder={t('team_email_ph')}
            required
            style={{ flex: 1, minWidth: 200, background: C.surface2, border: `1.5px solid ${C.border}`, borderRadius: 8, padding: '10px 14px', fontSize: 13, color: C.text, outline: 'none', fontFamily: 'inherit' }}
          />
          <button type="submit" disabled={inviting || !inviteEmail.trim()}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: inviting || !inviteEmail.trim() ? C.muted : C.blue, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: inviting ? 'not-allowed' : 'pointer', boxShadow: inviting ? 'none' : '0 2px 8px rgba(66,99,235,0.28)', whiteSpace: 'nowrap' }}>
            {inviting ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Mail size={14} />}
            {inviting ? t('team_inviting') : t('team_invite_btn')}
          </button>
        </form>
        {inviteMsg && (
          <div style={{ fontSize: 13, padding: '10px 14px', borderRadius: 8, marginTop: 14, background: inviteMsg.type === 'success' ? C.success + '12' : C.danger + '10', border: `1px solid ${inviteMsg.type === 'success' ? C.success + '30' : C.danger + '30'}`, color: inviteMsg.type === 'success' ? C.success : C.danger }}>
            {inviteMsg.text}
          </div>
        )}
      </div>

      {/* Active team members */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '24px 28px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 4, letterSpacing: '-0.01em' }}>{t('team_members_title')}</div>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>{t('team_members_sub')}</div>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '30px 0' }}>
            <div style={{ width: 28, height: 28, border: `3px solid ${C.border}`, borderTopColor: C.accent, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : teamEmails.length === 0 ? (
          <div style={{ fontSize: 13, color: C.muted, textAlign: 'center', padding: '24px 0' }}>{t('team_no_members')}</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {teamEmails.map(email => {
              const open = actions.filter(a => a.assigned_to_email === email && a.status !== 'Completed').length;
              const done = actions.filter(a => a.assigned_to_email === email && a.status === 'Completed').length;
              return (
                <div key={email} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: C.surface2, borderRadius: 10, border: `1px solid ${C.border}` }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: C.blue + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: C.blue, flexShrink: 0 }}>
                    {email[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1, fontSize: 13, color: C.text, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, background: 'rgba(66,99,235,0.08)', color: C.blue, border: '1px solid rgba(66,99,235,0.2)', borderRadius: 6, padding: '2px 8px' }}>{open} {t('team_open')}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, background: 'rgba(45,158,90,0.08)', color: C.success, border: '1px solid rgba(45,158,90,0.2)', borderRadius: 6, padding: '2px 8px' }}>{done} {t('team_done')}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
