// Google integratie: OAuth flow + push naar Google Tasks en Calendar.
// Server-side OAuth: tokens worden in `assistant_google_tokens` opgeslagen.
// Refresh wordt automatisch gedaan wanneer access_token verlopen is.
// Vereist env vars: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'

const SCOPES = {
  tasks: 'https://www.googleapis.com/auth/tasks',
  calendar: 'https://www.googleapis.com/auth/calendar.events',
  gmail_readonly: 'https://www.googleapis.com/auth/gmail.readonly',
}

export function googleConfigured() {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REDIRECT_URI)
}

export function buildAuthUrl({ stateToken, scopes = ['tasks', 'calendar'] }) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    scope: scopes.map(s => SCOPES[s]).filter(Boolean).join(' '),
    state: stateToken,
  })
  return `${AUTH_URL}?${params.toString()}`
}

export async function exchangeCode(code) {
  const body = new URLSearchParams({
    code,
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    grant_type: 'authorization_code',
  })
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const json = await res.json()
  if (!res.ok) throw new Error(`Google token-exchange ${res.status}: ${JSON.stringify(json)}`)
  return json // {access_token, refresh_token, expires_in, scope, token_type}
}

export async function refreshAccessToken(refreshToken) {
  const body = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  })
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const json = await res.json()
  if (!res.ok) throw new Error(`Google refresh ${res.status}: ${JSON.stringify(json)}`)
  return json // {access_token, expires_in, scope, token_type}
}

export async function loadAndRefreshTokens(supabase, tenantId, userEmail) {
  const { data, error } = await supabase.from('assistant_google_tokens')
    .select('*').eq('tenant_id', tenantId).eq('user_email', userEmail).maybeSingle()
  if (error || !data) return null

  const expired = data.expires_at && new Date(data.expires_at).getTime() < Date.now() + 60_000
  if (!expired) return data

  if (!data.refresh_token) return data
  try {
    const refreshed = await refreshAccessToken(data.refresh_token)
    const newExpires = new Date(Date.now() + (refreshed.expires_in || 3600) * 1000).toISOString()
    const update = {
      access_token: refreshed.access_token,
      expires_at: newExpires,
      updated_at: new Date().toISOString(),
    }
    if (refreshed.scope) update.scope = refreshed.scope
    await supabase.from('assistant_google_tokens')
      .update(update).eq('tenant_id', tenantId).eq('user_email', userEmail)
    return { ...data, ...update }
  } catch (e) {
    console.warn('[google] refresh mislukt:', e.message)
    return data
  }
}

export async function saveTokens(supabase, { tenantId, userEmail, tokens }) {
  const expiresAt = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
    : null
  const row = {
    tenant_id: tenantId,
    user_email: userEmail,
    access_token: tokens.access_token,
    scope: tokens.scope,
    expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  }
  if (tokens.refresh_token) row.refresh_token = tokens.refresh_token
  const { error } = await supabase.from('assistant_google_tokens')
    .upsert(row, { onConflict: 'tenant_id,user_email' })
  if (error) throw new Error(`Token opslaan mislukt: ${error.message}`)
}

// ─── Push naar Google Tasks ──────────────────────────────────────────────
export async function createGoogleTask({ accessToken, tasklistId = '@default', action }) {
  const body = {
    title: action.subject,
    notes: action.description || '',
  }
  if (action.due_date) {
    // Google Tasks vereist RFC3339 datetime; gebruik 00:00 UTC
    body.due = `${action.due_date}T00:00:00.000Z`
  }
  const url = `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(tasklistId)}/tasks`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(`Google Tasks ${res.status}: ${JSON.stringify(json)}`)
  return json
}

// ─── Push naar Google Calendar (all-day event op due_date) ──────────────
export async function createCalendarEvent({ accessToken, calendarId = 'primary', action }) {
  if (!action.due_date) return null
  const body = {
    summary: `Actie: ${action.subject}`,
    description: action.description || '',
    start: { date: action.due_date },
    end: { date: nextDayIso(action.due_date) }, // exclusive end
  }
  if (action.assigned_to_email) {
    body.attendees = [{ email: action.assigned_to_email }]
  }
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(`Google Calendar ${res.status}: ${JSON.stringify(json)}`)
  return json
}

// ─── Gmail: lijst recente messages ──────────────────────────────────────
export async function listRecentGmail({ accessToken, max = 10, query = 'in:inbox' }) {
  const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${max}&q=${encodeURIComponent(query)}`
  const listRes = await fetch(listUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!listRes.ok) {
    const txt = await listRes.text()
    throw new Error(`Gmail list ${listRes.status}: ${txt}`)
  }
  const listJson = await listRes.json()
  const ids = (listJson.messages || []).map(m => m.id)
  if (!ids.length) return []

  // Haal voor elke message id de metadata + snippet
  const messages = await Promise.all(ids.map(async id => {
    const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`
    const r = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
    if (!r.ok) return null
    const j = await r.json()
    const headers = (j.payload?.headers || []).reduce((acc, h) => {
      acc[h.name.toLowerCase()] = h.value
      return acc
    }, {})
    return {
      id: j.id,
      thread_id: j.threadId,
      from: headers.from || '',
      subject: headers.subject || '(geen onderwerp)',
      date: headers.date || '',
      snippet: j.snippet || '',
      unread: (j.labelIds || []).includes('UNREAD'),
    }
  }))
  return messages.filter(Boolean)
}

function nextDayIso(yyyymmdd) {
  const d = new Date(`${yyyymmdd}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

// ─── State token (eenvoudige HMAC-loze base64, single-tenant scope) ──
export function encodeState(payload) {
  return Buffer.from(JSON.stringify(payload)).toString('base64url')
}

export function decodeState(state) {
  try {
    return JSON.parse(Buffer.from(state, 'base64url').toString('utf-8'))
  } catch { return null }
}
