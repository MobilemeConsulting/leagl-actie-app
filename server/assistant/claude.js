import Anthropic from '@anthropic-ai/sdk'

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
const MODEL = process.env.ASSISTANT_MODEL || 'claude-sonnet-4-5'

if (!ANTHROPIC_API_KEY) {
  console.error('FOUT: ANTHROPIC_API_KEY ontbreekt — assistent endpoints zullen falen.')
}

const client = ANTHROPIC_API_KEY ? new Anthropic({ apiKey: ANTHROPIC_API_KEY }) : null

function extractJson(text) {
  // Verwijder eventuele code-fences
  const cleaned = text.replace(/```(?:json)?\s*/gi, '').replace(/```\s*$/g, '').trim()
  // Zoek eerste { en laatste } voor robuustheid
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1 || end === -1) {
    throw new Error('Geen JSON gevonden in response')
  }
  return JSON.parse(cleaned.slice(start, end + 1))
}

export async function analyzeTranscript({ systemPrompt, transcript }) {
  if (!client) throw new Error('ANTHROPIC_API_KEY niet geconfigureerd')

  const userMessage = [
    'Hier is het lopende transcript van het gesprek (oudste eerst).',
    'Analyseer de laatste user-turn(s) en retourneer JSON volgens het schema in de instructies.',
    '',
    'TRANSCRIPT:',
    transcript.map((t, i) => `${i + 1}. [${t.role}] ${t.text}`).join('\n'),
  ].join('\n')

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1500,
    system: [
      {
        type: 'text',
        text: systemPrompt,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content: userMessage }],
  })

  const text = response.content
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join('\n')

  const json = extractJson(text)

  return {
    parsed: json,
    usage: response.usage,
    raw: text,
  }
}
