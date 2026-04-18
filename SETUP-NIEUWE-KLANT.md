# Setup checklist — nieuwe klant onboarden

De app is multi-tenant: één deployment, meerdere klanten. Je voegt een nieuwe klant toe via het **Superadmin panel** (`/superadmin`). Geen nieuwe Railway deploy nodig.

---

## Overzicht

Een nieuwe klant toevoegen gaat in drie stappen:

1. **Tenant aanmaken** in `/superadmin` → Tenants
2. **Eerste admin aanmaken** in `/superadmin` → Gebruikers
3. **Categorieën instellen** via SQL of via de app

---

## Stap 1: Tenant aanmaken

1. Surf naar `https://<railway-url>/superadmin`
2. Log in met het superadmin wachtwoord (`VITE_SUPERADMIN_SECRET`)
3. Ga naar **Tenants** → vul in:
   - **Naam**: volledige bedrijfsnaam (bv. "Acme BV")
   - **Slug**: unieke korte identifier (bv. "acme") — wordt gebruikt voor routing
   - **Kleur**: primaire merkkleur in hex (bv. `#C8A96E`)
   - **Logo URL**: optioneel, directe URL naar het logo
4. Klik **Aanmaken**

De tenant is nu zichtbaar in de tabel met statistieken (gebruikers, acties, laatste activiteit).

---

## Stap 2: Eerste admin aanmaken

1. Ga naar **Gebruikers** → selecteer de nieuwe tenant
2. Klik **Nieuwe gebruiker aanmaken**:
   - Naam, e-mailadres, rol = **Admin**
3. Klik **Aanmaken + uitnodigen**

Dit doet in één stap:
- Account aanmaken in Supabase Auth (tijdelijk wachtwoord gegenereerd)
- Koppelen aan de tenant met rol `admin`
- Welkomstmail sturen via Brevo met inloggegevens

De admin kan nu inloggen op `https://<railway-url>/admin` en zelf teamleden uitnodigen.

---

## Stap 3: Categorieën instellen (optioneel)

Categorieën zijn tenant-specifiek en worden aangemaakt in de app zelf (via de actie-invoer). Je kunt ook standaardcategorieën vooraf aanmaken via SQL:

```sql
INSERT INTO categories (id, tenant_id, name, created_at)
VALUES
  (gen_random_uuid(), '<tenant-uuid>', 'HR & Personeel',         now()),
  (gen_random_uuid(), '<tenant-uuid>', 'Finance & Boekhouding',  now()),
  (gen_random_uuid(), '<tenant-uuid>', 'Verkoop & CRM',          now()),
  (gen_random_uuid(), '<tenant-uuid>', 'Marketing',              now()),
  (gen_random_uuid(), '<tenant-uuid>', 'IT & Systemen',          now()),
  (gen_random_uuid(), '<tenant-uuid>', 'Operations',             now()),
  (gen_random_uuid(), '<tenant-uuid>', 'Juridisch & Compliance', now()),
  (gen_random_uuid(), '<tenant-uuid>', 'Management',             now());
```

Vervang `<tenant-uuid>` door het ID uit de tenants-tabel (zichtbaar in Supabase → Table Editor).

---

## Stap 4: Brevo afzenderadres instellen

E-mails worden verstuurd via Brevo. Het afzenderadres staat hardcoded in de code:

| Bestand | Constante |
|---------|-----------|
| `src/pages/AdminDashboard.jsx` | `SENDER` |
| `src/pages/SuperAdminDashboard.jsx` | `SENDER` |
| `src/App.jsx` | `SENDER` |

Als je een ander afzenderadres wil per klant: pas de `SENDER` constante aan en deploy opnieuw. Als je een verified domain hebt in Brevo, kan elk adres op dat domain gebruikt worden zonder individuele verificatie.

---

## Stap 5: Oplevering checklist

- [ ] Tenant aangemaakt met juiste naam, slug en merkkleur
- [ ] Eerste admin uitgenodigd en welkomstmail ontvangen
- [ ] Admin heeft ingelogd en wachtwoord gewijzigd
- [ ] Standaardcategorieën ingesteld
- [ ] Microsoft SSO geconfigureerd indien gewenst (via Supabase Auth → Providers)
- [ ] Test: actie aanmaken, status wijzigen, e-mail ontvangen

---

## Eerste keer: deployment opzetten

Als je de app voor het eerst deployt (nieuw Railway project), volg dan deze stappen.

### 1. Supabase project aanmaken

