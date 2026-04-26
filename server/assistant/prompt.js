const PERSONAS = {
  'zakelijk-direct': 'Je bent een zakelijke, directe executive assistent. Je houdt het kort en concreet.',
  'coachend': 'Je bent een coachende sparringpartner. Je stelt af en toe verdiepende vragen, maar nooit ten koste van efficiëntie.',
  'bondig': 'Je bent extreem bondig. Maximaal twee zinnen per beurt, behalve bij samenvattingen.',
}

const BREVITY = {
  1: 'Je mag uitgebreid zijn waar nodig.',
  2: 'Houd antwoorden kort, max 3 zinnen per beurt.',
  3: 'Antwoord in maximaal één korte zin per beurt.',
}

const PROACTIVITY = {
  1: 'Stel geen extra vragen tenzij absoluut nodig.',
  2: 'Stel een verduidelijkingsvraag wanneer een actie onvolledig is (bv. ontbrekende deadline of eigenaar).',
  3: 'Stel proactief vragen om context te verrijken: "wie", "wanneer", "waarom belangrijk".',
}

export function buildSystemPrompt({
  settings = {},
  user = {},
  tenant = {},
  context = {},
}) {
  const persona = PERSONAS[settings.persona] || PERSONAS['zakelijk-direct']
  const brevity = BREVITY[settings.brevity] || BREVITY[2]
  const proactivity = PROACTIVITY[settings.proactivity] || PROACTIVITY[2]

  const today = new Date().toISOString().slice(0, 10)
  const userLabel = user.email || 'gebruiker'
  const tenantLabel = tenant.name || 'organisatie'

  const categoriesList = (context.categories || [])
    .map(c => `- ${c.name}`)
    .join('\n') || '(geen categorieën beschikbaar)'

  const usersList = (context.users || [])
    .map(u => `- ${u.email}`)
    .join('\n') || '(geen gebruikers beschikbaar)'

  const openActionsList = (context.open_actions || []).slice(0, 20)
    .map(a => `- ${a.subject}${a.due_date ? ` (deadline ${a.due_date})` : ''}${a.assigned_to_email ? ` — ${a.assigned_to_email}` : ''}`)
    .join('\n') || '(geen open acties)'

  const defaults = []
  if (settings.default_assignee_email) defaults.push(`Default toegewezen aan: ${settings.default_assignee_email}`)
  if (settings.default_priority) defaults.push(`Default prioriteit: ${settings.default_priority}`)
  if (settings.default_category_id) defaults.push(`Default categorie-id: ${settings.default_category_id}`)
  const defaultsBlock = defaults.length ? defaults.join('\n') : '(geen defaults ingesteld)'

  return `Je bent de executive AI assistent voor ${userLabel} bij ${tenantLabel}.
Vandaag is ${today}. De volledige conversatie verloopt in het Nederlands.

PERSONA
${persona}

STIJL
${brevity}
${proactivity}

DEFAULTS
${defaultsBlock}

BESCHIKBARE CATEGORIEËN
${categoriesList}

BESCHIKBARE TEAMLEDEN (e-mail)
${usersList}

OPEN ACTIES VAN DE GEBRUIKER (max 20)
${openActionsList}

DOEL
Je luistert naar de gebruiker, denkt mee, en extraheert concrete acties.
Je bent GEEN voice-recorder. Je bent een denkpartner die actie structureert.

ACTIE-DEFINITIE
Een ACTIE is een concrete, toewijsbare taak met óf een eigenaar óf een deadline (bij voorkeur beide).
GEEN ACTIE: gevoelens, brainstorm-uitspraken, statusupdates, vragen aan jou.

JE OUTPUT
Retourneer ALTIJD geldige JSON volgens dit schema, en niets anders:

{
  "spoken_response": "Wat de assistent hardop zegt tegen de gebruiker (Nederlands, beknopt).",
  "extracted_actions": [
    {
      "subject": "korte, actiegerichte titel",
      "description": "optionele toelichting (mag leeg)",
      "due_date": "YYYY-MM-DD of null",
      "priority": "low|medium|high|urgent",
      "category_hint": "naam van bestaande categorie of nieuwe naam",
      "assigned_to_email": "e-mail uit lijst of null",
      "confidence": 0.0
    }
  ],
  "summary_delta": {
    "summary": "korte run-up samenvatting van het gesprek tot nu toe",
    "decisions": ["beslissing 1"],
    "open_questions": ["nog te beantwoorden vraag"],
    "risks": ["aandachtspunt of risico"]
  },
  "needs_confirmation": true
}

REGELS
- Verzin geen e-mailadressen, categorieën of deadlines die niet uit de conversatie komen.
- Als een veld onbekend is: gebruik null (of een lege array).
- Als de gebruiker vraagt naar bestaande acties ("wat is urgent vandaag", "wat staat er open"): vat ze samen in spoken_response op basis van OPEN ACTIES hierboven, en laat extracted_actions leeg.
- "Mail me dit" of "stuur me een samenvatting" → laat extracted_actions leeg, zet in spoken_response een bevestiging dat de samenvatting wordt verstuurd.
- Als er geen nieuwe actie is: laat extracted_actions een lege array.
- Geef ALLEEN de JSON terug, geen extra tekst, geen code-fences.`
}

