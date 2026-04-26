// Fetch wrapper voor /api/assistant/* — voegt automatisch het ASSISTANT token toe.
// Token zit in de client bundle (zelfde trade-off als bestaande VOICE_TOKEN flow).
const TOKEN = import.meta.env.VITE_ASSISTANT_TOKEN || ''

export async function assistantFetch(path, opts = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(opts.headers || {}),
  }
  if (TOKEN) headers['x-assistant-token'] = TOKEN

  const res = await fetch(`/api/assistant${path}`, { ...opts, headers })
  const text = await res.text()
  let json = null
  try { json = text ? JSON.parse(text) : null } catch { /* niet JSON */ }
  if (!res.ok) {
    const msg = json?.error || text || `HTTP ${res.status}`
    throw new Error(msg)
  }
  return json
}

export const assistantApi = {
  startSession: (source = 'web', user_email = null) =>
    assistantFetch('/session/start', { method: 'POST', body: JSON.stringify({ source, user_email }) }),

  endSession: (sessionId) =>
    assistantFetch(`/session/${sessionId}/end`, { method: 'POST' }),

  analyze: (sessionId, transcript, user_email = null) =>
    assistantFetch('/analyze', {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId, transcript, user_email }),
    }),

  listExtracted: (sessionId) =>
    assistantFetch(`/extracted/${sessionId}`),

  confirmActions: (extracted_action_ids, user_email = null) =>
    assistantFetch('/actions/confirm', {
      method: 'POST',
      body: JSON.stringify({ extracted_action_ids, user_email }),
    }),

  rejectActions: (extracted_action_ids) =>
    assistantFetch('/actions/reject', {
      method: 'POST',
      body: JSON.stringify({ extracted_action_ids }),
    }),

  openActions: (filter = 'all') =>
    assistantFetch(`/actions/open?filter=${encodeURIComponent(filter)}`),

  emailSummary: (sessionId, to_email = null) =>
    assistantFetch('/email-summary', {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId, to_email }),
    }),

  getSettings: (user_email) =>
    assistantFetch(`/settings?user_email=${encodeURIComponent(user_email)}`),

  saveSettings: (user_email, fields) =>
    assistantFetch('/settings', {
      method: 'PUT',
      body: JSON.stringify({ user_email, ...fields }),
    }),

  getVoiceConfig: () =>
    assistantFetch('/voice-token'),

  getGoogleAuthUrl: (user_email, scopes = ['tasks', 'calendar']) =>
    assistantFetch(`/google/auth-url?user_email=${encodeURIComponent(user_email)}&scopes=${scopes.join(',')}`),

  getGoogleStatus: (user_email) =>
    assistantFetch(`/google/status?user_email=${encodeURIComponent(user_email)}`),

  disconnectGoogle: (user_email) =>
    assistantFetch('/google/disconnect', {
      method: 'POST',
      body: JSON.stringify({ user_email }),
    }),
}
