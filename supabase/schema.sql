create extension if not exists "pgcrypto";

create table if not exists public.subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  subscribed_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz
);

create table if not exists public.openclaw_runtime_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  tenant_id text not null,
  session_key text not null,
  session_label text,
  is_active boolean not null default false,
  last_seen_at timestamptz not null default timezone('utc'::text, now()),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  unique (user_id, tenant_id, session_key)
);

create table if not exists public.openclaw_runtime_profiles (
  user_id uuid not null,
  tenant_id text not null,
  model_provider_id text,
  model_id text,
  auth_method text check (auth_method in ('api-key', 'oauth')),
  oauth_connected boolean not null default false,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  primary key (user_id, tenant_id)
);

create table if not exists public.openclaw_runtime_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  tenant_id text not null,
  session_key text not null,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  message_ts timestamptz not null default timezone('utc'::text, now()),
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.clawpilot_lifecycle_state (
  state_key text primary key,
  state_snapshot jsonb not null,
  updated_at timestamptz not null default timezone('utc'::text, now()),
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists openclaw_runtime_sessions_lookup_idx
  on public.openclaw_runtime_sessions (user_id, tenant_id, is_active desc, last_seen_at desc);
create index if not exists openclaw_runtime_messages_lookup_idx
  on public.openclaw_runtime_messages (user_id, tenant_id, session_key, message_ts asc);

alter table public.subscribers enable row level security;
alter table public.openclaw_runtime_sessions enable row level security;
alter table public.openclaw_runtime_profiles enable row level security;
alter table public.openclaw_runtime_messages enable row level security;

grant usage on schema public to anon, authenticated;
grant insert on table public.subscribers to anon;
grant insert on table public.subscribers to authenticated;
grant select, insert, update, delete on table public.openclaw_runtime_sessions to authenticated;
grant select, insert, update, delete on table public.openclaw_runtime_profiles to authenticated;
grant select, insert, update, delete on table public.openclaw_runtime_messages to authenticated;

drop policy if exists "Allow anonymous waitlist inserts" on public.subscribers;
create policy "Allow anonymous waitlist inserts"
on public.subscribers
for insert
to anon, authenticated
with check (length(trim(email)) > 0);

drop policy if exists "Runtime sessions are user scoped" on public.openclaw_runtime_sessions;
create policy "Runtime sessions are user scoped"
on public.openclaw_runtime_sessions
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Runtime profiles are user scoped" on public.openclaw_runtime_profiles;
create policy "Runtime profiles are user scoped"
on public.openclaw_runtime_profiles
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Runtime messages are user scoped" on public.openclaw_runtime_messages;
create policy "Runtime messages are user scoped"
on public.openclaw_runtime_messages
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

notify pgrst, 'reload schema';
