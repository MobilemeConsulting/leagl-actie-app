# LEAGL Actie App

Multi-tenant actiebeheerplatform voor teams. Gebouwd in React + Vite, Supabase als backend, gehost op Railway via Docker.

Eén deployment bedient meerdere klanten (tenants). Data-isolatie via `tenant_id` in de applicatielaag.

---

## Wat het doet

**Voor teamleden:**
- Acties aanmaken, toewijzen en opvolgen
- Voortgang bijhouden (0–100% in stappen van 10)
- Categorieën, deadlines, privé-acties
- Teamoverzicht per persoon
- Microsoft To Do synchronisatie (via Graph API)
- Spraakassistent via ElevenLabs: acties aanmaken of opvragen via stem

**Admin panel (`/admin`):**
- Gebruikersbeheer: uitnodigingen, deactiveren, wachtwoord resetten
- Volledig actieoverzicht met CSV-export
- Activiteitenlog (audit log) van alle wijzigingen

**Superadmin panel (`/superadmin`):**
- Tenantbeheer: aanmaken, bewerken (naam, slug, kleur, logo), verwijderen
- Statistieken per tenant (aantal gebruikers, acties, laatste activiteit)
- Gebruikersbeheer: nieuwe gebruikers aanmaken en koppelen aan een tenant
- Globale gebruikerszoekfunctie (op e-mail, toont alle tenant-koppelingen)
- Wachtwoord resetten via e-mail (gegenereerde link via Brevo)
- Gebruiker volledig verwijderen uit Supabase Auth
- Cross-tenant audit log (alle `action_logs` over alle tenants)

---

## Starten

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # productiebuild
```

---

## Routes

| Route | Beschrijving | Toegang |
|-------|-------------|---------|
| `/` | Hoofdapp (acties, team, dashboard) | Ingelogd |
| `/voice` | Spraakassistent | Geen login |
| `/admin` | Admin panel | role = admin |
| `/superadmin` | Superadmin panel | `VITE_SUPERADMIN_SECRET` |

---

## Deployen

Railway CLI (niet via GitHub — deploy via CLI):

```bash
railway up
```

Alle `VITE_*` variabelen worden gebakken in de bundle bij buildtijd. Een wijziging in env-variabelen vereist een nieuwe deploy.

---

## Omgevingsvariabelen

| Variable | Doel |
|----------|------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key (ingelogde gebruiker) |
| `VITE_SUPABASE_SERVICE_KEY` | Supabase service_role key (admin operaties) |
| `VITE_BREVO_API_KEY` | Brevo API key voor transactionele e-mail |
| `VITE_APP_URL` | Publieke URL van de app (voor e-maillinks) |
| `VITE_SUPERADMIN_SECRET` | Wachtwoord voor toegang tot `/superadmin` |
| `SIRI_TOKEN` | Token voor Siri/shortcut integratie (optioneel) |

---

## Spraakassistent

De `/voice` pagina verbindt met een ElevenLabs Conversational AI agent. De agent kan:
- Een nieuwe actie aanmaken (vraagt onderwerp, categorie, deadline, toewijzing)
- Een overzicht geven van open acties

De agent roept drie endpoints aan op de Express server (`/api/voice/*`).

> Agent configureren: ga naar elevenlabs.io → Agents. Vergeet niet te **publishen** na wijzigingen.

---

## Tech stack

| Laag | Technologie |
|------|------------|
| Frontend | React 18 + Vite |
| Backend | Express (`server.js`) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| E-mail | Brevo |
| Spraak | ElevenLabs Conversational AI |
| Hosting | Railway (Docker) |
| To Do sync | Microsoft Graph API |
