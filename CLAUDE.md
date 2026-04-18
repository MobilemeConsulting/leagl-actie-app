# CLAUDE.md — Ontwikkelaarshandleiding voor AI-assistenten

Dit bestand helpt Claude (en andere AI-assistenten) om snel de codebase te begrijpen en correcte wijzigingen voor te stellen.

---

## Projectoverzicht

LEAGL Actie App is een **multi-tenant actiebeheerplatform** voor teams. Het is gebouwd in React + Vite, gebruikt Supabase voor database en authenticatie, en draait op Railway via Docker.

Eén deployment bedient meerdere klanten (tenants). Data-isolatie gebeurt in de **applicatielaag** via `tenant_id` — RLS is uitgeschakeld in Supabase.

---

## Commando's

```bash
npm run dev       # lokaal starten (http://localhost:5173)
npm run build     # productiebuild → dist/
npm run preview   # preview van de productiebuild
```

Build **moet altijd slagen** voor een commit. Controleer dit met `npm run build`.

---

## Bestandsstructuur

```
src/
├── App.jsx                    # Hoofdapp: routing, navigatie, CRUD-logica voor acties
├── main.jsx                   # React entry point + route definitie (/admin, /superadmin)
├── supabaseClient.js          # Supabase client voor ingelogde gebruiker (anon key)
├── adminSupabaseClient.js     # Supabase client met service_role key (admin operaties)
│
├── context/
│   └── TenantContext.jsx      # Tenant-state: welke organisatie is actief, rol van gebruiker
│
├── components/
│   ├── ActionCard.jsx         # Mobiele kaartweergave van één actie
│   ├── ActionTable.jsx        # Desktop tabelweergave van acties
│   ├── ActionForm.jsx         # Modal voor aanmaken / bewerken van actie
│   ├── AdminPage.jsx          # Dashboard-component (stats, grafieken) in de hoofdapp
│   ├── CategoryCombobox.jsx   # Categorie-selector met aanmaken-optie
│   ├── LoginPage.jsx          # Loginscherm (email/ww + SSO)
│   ├── StatusBadge.jsx        # Status-label component
│   ├── TeamPage.jsx           # Teamoverzicht per persoon
│   └── TenantPicker.jsx       # Keuzescherm bij meerdere tenants
│
├── pages/
│   ├── AdminDashboard.jsx     # Volledig admin panel (/admin): gebruikers (gesplitst pending/actief), acties, log
│   ├── SuperAdminDashboard.jsx # Superadmin panel (/superadmin): tenant & gebruikersbeheer, zoeken, audit log
│   └── VoicePage.jsx          # Spraakassistent (/voice): verbindt met ElevenLabs Conversational AI agent
│
└── hooks/
    ├── useActions.js          # (lichtgewicht hook — hoofd CRUD zit in App.jsx)
    └── useMicrosoftSync.js    # Microsoft Graph API integratie (To Do sync)

server.js                      # Express server: statische bestanden + API endpoints
```

---

## Architectuurbeslissingen

### Tenant-isolatie zonder RLS
RLS is uitgeschakeld. Alle queries filteren op `tenant_id` in de applicatielaag. Dit is een bewuste keuze voor eenvoud. **Voeg nooit een query toe zonder `.eq('tenant_id', tenant.id)`** tenzij het om een superadmin-operatie gaat.

### Twee Supabase clients
- `supabase` (anon key) → queries als ingelogde gebruiker, lees/schrijf acties, logs
- `adminSupabase` (service_role key) → auth.admin operaties (gebruikers aanmaken/verwijderen), tenant-beheer

Gebruik **altijd `adminSupabase`** voor `auth.admin.*` calls en voor schrijven vanuit het admin-panel.

### Admin-toegang via rollen
`/admin` is enkel toegankelijk voor gebruikers met `role = 'admin'` in `tenant_users`. Er is geen apart admin-wachtwoord (VITE_ADMIN_SECRET bestaat niet meer). De rol wordt gecontroleerd in `AdminDashboard.jsx` via `supabase.auth.getSession()` + query op `tenant_users`.

### Onboarding-status in gebruikerstabel (AdminDashboard)
De gebruikerstabel in `/admin` is opgesplitst in twee secties:
- **"Uitgenodigd — nog niet ingelogd"** — gebruikers met `last_sign_in_at = null`
- **"Actieve gebruikers"** — gebruikers die al ingelogd zijn

De kolom **Onboarding** toont drie statussen:
| Status | Voorwaarde |
|--------|------------|
| `Wacht op bevestiging` (oranje) | `email_confirmed_at = null` |
| `E-mail bevestigd` (indigo) | bevestigd maar `last_sign_in_at = null` |
| `Ingelogd` (groen) | `last_sign_in_at` aanwezig |

---

