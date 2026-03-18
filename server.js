import express from 'express'
import { createClient } from '@supabase/supabase-js'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

const app = express()
app.use(express.json())

const PORT = process.env.PORT || 3000
const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_KEY
const SIRI_TOKEN = process.env.SIRI_TOKEN

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

// SPA fallback — alle andere routes gaan naar index.html
app.get('*', (_req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'))
})

app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
