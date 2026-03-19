import { useState, useRef, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

const TENANT_ID = '4e3ad38c-08a8-4eae-94dc-0b9633180e70'

// ─── Hulpfuncties ────────────────────────────────────────────────────────────

function formatDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatDisplayDate(dateStr) {
  if (!dateStr) return 'geen'
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('nl-BE', { weekday: 'long', day: 'numeric', month: 'long' })
}

function parseDutchDate(text) {
  const today = new Date()
  const t = text.toLowerCase().trim()

  if (/vandaag/.test(t)) return formatDate(today)

  if (/overmorgen/.test(t)) {
    const d = new Date(today); d.setDate(d.getDate() + 2); return formatDate(d)
  }
  if (/\bmorgen\b/.test(t)) {
    const d = new Date(today); d.setDate(d.getDate() + 1); return formatDate(d)
  }
  if (/over\s+(2|twee)\s+weken/.test(t)) {
    const d = new Date(today); d.setDate(d.getDate() + 14); return formatDate(d)
  }
  if (/volgende\s+week/.test(t)) {
    const d = new Date(today); d.setDate(d.getDate() + 7); return formatDate(d)
  }
  if (/einde?\s+(van\s+(de\s+)?)?maand/.test(t)) {
    const d = new Date(today.getFullYear(), today.getMonth() + 1, 0); return formatDate(d)
  }

  const dagNamen = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag']
  for (let i = 0; i < dagNamen.length; i++) {
    if (t.includes(dagNamen[i])) {
      const d = new Date(today)
      const diff = ((i - d.getDay()) + 7) % 7 || 7
      d.setDate(d.getDate() + diff)
      return formatDate(d)
    }
  }

  const maandNamen = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december']
  for (let m = 0; m < maandNamen.length; m++) {
    if (t.includes(maandNamen[m])) {
      const numMatch = t.match(/(\d+)/)
      if (numMatch) {
        const day = parseInt(numMatch[1])
        const year = today.getMonth() > m ? today.getFullYear() + 1 : today.getFullYear()
        return `${year}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      }
    }
  }

  const dateMatch = t.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/)
  if (dateMatch) {
    const day = String(dateMatch[1]).padStart(2, '0')
    const month = String(dateMatch[2]).padStart(2, '0')
    const year = dateMatch[3]
      ? (dateMatch[3].length === 2 ? '20' + dateMatch[3] : dateMatch[3])
      : today.getFullYear()
    return `${year}-${month}-${day}`
  }

  return null
}

function detectIntent(text) {
  const t = text.toLowerCase()
  const maakWoorden = ['maak', 'aanmaken', 'actie aanmaken', 'actie maken', 'nieuwe actie', 'nieuwe', 'voeg toe', 'toevoegen', 'nieuw', 'aanmaken']
  const overzichtWoorden = ['overzicht', 'wat zijn', 'laat zien', 'toon', 'mijn acties', 'welke acties', 'open acties', 'lijst', 'show', 'bekijk']
  for (const w of maakWoorden) if (t.includes(w)) return 'create'
  for (const w of overzichtWoorden) if (t.includes(w)) return 'overview'
  return null
}

function matchCategorie(text, categories) {
  if (!text || !categories.length) return null
  const t = text.toLowerCase()
  let match = categories.find(c => c.name.toLowerCase() === t)
  if (match) return match
  match = categories.find(c => t.includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(t))
  if (match) return match
  const eersteWoord = t.split(/\s+/)[0]
  return categories.find(c => c.name.toLowerCase().split(/\s+/).some(w => w.startsWith(eersteWoord) || eersteWoord.startsWith(w))) || null
}

function matchGebruiker(text, users) {
  if (!text || !users.length) return null
  const t = text.toLowerCase().trim()
  if (/geen|niemand|overslaan|skip|zelf|ik/.test(t)) return 'skip'
  for (const u of users) {
    const email = u.user_email.toLowerCase()
    const naamDeel = email.split('@')[0].replace(/[._]/g, ' ')
    const voornaam = naamDeel.split(' ')[0]
    if (email === t || email.includes(t)) return u
    if (naamDeel.includes(t) || t.includes(naamDeel)) return u
    if (voornaam && (t.includes(voornaam) || voornaam.startsWith(t.split(' ')[0]))) return u
  }
  return null
}

function isOverslaan(text) {
  return /geen|overslaan|skip|nee|niets|leeg|geen deadline/.test(text.toLowerCase())
}

function naamVanEmail(email) {
  const deel = email.split('@')[0].replace(/[._]/g, ' ')
  return deel.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

// ─── TTS met fallback ────────────────────────────────────────────────────────

function spreekTekst(text, onKlaar) {
  if (!window.speechSynthesis) { onKlaar?.(); return }
  window.speechSynthesis.cancel()
  const utt = new SpeechSynthesisUtterance(text)
  utt.lang = 'nl-NL'
  utt.rate = 1.0
  let klaar = false
  const gereed = () => { if (klaar) return; klaar = true; onKlaar?.() }
  utt.onend = gereed
  utt.onerror = gereed
  window.speechSynthesis.speak(utt)
  // Fallback als onend niet vuurt (iOS/Tesla quirk)
  setTimeout(gereed, Math.max(text.length * 75, 2000))
}

// ─── Hoofdcomponent ──────────────────────────────────────────────────────────

export default function VoicePage() {
  // fase: idle | vragen | luisteren | verwerken | overzicht | opslaan | klaar | fout
  const [fase, setFase] = useState('idle')
  // stap: null | intent | onderwerp | categorie | deadline | toewijzing | bevestigen
  const [stap, setStap] = useState(null)
  const [gesprek, setGesprek] = useState([])
  const [categories, setCategories] = useState([])
  const [users, setUsers] = useState([])
  const [overzichtActies, setOverzichtActies] = useState([])
  const [concept, setConcept] = useState({ onderwerp: '', category_id: null, category_naam: '', due_date: null, toegewezen_aan: null })
  const [isListening, setIsListening] = useState(false)

  const recognitionRef = useRef(null)
  const categoriesRef = useRef([])
  const usersRef = useRef([])
  const gesprekRef = useRef(null)
  const huidigeHandlerRef = useRef(null)
  const huidigConceptRef = useRef(concept)

  useEffect(() => { laadData() }, [])

  // Auto-scroll gesprek naar beneden
  useEffect(() => {
    if (gesprekRef.current) {
      gesprekRef.current.scrollTop = gesprekRef.current.scrollHeight
    }
  }, [gesprek])

  async function laadData() {
    const [catResult, userResult] = await Promise.all([
      supabase.from('categories').select('*').eq('tenant_id', TENANT_ID).order('name'),
      supabase.from('tenant_users').select('*').eq('tenant_id', TENANT_ID)
    ])
    const cats = catResult.data || []
    const usrs = userResult.data || []
    setCategories(cats)
    setUsers(usrs)
    categoriesRef.current = cats
    usersRef.current = usrs
  }

  function voegBerichtToe(rol, tekst) {
    setGesprek(prev => [...prev, { rol, tekst, id: Date.now() + Math.random() }])
  }

  function vraagEnLuister(vraag, handler) {
    voegBerichtToe('assistent', vraag)
    setFase('vragen')
    huidigeHandlerRef.current = handler
    spreekTekst(vraag, () => startLuisteren(handler))
  }

  function startLuisteren(handler) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      voegBerichtToe('assistent', 'Spraakherkenning wordt niet ondersteund in deze browser.')
      setFase('fout')
      return
    }

    const r = new SR()
    r.lang = 'nl-NL'
    r.interimResults = false
    r.maxAlternatives = 1
    recognitionRef.current = r

    setFase('luisteren')
    setIsListening(true)

    r.onresult = (e) => {
      const tekst = e.results[0][0].transcript
      setIsListening(false)
      setFase('verwerken')
      voegBerichtToe('gebruiker', tekst)
      handler(tekst)
    }

    r.onerror = (e) => {
      setIsListening(false)
      if (e.error === 'aborted') return
      if (e.error === 'no-speech') {
        setFase('luisteren')
        setIsListening(true)
        setTimeout(() => {
          try { r.start() } catch (_) {}
        }, 300)
        return
      }
      voegBerichtToe('assistent', 'Kon je niet verstaan. Tik op de knop om opnieuw te proberen.')
      setFase('fout')
    }

    r.onend = () => setIsListening(false)

    try { r.start() } catch (_) {}
  }

  function stopLuisteren() {
    try { recognitionRef.current?.abort() } catch (_) {}
    setIsListening(false)
  }

  // ─── Gespreksflow ──────────────────────────────────────────────────────────

  function startGesprek() {
    setGesprek([])
    setConcept({ onderwerp: '', category_id: null, category_naam: '', due_date: null, toegewezen_aan: null })
    setOverzichtActies([])
    setStap('intent')
    vraagEnLuister('Wat wil je doen? Zeg "nieuwe actie" of "overzicht".', verwerkIntent)
  }

  function verwerkIntent(tekst) {
    const intent = detectIntent(tekst)
    if (intent === 'create') {
      setStap('onderwerp')
      vraagEnLuister('Goed. Wat is het onderwerp van de actie?', verwerkOnderwerp)
    } else if (intent === 'overview') {
      laadOverzicht()
    } else {
      vraagEnLuister('Ik begreep dat niet. Zeg "nieuwe actie" om een actie aan te maken, of "overzicht" voor een lijst.', verwerkIntent)
    }
  }

  function verwerkOnderwerp(tekst) {
    const onderwerp = tekst.trim()
    const huidigConcept = { onderwerp, category_id: null, category_naam: '', due_date: null, toegewezen_aan: null }
    setConcept(huidigConcept)
    huidigConceptRef.current = huidigConcept
    setStap('categorie')

    if (categoriesRef.current.length === 0) {
      vraagDeadline(huidigConcept)
      return
    }

    const catLijst = categoriesRef.current.map(c => c.name).join(', ')
    vraagEnLuister(
      `Wat is de categorie? Keuzes: ${catLijst}. Of zeg "geen".`,
      (t) => verwerkCategorie(t, huidigConcept)
    )
  }

  function verwerkCategorie(tekst, huidigConcept) {
    let bijgewerkt = { ...huidigConcept }

    if (isOverslaan(tekst)) {
      // geen categorie
    } else {
      const match = matchCategorie(tekst, categoriesRef.current)
      if (match) {
        bijgewerkt.category_id = match.id
        bijgewerkt.category_naam = match.name
        voegBerichtToe('assistent', `Categorie: ${match.name} ✓`)
      } else {
        vraagEnLuister(
          `"${tekst}" herkende ik niet. Probeer opnieuw of zeg "geen".`,
          (t) => verwerkCategorie(t, huidigConcept)
        )
        return
      }
    }

    setConcept(bijgewerkt)
    huidigConceptRef.current = bijgewerkt
    setStap('deadline')
    vraagDeadline(bijgewerkt)
  }

  function vraagDeadline(huidigConcept) {
    vraagEnLuister(
      'Wat is de deadline? Zeg "volgende week", een dagnaam, of een datum. Of "geen".',
      (t) => verwerkDeadline(t, huidigConcept)
    )
  }

  function verwerkDeadline(tekst, huidigConcept) {
    let bijgewerkt = { ...huidigConcept }

    if (!isOverslaan(tekst)) {
      const datum = parseDutchDate(tekst)
      if (datum) {
        bijgewerkt.due_date = datum
        voegBerichtToe('assistent', `Deadline: ${formatDisplayDate(datum)} ✓`)
      } else {
        vraagEnLuister(
          'Die datum begreep ik niet. Zeg "volgende week", een dagnaam of "15 maart". Of "geen".',
          (t) => verwerkDeadline(t, huidigConcept)
        )
        return
      }
    }

    setConcept(bijgewerkt)
    huidigConceptRef.current = bijgewerkt
    setStap('toewijzing')

    if (usersRef.current.length === 0) {
      opslaanActie(bijgewerkt)
      return
    }

    vraagEnLuister(
      'Voor wie is deze actie? Zeg een naam. Of "niemand" om het open te laten.',
      (t) => verwerkToewijzing(t, bijgewerkt)
    )
  }

  function verwerkToewijzing(tekst, huidigConcept) {
    let bijgewerkt = { ...huidigConcept }

    if (!isOverslaan(tekst)) {
      const match = matchGebruiker(tekst, usersRef.current)
      if (match === 'skip' || !match) {
        if (!match) {
          vraagEnLuister(
            `"${tekst}" vond ik niet. Probeer opnieuw of zeg "niemand".`,
            (t) => verwerkToewijzing(t, huidigConcept)
          )
          return
        }
      } else {
        bijgewerkt.toegewezen_aan = match.user_email
        voegBerichtToe('assistent', `Toegewezen aan: ${naamVanEmail(match.user_email)} ✓`)
      }
    }

    setConcept(bijgewerkt)
    opslaanActie(bijgewerkt)
  }

  async function opslaanActie(eindConcept) {
    setStap('bevestigen')
    setFase('opslaan')

    const { error } = await supabase.from('actions').insert({
      subject: eindConcept.onderwerp,
      tenant_id: TENANT_ID,
      status: 'Open',
      percent_delivery: 0,
      is_private: false,
      category_id: eindConcept.category_id || null,
      due_date: eindConcept.due_date || null,
      assigned_to_email: eindConcept.toegewezen_aan || null,
    })

    if (error) {
      voegBerichtToe('assistent', 'Opslaan mislukt: ' + error.message)
      setFase('fout')
    } else {
      voegBerichtToe('assistent', '✅ Actie opgeslagen!')
      setFase('klaar')
      spreekTekst('Actie is succesvol opgeslagen!')
    }
  }

  async function laadOverzicht() {
    setStap('overzicht')
    setFase('verwerken')
    voegBerichtToe('assistent', 'Even ophalen...')

    const { data, error } = await supabase
      .from('actions')
      .select('*')
      .eq('tenant_id', TENANT_ID)
      .eq('status', 'Open')
      .order('due_date', { ascending: true, nullsFirst: false })

    if (error) {
      voegBerichtToe('assistent', 'Kon acties niet laden.')
      setFase('fout')
      return
    }

    const acties = data || []
    setOverzichtActies(acties)
    setFase('overzicht')

    if (acties.length === 0) {
      voegBerichtToe('assistent', 'Er zijn geen open acties.')
      spreekTekst('Er zijn geen open acties.')
    } else {
      const msg = `Er zijn ${acties.length} open acties.`
      const preview = acties.slice(0, 3).map((a, i) => `${i + 1}: ${a.subject}`).join('. ')
      voegBerichtToe('assistent', msg)
      spreekTekst(msg + ' ' + preview)
    }
  }

  // ─── Knop-acties voor categorie / toewijzing ──────────────────────────────

  function kiesCategorie(cat, huidigConcept) {
    stopLuisteren()
    voegBerichtToe('gebruiker', cat.name)
    verwerkCategorie(cat.name, huidigConcept)
  }

  function kiesGebruiker(user, huidigConcept) {
    stopLuisteren()
    const naam = naamVanEmail(user.user_email)
    voegBerichtToe('gebruiker', naam)
    verwerkToewijzing(naam, huidigConcept)
  }

  function kiesGeen(veldnaam, huidigConcept) {
    stopLuisteren()
    voegBerichtToe('gebruiker', 'Geen')
    if (veldnaam === 'categorie') verwerkCategorie('geen', huidigConcept)
    else if (veldnaam === 'toewijzing') verwerkToewijzing('niemand', huidigConcept)
  }

  // ─── UI ───────────────────────────────────────────────────────────────────

  const toonCategorieKnoppen = stap === 'categorie' && fase === 'luisteren' && categories.length > 0
  const toonGebruikerKnoppen = stap === 'toewijzing' && fase === 'luisteren' && users.length > 0

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0f172a',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: '1.5rem 1rem 2rem',
      gap: '1.25rem',
    }}>

      {/* Header */}
      <div style={{ color: '#64748b', fontSize: '0.8rem', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 600 }}>
        LEAGL — Spraakassistent
      </div>

      {/* Gespreklog */}
      {gesprek.length > 0 && (
        <div
          ref={gesprekRef}
          style={{
            width: '100%',
            maxWidth: '480px',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.6rem',
            maxHeight: '35vh',
            overflowY: 'auto',
            paddingRight: '2px',
          }}
        >
          {gesprek.map(msg => (
            <div key={msg.id} style={{
              display: 'flex',
              justifyContent: msg.rol === 'gebruiker' ? 'flex-end' : 'flex-start',
            }}>
              <div style={{
                backgroundColor: msg.rol === 'gebruiker' ? '#2563eb' : '#1e293b',
                color: '#e2e8f0',
                borderRadius: msg.rol === 'gebruiker' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                padding: '0.6rem 1rem',
                maxWidth: '85%',
                fontSize: '0.95rem',
                lineHeight: '1.4',
              }}>
                {msg.tekst}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Microfoonknop (idle) */}
      {fase === 'idle' && (
        <button
          onClick={startGesprek}
          style={{
            width: '160px',
            height: '160px',
            borderRadius: '50%',
            border: 'none',
            cursor: 'pointer',
            backgroundColor: '#2563eb',
            boxShadow: '0 8px 32px rgba(37,99,235,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.15s ease',
            flexShrink: 0,
          }}
          onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
          onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <MicIcon size={64} />
        </button>
      )}

      {/* Luisterindicator */}
      {isListening && (
        <div style={{
          width: '160px',
          height: '160px',
          borderRadius: '50%',
          backgroundColor: '#ef4444',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'pulse 1.5s infinite',
          flexShrink: 0,
        }}>
          <MicIcon size={64} />
        </div>
      )}

      {/* Wachten/verwerken indicator */}
      {(fase === 'vragen' || fase === 'verwerken' || fase === 'opslaan') && !isListening && (
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          border: '3px solid #334155',
          borderTopColor: '#2563eb',
          animation: 'spin 1s linear infinite',
          flexShrink: 0,
        }} />
      )}

      {/* Succesindicator */}
      {fase === 'klaar' && (
        <div style={{
          width: '100px',
          height: '100px',
          borderRadius: '50%',
          backgroundColor: '#16a34a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      )}

      {/* Statustekst */}
      <div style={{ color: '#cbd5e1', fontSize: '1.1rem', fontWeight: 500, textAlign: 'center', minHeight: '1.5rem' }}>
        {fase === 'idle' && 'Tik om te beginnen'}
        {fase === 'vragen' && 'Luister...'}
        {fase === 'luisteren' && '🎙 Ik luister'}
        {fase === 'verwerken' && 'Even wachten...'}
        {fase === 'opslaan' && 'Opslaan...'}
        {fase === 'klaar' && 'Opgeslagen!'}
        {fase === 'fout' && '❌ Er ging iets mis'}
        {fase === 'overzicht' && `${overzichtActies.length} open acties`}
      </div>

      {/* Tap-om-te-antwoorden knop tijdens TTS */}
      {fase === 'vragen' && (
        <button
          onClick={() => {
            window.speechSynthesis?.cancel()
            if (huidigeHandlerRef.current) startLuisteren(huidigeHandlerRef.current)
          }}
          style={stijlKnopSecundair}
        >
          Tik om te antwoorden
        </button>
      )}

      {/* Categorie knoppen */}
      {toonCategorieKnoppen && (
        <div style={stijlKnoppenRij}>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => kiesCategorie(cat, huidigConceptRef.current)}
              style={stijlOptieKnop}
            >
              {cat.name}
            </button>
          ))}
          <button onClick={() => kiesGeen('categorie', huidigConceptRef.current)} style={stijlOptieKnopGrijs}>
            Geen categorie
          </button>
        </div>
      )}

      {/* Gebruiker knoppen */}
      {toonGebruikerKnoppen && (
        <div style={stijlKnoppenRij}>
          {users.map(u => (
            <button
              key={u.id}
              onClick={() => kiesGebruiker(u, huidigConceptRef.current)}
              style={stijlOptieKnop}
            >
              {naamVanEmail(u.user_email)}
            </button>
          ))}
          <button onClick={() => kiesGeen('toewijzing', huidigConceptRef.current)} style={stijlOptieKnopGrijs}>
            Niemand
          </button>
        </div>
      )}

      {/* Overzichtlijst */}
      {fase === 'overzicht' && overzichtActies.length > 0 && (
        <div style={{
          width: '100%',
          maxWidth: '480px',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          maxHeight: '45vh',
          overflowY: 'auto',
        }}>
          {overzichtActies.map(a => (
            <div key={a.id} style={{
              backgroundColor: '#1e293b',
              borderRadius: '10px',
              padding: '0.75rem 1rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              <div>
                <div style={{ color: '#e2e8f0', fontSize: '0.9rem' }}>{a.subject}</div>
                {a.assigned_to_email && (
                  <div style={{ color: '#64748b', fontSize: '0.78rem', marginTop: '2px' }}>
                    {naamVanEmail(a.assigned_to_email)}
                  </div>
                )}
              </div>
              {a.due_date && (
                <div style={{ color: '#94a3b8', fontSize: '0.78rem', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {formatDisplayDate(a.due_date)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Actieknop na afloop */}
      {(fase === 'klaar' || fase === 'fout' || fase === 'overzicht') && (
        <button
          onClick={() => { setFase('idle'); setStap(null); setGesprek([]) }}
          style={stijlKnopSecundair}
        >
          {fase === 'fout' ? 'Opnieuw proberen' : 'Nieuwe vraag'}
        </button>
      )}

      <style>{`
        @keyframes pulse {
          0%   { box-shadow: 0 0 0 0 rgba(239,68,68,0.5), 0 0 0 16px rgba(239,68,68,0.2); }
          70%  { box-shadow: 0 0 0 16px rgba(239,68,68,0.1), 0 0 0 32px rgba(239,68,68,0.05); }
          100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.5), 0 0 0 16px rgba(239,68,68,0.2); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

// ─── Stijlen ─────────────────────────────────────────────────────────────────

const stijlKnoppenRij = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.5rem',
  justifyContent: 'center',
  maxWidth: '480px',
}

const stijlOptieKnop = {
  padding: '0.5rem 1rem',
  borderRadius: '20px',
  border: '1px solid #334155',
  backgroundColor: '#1e293b',
  color: '#e2e8f0',
  cursor: 'pointer',
  fontSize: '0.9rem',
  fontFamily: 'system-ui, sans-serif',
}

const stijlOptieKnopGrijs = {
  ...stijlOptieKnop,
  backgroundColor: '#0f172a',
  border: '1px solid #475569',
  color: '#64748b',
}

const stijlKnopSecundair = {
  padding: '0.75rem 1.75rem',
  borderRadius: '10px',
  border: 'none',
  backgroundColor: '#1e293b',
  color: '#e2e8f0',
  fontSize: '1rem',
  cursor: 'pointer',
  fontFamily: 'system-ui, sans-serif',
}

function MicIcon({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  )
}