### Navigatievolgorde
Het startscherm van de hoofdapp is **Dashboard** (`view = 'admin'`). De volgorde in `NAV_ITEMS` (App.jsx) is: Dashboard → Actieve Acties → Afgerond → Team. Onderaan de sidebar staat ook een **"Spraakassistent"** knop die linkt naar `/voice`.

### Spraakassistent (/voice)
De voice pagina is een standalone route (geen auth vereist) die verbindt met een **ElevenLabs Conversational AI agent** via `@11labs/client`. De agent beheert het gesprek volledig (intent, vragen stellen, opslaan). De pagina zelf heeft nauwelijks logica — enkel verbinden/verbreken en UI-state tonen.

De agent roept drie webhook-endpoints aan in `server.js`:

| Endpoint | Methode | Doel |
|----------|---------|------|
| `/api/voice/opties` | GET | Categorieën + gebruikers ophalen |
| `/api/voice/actie` | POST | Nieuwe actie opslaan |
| `/api/voice/acties` | GET | Open acties ophalen |

**Hardcoded constanten in VoicePage.jsx:**
- `AGENT_ID = 'agent_4401km2r3djfeqvrvtwhepda4qqk'`
- Voice override: `DYvUSWzbIy47Jl54JlkE`
- `TENANT_ID` in `server.js` (zelfde als in de app)

**ElevenLabs agent configuratie** (via elevenlabs.io dashboard):
- System prompt instrueert de agent om in het Nederlands te werken
- Drie webhook tools gekoppeld aan de Railway URL
- Agent moet **gepubliceerd** zijn (Publish knop) anders weigert hij verbindingen

---

### SuperAdmin Panel (/superadmin)

Toegang via `VITE_SUPERADMIN_SECRET` (wachtwoord in sessionStorage). Vier tabs:

**Tenants tab**
- Tenants aanmaken (naam, slug, kleur, logo) en verwijderen
- Tenants bewerken via potlood-knop → modal (naam, slug, kleur, logo)
- Statistieken per tenant: aantal gebruikers, aantal acties, datum laatste activiteit
  - Stats worden geladen via `loadTenantStats()` bij opstarten (parallel ophalen van `tenant_users`, `actions`, `action_logs`)

**Gebruikers tab**
- Selecteer een tenant → toon alle gekoppelde gebruikers
- Nieuwe gebruiker aanmaken: account in Supabase Auth + koppeling + welkomstmail in één stap
- Bestaande gebruiker (al in Auth) koppelen aan tenant
- Per gebruiker drie acties:
  - **Sleutel** — wachtwoord resetten: genereert reset-link via `auth.admin.generateLink`, stuurt via Brevo
  - **Prullenbak** — volledig verwijderen: verwijdert uit Auth + alle `tenant_users` koppelingen
  - **X** — enkel ontkoppelen van de geselecteerde tenant

**Zoeken tab**
- Globale gebruikerszoekfunctie op e-mailadres (gedeeltelijk zoeken)
- Haalt alle auth-gebruikers op via `auth.admin.listUsers` + alle `tenant_users`
- Toont: e-mail, aanmaakdatum, laatste login, alle tenants + rol
- Zelfde reset- en verwijderknoppen als in de Gebruikers tab

**Audit Log tab**
- Toont de laatste 200 regels uit `action_logs` over alle tenants
- Filterbaar per tenant
- Kolommen: tijdstip, tenant, actie/onderwerp, gewijzigd door, type wijziging, oud, nieuw
- Tenant naam wordt opgezocht uit de lokale `tenants` state

---

## Database schema

```sql
tenants (
  id uuid PK,
  name text,
  slug text UNIQUE,
  primary_color text,    -- hex kleurcode voor branding
  logo_url text,
  created_at timestamptz
)

tenant_users (
  id uuid PK,
  tenant_id uuid FK → tenants,
  user_id uuid,          -- Supabase auth user id
  user_email text,
  role text              -- 'member' | 'admin'
)

actions (
  id uuid PK,
  tenant_id uuid FK → tenants,
  subject text NOT NULL,
  category_id uuid FK → categories,
  status text            -- 'Open' | 'In Progress' | 'Completed'
  percent_delivery int   -- 0–100, stappen van 10
  due_date date,
  assigned_to_email text,
  is_private boolean,
  outlook_task_id text,  -- Microsoft To Do sync ID
  needs_reassignment boolean,  -- true als eigenaar verwijderd is
  completed_at timestamptz,
  created_at timestamptz
)

categories (
  id uuid PK,
  tenant_id uuid FK → tenants,
  name text NOT NULL,
  created_at timestamptz
)

action_logs (
  id uuid PK,
  tenant_id uuid FK → tenants,
  action_id uuid,            -- null bij gebruikersgebeurtenissen
  action_subject text,       -- actie-onderwerp OF e-mail van uitgenodigde gebruiker
  changed_by_email text,
  change_type text,          -- zie hieronder
  old_value text,
  new_value text,
  created_at timestamptz
)
```

