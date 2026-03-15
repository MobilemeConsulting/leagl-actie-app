# LEAGL Actie App

Een multi-tenant actiebeheertool gebouwd op React, Supabase en Railway.

---

## Routes

| URL | Beschrijving | Toegang |
|-----|-------------|---------|
| `/` | Hoofdapp — acties beheren, team, stats | Ingelogde gebruikers |
| `/admin` | Tenant admin panel — gebruikers, acties, audit log | `VITE_ADMIN_SECRET` |
| `/superadmin` | Superadmin — tenants en tenant-gebruikers beheren | `VITE_SUPERADMIN_SECRET` |

---

## Architectuur

### Multi-tenant
- Eén Supabase project + één Railway deployment bedient meerdere klanten.
- Elke klant is een **tenant** (`tenants` tabel).
- Gebruikers zijn gekoppeld via de `tenant_users` junction tabel.
- Data (acties, categorieën, logs) wordt gefilterd op `tenant_id` in de applicatie. RLS is uitgeschakeld.
- Na inloggen selecteert de app automatisch de juiste tenant. Als een gebruiker tot meerdere tenants behoort, verschijnt een keuzescherm.

### Database tabellen
| Tabel | Beschrijving |
|-------|-------------|
| `tenants` | Klantorganisaties (slug, naam, kleur, logo) |
| `tenant_users` | Koppeling gebruiker ↔ tenant + rol |
| `actions` | Acties (met `tenant_id`) |
| `categories` | Categorieën (met `tenant_id`) |
| `action_logs` | Audit log van wijzigingen (met `tenant_id`) |

---

## /admin — Tenant Admin Panel

Bereikbaar op `https://<jouw-url>/admin`

- Inloggen met `VITE_ADMIN_SECRET`
- **Dashboard**: statistieken per categorie en persoon
- **Gebruikers**: aanmaken (met welkomstmail), deactiveren, wachtwoord resetten, verwijderen
- **Alle acties**: overzicht + CSV export, filterbaar op status
- **Audit Log**: wie heeft wat gewijzigd en wanneer
- **Tenant selector**: dropdown in de topbar om data per tenant te filteren

### Nieuwe gebruiker aanmaken via /admin
1. Ga naar **Gebruikers** tab
2. Vul naam + e-mailadres in
3. Wachtwoord is optioneel — leeglaten = automatisch gegenereerd
4. Gebruiker ontvangt een welkomstmail met tijdelijk wachtwoord
5. Bij eerste login wordt gevraagd een persoonlijk wachtwoord in te stellen

---

## /superadmin — Super Admin Panel

Bereikbaar op `https://<jouw-url>/superadmin`

- Inloggen met `VITE_SUPERADMIN_SECRET` (apart van admin secret)
- Uitsluitend voor Frederiek / de beheerder van de licenties

### Tenants tab
- Nieuwe tenant aanmaken: naam, slug (uniek), accentkleur, logo URL
- Bestaande tenants verwijderen

### Gebruikers tab
- Selecteer een tenant
- Voeg een bestaande Supabase Auth-gebruiker toe aan een tenant (op e-mailadres)
- Verwijder een gebruiker uit een tenant
- Rol instellen: `member` of `admin`

> **Tip**: Maak eerst de gebruiker aan via `/admin → Gebruikers`, dan voeg je hem toe aan de juiste tenant via `/superadmin → Gebruikers`.

---

## Nieuwe klant deployen

Zie **[SETUP-NIEUWE-KLANT.md](./SETUP-NIEUWE-KLANT.md)** voor de volledige stap-voor-stap checklist.

Kort samengevat:
1. SQL uitvoeren in Supabase (tabellen + migratie)
2. Railway service aanmaken vanuit deze repo
3. Omgevingsvariabelen instellen (zie hieronder)
4. `/superadmin` → nieuwe tenant aanmaken
5. `/admin` → eerste gebruikers aanmaken en koppelen

---

## Omgevingsvariabelen

| Variable | Beschrijving |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `VITE_SUPABASE_SERVICE_KEY` | Supabase service_role key (voor admin operaties) |
| `VITE_ADMIN_SECRET` | Wachtwoord voor `/admin` |
| `VITE_SUPERADMIN_SECRET` | Wachtwoord voor `/superadmin` |
| `VITE_BREVO_API_KEY` | Brevo transactionele e-mail API key |
| `VITE_APP_URL` | Publieke URL van de app (voor links in mails) |

---

## Tech stack

- **Frontend**: React 18 + Vite
- **Database & Auth**: Supabase (PostgreSQL)
- **E-mail**: Brevo (transactionele mails)
- **Hosting**: Railway (Dockerfile builder)
- **Icons**: Lucide React

---

## Lokaal ontwikkelen

```bash
npm install
cp .env.example .env.local   # vul je Supabase keys in
npm run dev
```

App draait op `http://localhost:5173`
Admin panel: `http://localhost:5173/admin`
Superadmin: `http://localhost:5173/superadmin`
