# Setup checklist — nieuwe klant

## 1. Supabase project aanmaken

1. Ga naar [supabase.com](https://supabase.com) → New project
2. Kies een naam (bv. `leagl-klantnaam`) en een sterk database wachtwoord
3. Wacht tot project klaar is (~2 min)
4. Ga naar **SQL Editor** en voer onderstaande SQL uit:

```sql
-- Tabellen aanmaken
CREATE TABLE categories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE actions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  subject text NOT NULL,
  category_id uuid REFERENCES categories(id),
  status text DEFAULT 'Open',
  percent_delivery int DEFAULT 0,
  due_date date,
  assigned_to_email text,
  is_private boolean DEFAULT false,
  outlook_task_id text,
  completed_at timestamptz,
  needs_reassignment boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE action_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  action_id uuid,
  action_subject text,
  changed_by_email text,
  change_type text,
  old_value text,
  new_value text,
  created_at timestamptz DEFAULT now()
);

-- RLS uitschakelen
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE actions DISABLE ROW LEVEL SECURITY;
ALTER TABLE action_logs DISABLE ROW LEVEL SECURITY;

-- Standaard categorieën (optioneel)
INSERT INTO categories (name) VALUES
  ('HR & Personeel'),
  ('Finance & Boekhouding'),
  ('Verkoop & CRM'),
  ('Marketing'),
  ('IT & Systemen'),
  ('Operations'),
  ('Juridisch & Compliance'),
  ('Management');
```

5. Ga naar **Project Settings → API** en noteer:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public` key → `VITE_SUPABASE_ANON_KEY`
   - `service_role` key → `VITE_SUPABASE_SERVICE_KEY`

6. Ga naar **Authentication → URL Configuration**:
   - Site URL → Railway URL van de klant (zie stap 3)
   - Redirect URLs → zelfde Railway URL

---

## 2. Google OAuth instellen (optioneel)

1. Ga naar [console.cloud.google.com](https://console.cloud.google.com)
2. Maak een nieuw OAuth 2.0 Client ID aan (Web application)
3. Authorized redirect URI: `https://<supabase-project-id>.supabase.co/auth/v1/callback`
4. Kopieer Client ID en Client Secret
5. In Supabase → Authentication → Providers → Google → inschakelen + keys invullen

---

## 3. Railway service aanmaken

1. Ga naar [railway.app](https://railway.app) → New Project → Deploy from GitHub repo
2. Kies de repo `MobilemeConsulting/leagl-actie-app`
3. Railway detecteert automatisch de Dockerfile
4. Ga naar de service → **Variables** → voeg toe:

| Variable | Waarde |
|----------|--------|
| `VITE_SUPABASE_URL` | Supabase Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key |
| `VITE_SUPABASE_SERVICE_KEY` | Supabase service_role key |
| `VITE_ADMIN_SECRET` | Zelf te kiezen wachtwoord voor /admin |
| `VITE_BREVO_API_KEY` | Brevo API key |

5. Klik **Deploy** → wacht tot build klaar is (~3 min)
6. Ga naar **Settings → Networking → Generate Domain** voor een publieke URL
7. Kopieer de Railway URL en plak die als **Site URL** in Supabase (stap 1.6)

---

## 4. Brevo afzender instellen

1. Ga naar [brevo.com](https://brevo.com) → Senders & Domains
2. Voeg het afzenderadres toe van de klant (bv. `info@klant.be`)
3. Verifieer het adres via de bevestigingsmail
4. Pas in de code de `SENDER` constante aan:
   - `src/pages/AdminDashboard.jsx` lijn 11
   - `src/components/TeamPage.jsx` lijn 7
   - `src/App.jsx` lijn 71

> **Tip:** Als je een verified domain hebt in Brevo, kan je elk adres op dat domain gebruiken zonder individuele verificatie.

---

## 5. Eerste admin aanmaken

1. Surf naar `https://<railway-url>/admin`
2. Log in met het `VITE_ADMIN_SECRET` wachtwoord
3. Ga naar **Gebruikers** → maak jezelf aan als eerste gebruiker
4. Log in op de hoofdapp en stel je persoonlijk wachtwoord in

---

## 6. Oplevering aan klant

- [ ] URL gedeeld met klant
- [ ] Admin secret veilig doorgegeven (bv. via wachtwoordmanager)
- [ ] Eerste gebruikers aangemaakt via `/admin`
- [ ] Standaard categorieën aangepast naar klant-specifieke categorieën
- [ ] Google/Microsoft SSO geconfigureerd indien gewenst
- [ ] Test: actie aanmaken, status wijzigen, email ontvangen

---

## Kosten per klant/maand (inschatting)

| Service | Plan | Kost |
|---------|------|------|
| Railway | Hobby | ~$5 |
| Supabase | Free tier | €0 (tot 50.000 MAU) |
| Brevo | Free tier | €0 (tot 300 mails/dag) |
| **Totaal** | | **~$5/maand** |
