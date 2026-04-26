import express from 'express'
import { createClient } from '@supabase/supabase-js'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { makeAssistantRouter, makeGoogleCallbackRouter } from './server/assistantRoutes.js'
import { loadAndRefreshTokens, listRecentGmail } from './server/assistant/google.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

const app = express()
app.use(express.json({ limit: '1mb' }))

const PORT = process.env.PORT || 3000
const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_KEY
const SIRI_TOKEN = process.env.SIRI_TOKEN
const ASSISTANT_TOKEN = process.env.ASSISTANT_TOKEN
const ASSISTANT_TENANT_ID = process.env.ASSISTANT_TENANT_ID

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('FOUT: VITE_SUPABASE_URL of VITE_SUPABASE_SERVICE_KEY ontbreekt!')
}
if (!SIRI_TOKEN) {
  console.error('FOUT: SIRI_TOKEN ontbreekt!')
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Serve static SPA
app.use(express.static(join(__dirname, 'dist')))

// Quick-action endpoint for Siri Shortcut
app.post('/api/quick-action', async (req, res) => {
  const auth = req.headers.authorization
  console.log('POST /api/quick-action - auth:', auth ? 'aanwezig' : 'ontbreekt')

  if (!SIRI_TOKEN || auth !== `Bearer ${SIRI_TOKEN}`) {
    console.log('401 Unauthorized - token mismatch')
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { subject, tenant_id, assigned_to_email, due_date } = req.body
  console.log('Body:', { subject, tenant_id, assigned_to_email, due_date })

  if (!subject || !tenant_id) {
    return res.status(400).json({ error: 'subject en tenant_id zijn verplicht' })
  }

  const { data, error } = await supabase
    .from('actions')
    .insert({
      subject,
      tenant_id,
      assigned_to_email: assigned_to_email || null,
      due_date: due_date || null,
      status: 'Open',
      percent_delivery: 0,
      is_private: false,
    })
    .select()
    .single()

  if (error) {
    console.error('Supabase fout:', error.message)
    return res.status(500).json({ error: error.message })
  }
  console.log('Actie aangemaakt:', data.id)
  res.json({ success: true, action: data })
})

// ─── ElevenLabs Agent Tools ───────────────────────────────────────────────────
// Eenvoudige token-check: stel VOICE_TOKEN in Railway én in de ElevenLabs tool-headers
const VOICE_TOKEN = process.env.VOICE_TOKEN

function checkVoiceAuth(req, res) {
  // Accepteert OF VOICE_TOKEN OF ASSISTANT_TOKEN (vereenvoudiging — één token voor alle voice tools).
  const provided = req.headers['x-voice-token']
  const validTokens = [VOICE_TOKEN, ASSISTANT_TOKEN].filter(Boolean)
  if (validTokens.length === 0) return true // dev: geen tokens ingesteld = open
  if (!provided || !validTokens.includes(provided)) {
    res.status(401).json({ error: 'Unauthorized' })
    return false
  }
  return true
}

const TENANT_ID = '4e3ad38c-08a8-4eae-94dc-0b9633180e70'

// Tool 1: haal categorieën en gebruikers op
app.get('/api/voice/opties', async (req, res) => {
  if (!checkVoiceAuth(req, res)) return
  const [cats, users] = await Promise.all([
    supabase.from('categories').select('id, name').eq('tenant_id', TENANT_ID).order('name'),
    supabase.from('tenant_users').select('user_email').eq('tenant_id', TENANT_ID),
  ])
  res.json({
    categories: cats.data || [],
    gebruikers: (users.data || []).map(u => ({
      email: u.user_email,
      naam: u.user_email.split('@')[0].replace(/[._]/g, ' '),
    })),
  })
})

// Tool 2: maak een nieuwe actie aan
app.post('/api/voice/actie', async (req, res) => {
  if (!checkVoiceAuth(req, res)) return
  const { subject, category_id, due_date, assigned_to_email } = req.body
  if (!subject) return res.status(400).json({ error: 'subject is verplicht' })

  const { data, error } = await supabase.from('actions').insert({
    subject,
    tenant_id: TENANT_ID,
    status: 'Open',
    percent_delivery: 0,
    is_private: false,
    category_id: category_id || null,
    due_date: due_date || null,
    assigned_to_email: assigned_to_email || null,
  }).select().single()

  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true, id: data.id, subject: data.subject })
})

// Tool 4: haal recente Gmail mails op (vereist gekoppelde Google account met gmail-scope)
app.get('/api/voice/gmail', async (req, res) => {
  if (!checkVoiceAuth(req, res)) return
  try {
    const userEmail = req.query.user_email || process.env.ASSISTANT_DEFAULT_USER_EMAIL
    if (!userEmail) return res.status(400).json({ error: 'user_email vereist (querystring of ASSISTANT_DEFAULT_USER_EMAIL env)' })
    const tokens = await loadAndRefreshTokens(supabase, TENANT_ID, userEmail)
    if (!tokens?.access_token) return res.status(404).json({ error: 'Geen Google koppeling voor deze gebruiker' })
    if (!(tokens.scope || '').includes('gmail.readonly')) {
      return res.status(403).json({ error: 'Gmail-scope niet verleend bij Google login. Gebruiker moet opnieuw verbinden met Gmail-toggle aan.' })
    }
    const max = Math.min(Number(req.query.max) || 10, 25)
    const query = req.query.q || 'in:inbox'
    const messages = await listRecentGmail({ accessToken: tokens.access_token, max, query })
    res.json({ messages, total: messages.length })
  } catch (err) {
    console.error('[voice/gmail] fout:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// Tool 3: haal open acties op
app.get('/api/voice/acties', async (req, res) => {
  if (!checkVoiceAuth(req, res)) return
  const { data, error } = await supabase
    .from('actions')
    .select('id, subject, due_date, assigned_to_email, status')
    .eq('tenant_id', TENANT_ID)
    .eq('status', 'Open')
    .order('due_date', { ascending: true, nullsFirst: false })

  if (error) return res.status(500).json({ error: error.message })
  res.json({ acties: data || [], totaal: (data || []).length })
})

// ─── Executive AI Assistent (/assistant) ─────────────────────────────────────
// Single-tenant via shared-secret token (zelfde model als VOICE_TOKEN).
// Alle assistent-endpoints injecteren tenantId uit ASSISTANT_TENANT_ID.
function checkAssistantAuth(req, res, next) {
  if (!ASSISTANT_TOKEN) {
    // dev-mode: laat door, maar log waarschuwing eenmalig
    if (!checkAssistantAuth._warned) {
      console.warn('[assistant] ASSISTANT_TOKEN niet ingesteld — endpoints zijn open!')
      checkAssistantAuth._warned = true
    }
  } else if (req.headers['x-assistant-token'] !== ASSISTANT_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  if (!ASSISTANT_TENANT_ID) {
    return res.status(500).json({ error: 'ASSISTANT_TENANT_ID niet geconfigureerd' })
  }
  req.tenantId = ASSISTANT_TENANT_ID
  req.tenantName = process.env.ASSISTANT_TENANT_NAME || ''
  next()
}

// Google OAuth callback is publiek (Google stuurt geen token-header).
// Mount VÓÓR de auth-protected router zodat /api/assistant/google/callback geen 401 krijgt.
app.use('/api/assistant/google', makeGoogleCallbackRouter(supabase))
app.use('/api/assistant', checkAssistantAuth, makeAssistantRouter(supabase))

// SPA fallback — alle andere routes gaan naar index.html
app.get('*', (_req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'))
})

app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
