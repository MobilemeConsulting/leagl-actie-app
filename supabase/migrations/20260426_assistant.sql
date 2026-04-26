-- Assistant: tabellen voor voice-first executive AI assistent
-- Consistent met overige app: GEEN RLS — applicatielaag-isolatie via tenant_id

create table if not exists assistant_sessions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_email text,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  transcript jsonb default '[]'::jsonb,
  summary text,
  decisions jsonb default '[]'::jsonb,
  open_questions jsonb default '[]'::jsonb,
  risks jsonb default '[]'::jsonb,
  source text default 'web'
);

create index if not exists assistant_sessions_tenant_idx
  on assistant_sessions(tenant_id, started_at desc);

create table if not exists assistant_extracted_actions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references assistant_sessions(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  subject text not null,
  description text,
  due_date date,
  due_time text,                -- 'HH:MM', optioneel; vult dateTime in calendar event
  duration_minutes integer,     -- optioneel; standaard 60 voor afspraken
  kind text default 'task',     -- 'task' | 'appointment' — bepaalt of er een Calendar event komt
  priority text,
  category_hint text,
  category_id integer references categories(id),
  assigned_to_email text,
  confidence numeric(3,2),
  status text not null default 'pending',
  created_action_id integer references actions(id),
  raw_llm_payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists assistant_extracted_actions_session_idx
  on assistant_extracted_actions(session_id, status);

create table if not exists assistant_settings (
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_email text not null,
  persona text default 'zakelijk-direct',
  brevity smallint default 2,
  proactivity smallint default 2,
  default_category_id integer references categories(id),
  default_assignee_email text,
  default_priority text default 'medium',
  confirm_before_save boolean default true,
  email_summary_to text,
  microsoft_sync_enabled boolean default false,
  google_tasks_enabled boolean default false,
  google_calendar_enabled boolean default false,
  google_gmail_enabled boolean default false,
  google_tasklist_id text,
  google_calendar_id text default 'primary',
  primary key (tenant_id, user_email)
);

-- Google OAuth tokens per gebruiker. Korte access_token + langer geldige refresh_token.
-- Refresh_token wordt server-side bewaard zodat de assistent ook offline kan synchroniseren.
create table if not exists assistant_google_tokens (
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_email text not null,
  access_token text,
  refresh_token text,
  scope text,
  expires_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (tenant_id, user_email)
);