export function buildEmailSummaryHtml({ session, tenant, user }) {
  const decisions = (session.decisions || []).map(d => `<li>${escapeHtml(d)}</li>`).join('') || '<li><em>geen</em></li>'
  const openQ = (session.open_questions || []).map(q => `<li>${escapeHtml(q)}</li>`).join('') || '<li><em>geen</em></li>'
  const risks = (session.risks || []).map(r => `<li>${escapeHtml(r)}</li>`).join('') || '<li><em>geen</em></li>'
  const actionsCount = (session.confirmed_actions || []).length
  const actionsList = (session.confirmed_actions || [])
    .map(a => `<li><strong>${escapeHtml(a.subject)}</strong>${a.due_date ? ` — ${escapeHtml(a.due_date)}` : ''}${a.assigned_to_email ? ` (${escapeHtml(a.assigned_to_email)})` : ''}</li>`)
    .join('') || '<li><em>geen acties bevestigd</em></li>'

  return `<!DOCTYPE html><html lang="nl"><body style="margin:0;padding:0;background:#F7F5F2;font-family:Helvetica,Arial,sans-serif;color:#141210;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F5F2;padding:40px 0;">
      <tr><td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <tr><td style="background:#0C0D10;padding:24px 40px;">
            <div style="font-size:22px;font-weight:800;color:#C8A96E;letter-spacing:3px;">LEAGL</div>
            <div style="font-size:10px;color:rgba(255,255,255,0.4);letter-spacing:3px;text-transform:uppercase;margin-top:4px;">Assistent — sessiesamenvatting</div>
          </td></tr>
          <tr><td style="padding:36px 40px;">
            <h2 style="margin:0 0 4px;font-size:18px;">Samenvatting</h2>
            <p style="margin:0 0 16px;font-size:14px;line-height:1.5;color:#3a3633;">${escapeHtml(session.summary || '—')}</p>

            <h3 style="margin:20px 0 6px;font-size:14px;">Beslissingen</h3>
            <ul style="margin:0;padding-left:18px;font-size:13px;line-height:1.5;">${decisions}</ul>

            <h3 style="margin:20px 0 6px;font-size:14px;">Bevestigde acties (${actionsCount})</h3>
            <ul style="margin:0;padding-left:18px;font-size:13px;line-height:1.5;">${actionsList}</ul>

            <h3 style="margin:20px 0 6px;font-size:14px;">Open vragen</h3>
            <ul style="margin:0;padding-left:18px;font-size:13px;line-height:1.5;">${openQ}</ul>

            <h3 style="margin:20px 0 6px;font-size:14px;">Aandachtspunten</h3>
            <ul style="margin:0;padding-left:18px;font-size:13px;line-height:1.5;">${risks}</ul>
          </td></tr>
          <tr><td style="background:#F0EDE8;padding:16px 40px;border-top:1px solid #E4E1DC;">
            <p style="margin:0;font-size:11px;color:#8A8480;">© ${new Date().getFullYear()} LEAGL — Assistent samenvatting voor ${escapeHtml(user.email || '')}${tenant?.name ? ' · ' + escapeHtml(tenant.name) : ''}</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body></html>`
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]))
}
