# LEAGL Actie App

Multi-tenant actiebeheerplatform voor teams. Gebouwd in React + Vite, Supabase als backend, gehost op Railway.

## Wat het doet

- Acties aanmaken, toewijzen en opvolgen per team
- Voortgang bijhouden (0–100% in stappen van 10)
- Categorieën, deadlines, privé-acties
- Teamoverzicht per persoon
- Admin panel: gebruikersbeheer, uitnodigingen, activiteitenlog
- **Spraakassistent** via ElevenLabs: acties aanmaken of opvragen via stem

## Starten

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # productiebuild
```

## Deployen

Railway CLI (niet via GitHub):
```bash
railway up
```

## Routes

| Route | Beschrijving |
|-------|-------------|
| `/` | Hoofdapp (login vereist) |
| `/voice` | Spraakassistent (geen login) |
| `/admin` | Admin panel (role = admin) |
| `/superadmin` | Superadmin panel |

## Spraakassistent

De `/voice` pagina verbindt met een ElevenLabs Conversational AI agent. De agent kan:
- Een nieuwe actie aanmaken (vraagt onderwerp, categorie, deadline, toewijzing)
- Een overzicht geven van open acties

De agent roept drie endpoints aan op de Express server (`/api/voice/*`).

> Agent configureren: ga naar elevenlabs.io → Agents → "Actielijst Leagl management". Vergeet niet te **publishen** na wijzigingen.

## Tech stack

| Laag | Technologie |
|------|------------|
| Frontend | React 18 + Vite |
| Backend | Express (server.js) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| E-mail | Brevo |
| Spraak | ElevenLabs Conversational AI |
| Hosting | Railway |

## Omgevingsvariabelen

```env
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_SUPABASE_SERVICE_KEY
VITE_BREVO_API_KEY
VITE_APP_URL
SIRI_TOKEN
```