### `change_type` waarden in `action_logs`

| Waarde | Soort |
|--------|-------|
| `aangemaakt` | Actie |
| `verwijderd` | Actie |
| `status` | Actie |
| `voortgang` | Actie |
| `onderwerp` | Actie |
| `categorie` | Actie |
| `deadline` | Actie |
| `toegewezen aan` | Actie |
| `privé` | Actie |
| `uitnodiging verstuurd` | Gebruiker |
| `gebruiker verwijderd` | Gebruiker |
| `gebruiker gedeactiveerd` | Gebruiker |
| `gebruiker geactiveerd` | Gebruiker |

---

## Belangrijke patronen

### Voortgang (percent_delivery)
- Altijd in stappen van 10 (0, 10, 20, … 100)
- UI: +/− knoppen in `ActionTable.jsx` en `ActionCard.jsx`
- Bij status → `Completed`: automatisch op 100 gezet in `handleUpdateStatus` (App.jsx)
- `useEffect` in beide componenten synct `localProgress` wanneer `action.percent_delivery` van buiten verandert

### Deadline-waarschuwingen
- Helper `getDaysUntilDeadline(dateStr)` in `ActionCard.jsx` en `ActionTable.jsx`
- ≤ 3 dagen: oranje + `AlertTriangle` icoon
- Verlopen (< 0 dagen): rood + `AlertTriangle` icoon

### Filters in de actieweergave (App.jsx)
- `filterSubject` (tekst), `filterCategory` (uuid), `filterStatus` (string)
- Worden gereset bij wisselen van navigatie-tab (`handleSetView`)
- Worden toegepast bovenop de view-filter (open/afgerond)

### Optimistische UI-updates
Statuswijzigingen en voortgang worden direct in de lokale state bijgewerkt (via `setActions`) en pas daarna naar Supabase gestuurd. Geen reload nodig.

### E-mail (Brevo)
Drie soorten mails:
1. **Actie toegewezen** — `sendAssignmentEmail()` in `App.jsx`
2. **Welkomstmail** — `sendWelcomeEmail()` in `AdminDashboard.jsx`
3. **Herinneringsmail** — `scripts/reminder.js` (Node script, manueel of via cron)

Het afzenderadres staat hardcoded als `SENDER`-constante in elk bestand. Bij een nieuwe klant aanpassen.

---

## Wat NIET te doen

- **Geen RLS aanzetten** zonder de filtering-logica te herzien — dit zou data lekken tussen tenants of queries breken
- **Geen `setActions` vergeten** na een update — de app gebruikt lokale state, geen automatische refetch
- **Niet `supabase` gebruiken voor admin-operaties** — gebruik altijd `adminSupabase` voor `auth.admin.*` en schrijven vanuit `/admin`
- **Geen nieuwe navigatie-items toevoegen** zonder de `view !== 'admin' && view !== 'team'` checks in App.jsx te controleren — die bepalen of de filter-bar en "Nieuwe Actie"-knop zichtbaar zijn
- **Geen vrije getallen in percent_delivery opslaan** — altijd afronden naar de dichtstbijzijnde 10

---

## Deployment (Railway)

De app bouwt via een **multi-stage Dockerfile**:
1. Node 20 alpine → `npm install` + `npm run build` (Vite build)
2. Tweede stage → serveert `dist/` via Express (`server.js`)

Alle `VITE_*` variabelen worden doorgegeven als Docker build args en gebakken in de bundle bij buildtijd. Een wijziging in env-variabelen vereist een **nieuwe deploy** (geen runtime herstart).

**Vereiste env-variabelen:**

| Variable | Doel |
|----------|------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key |
| `VITE_SUPABASE_SERVICE_KEY` | Supabase service_role key |
| `VITE_BREVO_API_KEY` | Brevo API key |
| `VITE_APP_URL` | Publieke URL (voor e-maillinks en OAuth redirects) |
| `VITE_SUPERADMIN_SECRET` | Wachtwoord voor `/superadmin` toegang |
| `SIRI_TOKEN` | Token voor Siri/shortcut integratie (optioneel) |

**Deploy commando** (Railway is niet gekoppeld aan GitHub, deploy via CLI):
```bash
railway up
```

---

## Relevante externe diensten

| Dienst | Doel | Configuratie |
|--------|------|-------------|
| Supabase | Database, Auth, Storage | Project URL + keys in env vars |
| Brevo | Transactionele e-mail | API key in `VITE_BREVO_API_KEY` |
| Railway | Hosting + CI/CD | Deploy via `railway up` (niet via GitHub) |
| Microsoft Graph | To Do synchronisatie | OAuth flow via `useMicrosoftSync.js` |
| ElevenLabs | Spraakassistent (TTS + conversatie) | Agent ID hardcoded in `VoicePage.jsx`, API key hardcoded (`EL_API_KEY`). Agent beheren via elevenlabs.io dashboard. |
