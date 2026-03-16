# LEAGL Actie App

Een multi-tenant actiebeheerplatform gebouwd op React, Supabase en Railway. Teams kunnen acties aanmaken, toewijzen, opvolgen en afronden — met e-mailnotificaties, voortgangsrapportage en een volledig auditspoor.

---

## Routes

| URL | Beschrijving | Toegang |
|-----|-------------|---------|
| `/` | Hoofdapp — acties beheren, team, dashboard | Ingelogde gebruikers |
| `/admin` | Tenant admin panel — gebruikers, acties, activiteitenlog | Gebruikers met rol `admin` |
| `/superadmin` | Superadmin — tenants en tenant-gebruikers beheren | `VITE_SUPERADMIN_SECRET` |

> `/admin` vereist **geen apart wachtwoord** meer — toegang is gebaseerd op de `admin`-rol in `tenant_users`.

---

## Functionaliteiten

### Hoofdapp (`/`)

**Dashboard** (startscherm)
- Statistieken: totaal, open, in behandeling, afgerond, gemiddelde voortgang, actieve teamleden
- Grafieken: acties per categorie, acties per persoon, statusverdeling

**Actieve Acties & Afgerond**
- Filterbaar op **onderwerp** (tekst), **categorie** en **status**
- Voortgang aanpassen via **+/− knoppen** in stappen van 10%
- Bij status **Afgerond** → voortgang wordt automatisch op **100%** gezet
- **Deadline waarschuwingen**: oranje label bij ≤ 3 dagen resterend, rood bij verlopen deadline
- Desktop: tabelweergave | Mobiel: kaartweergave

**Nieuwe actie aanmaken**
- Velden: onderwerp, categorie, status, % afgerond, deadline, toewijzen aan, privé
- Bij toewijzing: automatische notificatiemail via Brevo
- Microsoft To Do synchronisatie (optioneel, via OAuth)

**Team**
- Overzicht teamleden met aantal open / afgeronde acties
- Uitnodigingen versturen

---

### Admin Panel (`/admin`)

**Toegang**: gebruikers met `role = 'admin'` in `tenant_users` (inloggen via standaard app-login).

**Dashboard**
- Dezelfde statistieken als de hoofdapp, maar voor alle acties van de tenant

**Gebruikers**
- Nieuwe gebruiker aanmaken met tijdelijk wachtwoord + automatische welkomstmail
- Kolom **Onboarding**: toont of de gebruiker al ingelogd heeft (Ingelogd / Nog niet ingelogd)
- Gebruiker deactiveren / heractiveren
- Wachtwoord resetten
- Gebruiker verwijderen (open acties worden gemarkeerd als "Eigenaar ontbreekt")

**Alle acties**
- Volledig overzicht met filter op status + zoekterm
- CSV export

**Activiteitenlog**
- Filter: **Alle activiteit** | **Actie wijzigingen** | **Gebruikers & Uitnodigingen**
- Gelogde acties: status, voortgang, onderwerp, categorie, toewijzing, aangemaakt, verwijderd
- Gelogde gebruikersgebeurtenissen: uitnodiging verstuurd, gebruiker verwijderd, gedeactiveerd, geactiveerd
- Bij uitnodigingsrijen: live **onboarding-status** (Onboarded / Nog niet ingelogd)

---

### Superadmin Panel (`/superadmin`)

Uitsluitend voor de platformbeheerder (Frederiek).

**Tenants**
- Nieuwe tenant aanmaken: naam, slug (uniek), accentkleur, logo URL
- Tenants verwijderen

**Gebruikers**
- Gebruiker toevoegen aan / verwijderen uit een tenant
- Rol instellen: `member` of `admin`

---

## Architectuur

### Multi-tenant model
- Één Supabase project + één Railway deployment bedient meerdere klanten
- Elke klant is een **tenant** (`tenants` tabel)
- Gebruikers zijn gekoppeld via `tenant_users` (met `role`: `member` | `admin`)
- Alle data (acties, categorieën, logs) heeft een `tenant_id` kolom
- Tenant-isolatie wordt afgedwongen in de **applicatielaag** — RLS is uitgeschakeld
- Na inloggen kiest de app automatisch de juiste tenant; bij meerdere tenants verschijnt een keuzescherm

### Database schema

| Tabel | Beschrijving |
|-------|-------------|
| `tenants` | Klantorganisaties (slug, naam, accentkleur, logo_url) |
| `tenant_users` | Koppeling gebruiker ↔ tenant + rol |
| `actions` | Acties (tenant_id, subject, status, percent_delivery, due_date, …) |
| `categories` | Categorieën per tenant |
| `action_logs` | Activiteitenlog: actie-wijzigingen én gebruikersgebeurtenissen (tenant_id) |

### Twee Supabase clients
| Client | Bestand | Gebruik |
|--------|---------|---------|
| `supabase` | `supabaseClient.js` | Ingelogde gebruiker — RLS-gefilterde queries |
| `adminSupabase` | `adminSupabaseClient.js` | Service role key — admin operaties, user management |

---

## Omgevingsvariabelen

| Variable | Beschrijving |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `VITE_SUPABASE_SERVICE_KEY` | Supabase service_role key (admin operaties) |
| `VITE_SUPERADMIN_SECRET` | Wachtwoord voor `/superadmin` |
| `VITE_BREVO_API_KEY` | Brevo transactionele e-mail API key |
| `VITE_APP_URL` | Publieke URL van de app (voor links in mails) |

> `VITE_ADMIN_SECRET` is **niet langer nodig** — admin-toegang loopt via Supabase-rollen.

---

## Tech stack

| Laag | Technologie |
|------|------------|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS + inline styles |
| Database & Auth | Supabase (PostgreSQL) |
| E-mail | Brevo (transactionele mails) |
| Taaksynchronisatie | Microsoft Graph API (To Do) |
| Hosting | Railway (Dockerfile) |
| Icons | Lucide React |

---

## Lokaal ontwikkelen

```bash
npm install
cp .env.example .env.local   # vul je Supabase keys in
npm run dev
```

| URL | Omschrijving |
|-----|-------------|
| `http://localhost:5173` | Hoofdapp |
| `http://localhost:5173/admin` | Admin panel |
| `http://localhost:5173/superadmin` | Superadmin |

---

## Nieuwe klant deployen

Zie **[SETUP-NIEUWE-KLANT.md](./SETUP-NIEUWE-KLANT.md)** voor de volledige stap-voor-stap checklist.

Kort samengevat:
1. SQL uitvoeren in Supabase (tabellen aanmaken)
2. Railway service aanmaken vanuit deze repo
3. Omgevingsvariabelen instellen in Railway
4. `/superadmin` → nieuwe tenant aanmaken
5. `/admin` → eerste gebruikers aanmaken en uitnodigen

---

## Kosten per klant/maand (inschatting)

| Service | Plan | Kost |
|---------|------|------|
| Railway | Hobby | ~$5 |
| Supabase | Free tier | €0 (tot 50.000 MAU) |
| Brevo | Free tier | €0 (tot 300 mails/dag) |
| **Totaal** | | **~$5/maand** |
