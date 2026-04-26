import { Router } from 'express'
import { analyzeTranscript } from './assistant/claude.js'
import { buildSystemPrompt, buildEmailSummaryHtml } from './assistant/prompt.js'
import {
  googleConfigured, buildAuthUrl, exchangeCode, saveTokens,
  loadAndRefreshTokens, createGoogleTask, createCalendarEvent,
  encodeState, decodeState,
} from './assistant/google.js'

const BREVO_API_KEY = process.env.BREVO_API_KEY || process.env.VITE_BREVO_API_KEY
const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || 'frederiek.deprest@gmail.com'
const BREVO_SENDER_NAME = process.env.BREVO_SENDER_NAME || 'LEAGL Actie App'
const APP_URL = process.env.VITE_APP_URL || 'https://leagl-actionlist.up.railway.app'

const PRIORITY_VALUES = new Set(['low', 'medium', 'high', 'urgent'])

export function makeAssistantRouter(supabase) {
  const router = Router()

  // ─── Helpers ──────────────────────────────────────────────────────────────
  async function loadContext(tenantId) {
    const [cats, users, openActions] = await Promise.all([
      supabase.from('categories').select('id, name')
        .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
        .order('name'),
      supabase.from('tenant_users').select('user_email')
        .eq('tenant_id', tenantId),
      supabase.from('actions')
        .select('id, subject, due_date, assigned_to_email, status')
        .eq('tenant_id', tenantId)
        .neq('status', 'Completed')
        .order('due_date', { ascending: true, nullsFirst: false })
        .limit(20),
    ])
    return {
      categories: cats.data || [],
      users: (users.data || []).map(u => ({ email: u.user_email })),
      open_actions: openActions.data || [],
    }
  }

  async function getOrCreateSettings(tenantId, userEmail) {
    const { data } = await supabase.from('assistant_settings')
      .select('*').eq('tenant_id', tenantId).eq('user_email', userEmail).maybeSingle()
    if (data) return data
    const insert = { tenant_id: tenantId, user_email: userEmail }
    const { data: created } = await supabase.from('assistant_settings')
      .insert(insert).select().single()
    return created || insert
  }

  function resolveCategoryId(categoryHint, categories) {
    if (!categoryHint) return null
    const match = categories.find(c =>
      c.name.toLowerCase().trim() === String(categoryHint).toLowerCase().trim())
    return match?.id || null
  }

  async function writeActionLog({ tenantId, actionId, subject, changedByEmail, changeType, oldValue, newValue }) {
    try {
      await supabase.from('action_logs').insert([{
        tenant_id: tenantId,
        action_id: actionId || null,
        action_subject: subject || null,
        changed_by_email: changedByEmail || 'assistent',
        change_type: changeType,
        old_value: oldValue ?? null,
        new_value: newValue ?? null,
      }])
    } catch (e) {
      console.warn('[assistant] action_log schrijven mislukt:', e.message)
    }
  }

  async function sendBrevoEmail({ to, subject, html, attachment }) {
    if (!BREVO_API_KEY) throw new Error('BREVO_API_KEY ontbreekt')
    const body = {
      sender: { name: BREVO_SENDER_NAME, email: BREVO_SENDER_EMAIL },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }
    if (attachment) body.attachment = attachment
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Brevo ${res.status}: ${text}`)
    }
  }

  // ─── Endpoints ────────────────────────────────────────────────────────────

  // Start een nieuwe sessie
  router.post('/session/start', async (req, res) => {
    const { source = 'web', user_email = null } = req.body || {}
    const { data, error } = await supabase.from('assistant_sessions').insert({
      tenant_id: req.tenantId,
      user_email,
      source,
    }).select().single()
    if (error) return res.status(500).json({ error: error.message })
    res.json({ session_id: data.id })
  })

  // Eindig een sessie
  router.post('/session/:id/end', async (req, res) => {
    const { error } = await supabase.from('assistant_sessions')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', req.params.id).eq('tenant_id', req.tenantId)
    if (error) return res.status(500).json({ error: error.message })
    res.json({ success: true })
  })

  // Analyseer transcript: roep Claude, persisteer summary + extracted_actions
  router.post('/analyze', async (req, res) => {
    try {
      const { session_id, transcript, user_email } = req.body || {}
      if (!session_id || !Array.isArray(transcript) || transcript.length === 0) {
        return res.status(400).json({ error: 'session_id en transcript[] zijn verplicht' })
      }

      const { data: session, error: sErr } = await supabase
        .from('assistant_sessions').select('*')
        .eq('id', session_id).eq('tenant_id', req.tenantId).single()
      if (sErr || !session) return res.status(404).json({ error: 'sessie niet gevonden' })

      const effectiveUserEmail = user_email || session.user_email
      const settings = effectiveUserEmail
        ? await getOrCreateSettings(req.tenantId, effectiveUserEmail)
        : {}

      const context = await loadContext(req.tenantId)

      // Eerder al geëxtraheerde acties van deze sessie ophalen om duplicaten te voorkomen
      const { data: priorRows } = await supabase.from('assistant_extracted_actions')
        .select('subject').eq('session_id', session_id).neq('status', 'rejected')
      const alreadyExtracted = (priorRows || []).map(r => r.subject)

      const systemPrompt = buildSystemPrompt({
        settings,
        user: { email: effectiveUserEmail },
        tenant: { name: req.tenantName || 'organisatie' },
        context: { ...context, already_extracted: alreadyExtracted },
      })

      const { parsed, raw } = await analyzeTranscript({
        systemPrompt,
        transcript,
      })

      // Update sessie met cumulatieve summary/decisions/etc
      const sd = parsed.summary_delta || {}
      const merged = {
        transcript,
        summary: sd.summary || session.summary,
        decisions: dedupeStrings([...(session.decisions || []), ...(sd.decisions || [])]),
        open_questions: dedupeStrings([...(session.open_questions || []), ...(sd.open_questions || [])]),
        risks: dedupeStrings([...(session.risks || []), ...(sd.risks || [])]),
      }
      if (effectiveUserEmail && !session.user_email) merged.user_email = effectiveUserEmail
      await supabase.from('assistant_sessions').update(merged).eq('id', session_id)

      // Persisteer voorgestelde acties
      const extractedRows = []
      for (const a of (parsed.extracted_actions || [])) {
        if (!a?.subject) continue
        const priority = PRIORITY_VALUES.has(a.priority) ? a.priority : (settings.default_priority || 'medium')
        const row = {
          session_id,
          tenant_id: req.tenantId,
          subject: String(a.subject).slice(0, 500),
          description: a.description || null,
          due_date: isValidDate(a.due_date) ? a.due_date : null,
          priority,
          category_hint: a.category_hint || null,
          category_id: resolveCategoryId(a.category_hint, context.categories) || settings.default_category_id || null,
          assigned_to_email: a.assigned_to_email || settings.default_assignee_email || null,
          confidence: typeof a.confidence === 'number' ? a.confidence : null,
          status: 'pending',
          raw_llm_payload: a,
        }
        const { data: inserted, error: iErr } = await supabase.from('assistant_extracted_actions')
          .insert(row).select().single()
        if (iErr) {
          console.warn('[assistant] extracted_action insert fout:', iErr.message)
          continue
        }
        extractedRows.push(inserted)
      }

      res.json({
        spoken_response: parsed.spoken_response || '',
        extracted: extractedRows,
        summary: merged.summary,
        decisions: merged.decisions,
        open_questions: merged.open_questions,
        risks: merged.risks,
        needs_confirmation: parsed.needs_confirmation !== false,
      })
    } catch (err) {
      console.error('[assistant/analyze] fout:', err)
      res.status(500).json({ error: err.message || 'unknown' })
    }
  })

  // Lijst extracted actions per sessie
  router.get('/extracted/:session_id', async (req, res) => {
    const { data, error } = await supabase.from('assistant_extracted_actions')
      .select('*').eq('session_id', req.params.session_id).eq('tenant_id', req.tenantId)
      .order('created_at', { ascending: true })
    if (error) return res.status(500).json({ error: error.message })
    res.json({ extracted: data || [] })
  })

  // Bevestig voorgestelde acties → maak echte rows in `actions` + optionele Google sync
  router.post('/actions/confirm', async (req, res) => {
    try {
      const { extracted_action_ids, user_email } = req.body || {}
      if (!Array.isArray(extracted_action_ids) || extracted_action_ids.length === 0) {
        return res.status(400).json({ error: 'extracted_action_ids[] verplicht' })
      }

      const { data: rows, error: rErr } = await supabase.from('assistant_extracted_actions')
        .select('*').in('id', extracted_action_ids).eq('tenant_id', req.tenantId)
      if (rErr) return res.status(500).json({ error: rErr.message })

      // Laad settings + Google tokens éénmalig per request
      const settings = user_email
        ? await getOrCreateSettings(req.tenantId, user_email)
        : null
      const googleEnabled = settings && (settings.google_tasks_enabled || settings.google_calendar_enabled)
      const googleTokens = googleEnabled
        ? await loadAndRefreshTokens(supabase, req.tenantId, user_email)
        : null

      const created = []
      for (const r of rows || []) {
        if (r.status === 'confirmed' && r.created_action_id) {
          created.push({ extracted_id: r.id, action_id: r.created_action_id, subject: r.subject })
          continue
        }
        const payload = {
          tenant_id: req.tenantId,
          subject: r.subject,
          status: 'Open',
          percent_delivery: 0,
          is_private: false,
          category_id: r.category_id || null,
          due_date: r.due_date || null,
          assigned_to_email: r.assigned_to_email || null,
        }
        const { data: action, error: aErr } = await supabase.from('actions')
          .insert(payload).select().single()
        if (aErr) {
          console.warn('[assistant/confirm] insert fout:', aErr.message)
          continue
        }
        await supabase.from('assistant_extracted_actions').update({
          status: 'confirmed',
          created_action_id: action.id,
        }).eq('id', r.id)
        await writeActionLog({
          tenantId: req.tenantId,
          actionId: action.id,
          subject: action.subject,
          changedByEmail: user_email || 'assistent',
          changeType: 'aangemaakt',
          newValue: `Toegewezen aan: ${action.assigned_to_email || '—'} (via assistent)`,
        })

        // Google-sync — best-effort, fouten loggen maar response niet breken
        const googleSyncs = {}
        if (googleTokens?.access_token && settings?.google_tasks_enabled) {
          try {
            const task = await createGoogleTask({
              accessToken: googleTokens.access_token,
              tasklistId: settings.google_tasklist_id || '@default',
              action,
            })
            googleSyncs.tasks_id = task.id
          } catch (e) {
            console.warn('[google/tasks] sync fout:', e.message)
            googleSyncs.tasks_error = e.message
          }
        }
        if (googleTokens?.access_token && settings?.google_calendar_enabled && action.due_date) {
          try {
            const event = await createCalendarEvent({
              accessToken: googleTokens.access_token,
              calendarId: settings.google_calendar_id || 'primary',
              action,
            })
            googleSyncs.calendar_id = event.id
          } catch (e) {
            console.warn('[google/calendar] sync fout:', e.message)
            googleSyncs.calendar_error = e.message
          }
        }

        created.push({
          extracted_id: r.id,
          action_id: action.id,
          subject: action.subject,
          google: Object.keys(googleSyncs).length ? googleSyncs : undefined,
        })
      }

      res.json({ created })
    } catch (err) {
      console.error('[assistant/confirm] fout:', err)
      res.status(500).json({ error: err.message })
    }
  })

  // Verwerp voorgestelde acties
  router.post('/actions/reject', async (req, res) => {
    const { extracted_action_ids } = req.body || {}
    if (!Array.isArray(extracted_action_ids) || extracted_action_ids.length === 0) {
      return res.status(400).json({ error: 'extracted_action_ids[] verplicht' })
    }
    const { error } = await supabase.from('assistant_extracted_actions')
      .update({ status: 'rejected' })
      .in('id', extracted_action_ids).eq('tenant_id', req.tenantId)
    if (error) return res.status(500).json({ error: error.message })
    res.json({ success: true })
  })

  // Open acties opvragen
  router.get('/actions/open', async (req, res) => {
    const filter = req.query.filter || 'all'
    let q = supabase.from('actions')
      .select('id, subject, due_date, assigned_to_email, status, percent_delivery')
      .eq('tenant_id', req.tenantId)
      .neq('status', 'Completed')
      .order('due_date', { ascending: true, nullsFirst: false })

    if (filter === 'today') {
      const today = new Date().toISOString().slice(0, 10)
      q = q.lte('due_date', today)
    } else if (filter === 'urgent') {
      const in3days = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      q = q.lte('due_date', in3days)
    }

    const { data, error } = await q
    if (error) return res.status(500).json({ error: error.message })
    res.json({ acties: data || [], totaal: (data || []).length })
  })

  // Mail sessie-samenvatting
  router.post('/email-summary', async (req, res) => {
    try {
      const { session_id, to_email } = req.body || {}
      if (!session_id) return res.status(400).json({ error: 'session_id verplicht' })

      const { data: session, error: sErr } = await supabase.from('assistant_sessions')
        .select('*').eq('id', session_id).eq('tenant_id', req.tenantId).single()
      if (sErr || !session) return res.status(404).json({ error: 'sessie niet gevonden' })

      // Bevestigde acties van deze sessie
      const { data: confirmed } = await supabase.from('assistant_extracted_actions')
        .select('subject, due_date, assigned_to_email')
        .eq('session_id', session_id).eq('tenant_id', req.tenantId).eq('status', 'confirmed')

      const settings = session.user_email
        ? await getOrCreateSettings(req.tenantId, session.user_email)
        : {}
      const recipient = to_email || settings.email_summary_to || session.user_email
      if (!recipient) return res.status(400).json({ error: 'Geen ontvanger bekend' })

      const html = buildEmailSummaryHtml({
        session: { ...session, confirmed_actions: confirmed || [] },
        tenant: { name: req.tenantName },
        user: { email: session.user_email },
      })

      await sendBrevoEmail({
        to: recipient,
        subject: 'LEAGL — Sessiesamenvatting van je assistent',
        html,
      })
      res.json({ success: true, sent_to: recipient })
    } catch (err) {
      console.error('[assistant/email-summary] fout:', err)
      res.status(500).json({ error: err.message })
    }
  })

  // Settings GET
  router.get('/settings', async (req, res) => {
    const userEmail = req.query.user_email
    if (!userEmail) return res.status(400).json({ error: 'user_email verplicht' })
    const settings = await getOrCreateSettings(req.tenantId, userEmail)
    res.json({ settings })
  })

  // Settings PUT
  router.put('/settings', async (req, res) => {
    const { user_email, ...fields } = req.body || {}
    if (!user_email) return res.status(400).json({ error: 'user_email verplicht' })
    const allowed = ['persona', 'brevity', 'proactivity', 'default_category_id',
      'default_assignee_email', 'default_priority', 'confirm_before_save',
      'email_summary_to', 'microsoft_sync_enabled',
      'google_tasks_enabled', 'google_calendar_enabled', 'google_gmail_enabled',
      'google_tasklist_id', 'google_calendar_id']
    const update = {}
    for (const k of allowed) if (k in fields) update[k] = fields[k]
    const { data, error } = await supabase.from('assistant_settings')
      .upsert({ tenant_id: req.tenantId, user_email, ...update },
        { onConflict: 'tenant_id,user_email' })
      .select().single()
    if (error) return res.status(500).json({ error: error.message })
    res.json({ settings: data })
  })

  // Voice-token endpoint: returnt agent_id voor frontend (zonder app-secret te lekken)
  router.get('/voice-token', (_req, res) => {
    res.json({
      agent_id: process.env.ELEVENLABS_AGENT_ID || 'agent_4401km2r3djfeqvrvtwhepda4qqk',
      voice_id: process.env.ELEVENLABS_VOICE_ID || 'DYvUSWzbIy47Jl54JlkE',
    })
  })

  // ─── Google OAuth (auth-protected helpers) ──────────────────────────
  // Returnt de URL waar de browser naartoe moet om Google-toegang te geven.
  router.get('/google/auth-url', (req, res) => {
    if (!googleConfigured()) {
      return res.status(503).json({ error: 'Google OAuth is niet geconfigureerd op de server' })
    }
    const userEmail = req.query.user_email
    if (!userEmail) return res.status(400).json({ error: 'user_email verplicht' })
    const scopesParam = (req.query.scopes || 'tasks,calendar')
      .split(',').map(s => s.trim()).filter(Boolean)
    const state = encodeState({ t: req.tenantId, u: userEmail, n: Math.random().toString(36).slice(2) })
    res.json({ url: buildAuthUrl({ stateToken: state, scopes: scopesParam }) })
  })

  // Status van de Google-koppeling voor een gebruiker
  router.get('/google/status', async (req, res) => {
    const userEmail = req.query.user_email
    if (!userEmail) return res.status(400).json({ error: 'user_email verplicht' })
    const { data } = await supabase.from('assistant_google_tokens')
      .select('scope, expires_at, updated_at, refresh_token')
      .eq('tenant_id', req.tenantId).eq('user_email', userEmail).maybeSingle()
    res.json({
      connected: !!data,
      scope: data?.scope || null,
      expires_at: data?.expires_at || null,
      has_refresh_token: !!data?.refresh_token,
      configured: googleConfigured(),
    })
  })

  // Ontkoppel: verwijder tokens
  router.post('/google/disconnect', async (req, res) => {
    const { user_email } = req.body || {}
    if (!user_email) return res.status(400).json({ error: 'user_email verplicht' })
    await supabase.from('assistant_google_tokens')
      .delete().eq('tenant_id', req.tenantId).eq('user_email', user_email)
    res.json({ success: true })
  })

  return router
}

// ─── Publieke OAuth-callback router (geen ASSISTANT_TOKEN — Google stuurt geen header) ──
// Mount in server.js OP `/api/assistant/google/callback` BUITEN de checkAssistantAuth middleware.
export function makeGoogleCallbackRouter(supabase) {
  const router = Router()
  router.get('/callback', async (req, res) => {
    const { code, state, error: oauthError } = req.query || {}
    if (oauthError) return sendCallbackHtml(res, false, `Google fout: ${oauthError}`)
    if (!code || !state) return sendCallbackHtml(res, false, 'code of state ontbreekt')
    const decoded = decodeState(state)
    if (!decoded?.t || !decoded?.u) return sendCallbackHtml(res, false, 'ongeldige state')
    try {
      const tokens = await exchangeCode(code)
      await saveTokens(supabase, { tenantId: decoded.t, userEmail: decoded.u, tokens })
      sendCallbackHtml(res, true)
    } catch (err) {
      console.error('[google/callback] fout:', err)
      sendCallbackHtml(res, false, err.message)
    }
  })
  return router
}

function sendCallbackHtml(res, success, message = '') {
  const title = success ? 'Google verbonden ✅' : 'Google koppelen mislukt ❌'
  const body = success
    ? '<p>Je kunt dit venster sluiten en terugkeren naar de assistent.</p>'
    : `<p style="color:#b00">${message.replace(/[<>&]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]))}</p>`
  res.set('Content-Type', 'text/html').send(`<!doctype html><html><head><meta charset="utf-8">
    <title>${title}</title><meta name="viewport" content="width=device-width,initial-scale=1">
    <style>body{font-family:system-ui;background:#0f172a;color:#e2e8f0;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:1rem}h1{font-size:1.4rem}a{color:#60a5fa}</style>
    </head><body>
    <h1>${title}</h1>${body}
    <p><a href="/assistant/settings">Terug naar instellingen</a></p>
    <script>setTimeout(() => { try { window.opener?.postMessage({ google: ${success ? "'connected'" : "'error'"} }, '*'); window.close() } catch(e){} }, ${success ? 800 : 2500})</script>
    </body></html>`)
}

function isValidDate(d) {
  return typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)
}

function dedupeStrings(arr) {
  const seen = new Set()
  const out = []
  for (const s of arr) {
    if (typeof s !== 'string') continue
    const key = s.trim().toLowerCase()
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(s.trim())
  }
  return out
}