1. Ga naar [supabase.com](https://supabase.com) → New project
2. Kies een naam (bv. `leagl-platform`) en een sterk database wachtwoord
3. Wacht tot project klaar is (~2 min)
4. Ga naar **SQL Editor** en voer onderstaande SQL uit:

```sql
-- Tenants
CREATE TABLE tenants (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  primary_color text DEFAULT '#C8A96E',
  logo_url text,
  created_at timestamptz DEFAULT now()
);

-- Tenant-gebruikersgekoppelingen
CREATE TABLE tenant_users (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  user_email text NOT NULL,
  role text DEFAULT 'member',
  created_at timestamptz DEFAULT now()
);

-- Categorieën (per tenant)
CREATE TABLE categories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Acties (per tenant)
CREATE TABLE actions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  subject text NOT NULL,
  category_id uuid REFERENCES categories(id),
  status text DEFAULT 'Open',
  percent_delivery int DEFAULT 0,
  due_date date,
  assigned_to_email text,
  is_private boolean DEFAULT false,
  outlook_task_id text,
  needs_reassignment boolean DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Activiteitenlog (per tenant)
CREATE TABLE action_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  action_id uuid,
  action_subject text,
  changed_by_email text,
  change_type text,
  old_value text,
  new_value text,
  created_at timestamptz DEFAULT now()
);

-- RLS uitschakelen (isolatie via applicatielaag met tenant_id)
ALTER TABLE tenants       DISABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_users  DISABLE ROW LEVEL SECURITY;
ALTER TABLE categories    DISABLE ROW LEVEL SECURITY;
ALTER TABLE actions       DISABLE ROW LEVEL SECURITY;
ALTER TABLE action_logs   DISABLE ROW LEVEL SECURITY;
```

5. Ga naar **Project Settings → API** en noteer:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public` key → `VITE_SUPABASE_ANON_KEY`
   - `service_role` key → `VITE_SUPABASE_SERVICE_KEY`

6. Ga naar **Authentication → URL Configuration**:
   - Site URL → Railway URL (zie stap 3)
   - Redirect URLs → zelfde Railway URL

### 2. Microsoft OAuth instellen (optioneel)

1. Ga naar [portal.azure.com](https://portal.azure.com) → App registrations → New registration
2. Authorized redirect URI: `https://<supabase-project-id>.supabase.co/auth/v1/callback`
3. Kopieer Application (client) ID en een Client Secret
4. In Supabase → Authentication → Providers → Azure → inschakelen + keys invullen

### 3. Google OAuth instellen (optioneel)

1. Ga naar [console.cloud.google.com](https://console.cloud.google.com) → OAuth 2.0 Client ID (Web application)
2. Authorized redirect URI: `https://<supabase-project-id>.supabase.co/auth/v1/callback`
3. In Supabase → Authentication → Providers → Google → inschakelen + keys invullen

### 4. Railway service aanmaken

1. Ga naar [railway.app](https://railway.app) → New Project → Empty Project
2. Klik **+ New Service** → voeg de GitHub repo toe
3. Railway detecteert automatisch de Dockerfile
4. Ga naar de service → **Variables** → voeg toe:

| Variable | Waarde |
|----------|--------|
| `VITE_SUPABASE_URL` | Supabase Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key |
| `VITE_SUPABASE_SERVICE_KEY` | Supabase service_role key |
| `VITE_BREVO_API_KEY` | Brevo API key |
| `VITE_APP_URL` | Railway URL (na stap 5 invullen) |
| `VITE_SUPERADMIN_SECRET` | Zelf te kiezen sterk wachtwoord |

5. Klik **Deploy** → wacht tot build klaar is (~3 min)
6. Ga naar **Settings → Networking → Generate Domain**
7. Kopieer de Railway URL en stel die in als `VITE_APP_URL` + als Site URL in Supabase
8. Nieuwe deploy om `VITE_APP_URL` te activeren: `railway up`

### 5. Eerste superadmin login

1. Surf naar `https://<railway-url>/superadmin`
2. Log in met `VITE_SUPERADMIN_SECRET`
3. Maak de eerste tenant aan (zie Stap 1 hierboven)
4. Maak jezelf aan als eerste admin (zie Stap 2 hierboven)

---

## Kosten inschatting

| Service | Plan | Kost |
|---------|------|------|
| Railway | Hobby | ~$5/maand |
| Supabase | Free tier | €0 (tot 50.000 MAU) |
| Brevo | Free tier | €0 (tot 300 mails/dag) |
| **Totaal** | | **~$5/maand voor alle tenants samen** |
