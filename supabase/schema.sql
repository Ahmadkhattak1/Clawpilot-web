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
  onboarding_complete boolean not null default false,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  primary key (user_id, tenant_id)
);

create table if not exists public.openclaw_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  tenant_id text not null,
  access_state text not null default 'active' check (access_state in ('active', 'grace', 'suspended', 'terminated')),
  plan_code text not null default 'free' check (plan_code in ('free', 'pro_monthly', 'pro_yearly')),
  billing_provider text not null default 'none' check (billing_provider in ('none', 'manual', 'stripe')),
  billing_status text not null default 'free' check (billing_status in ('free', 'trialing', 'active', 'paused', 'past_due', 'unpaid', 'canceled', 'incomplete', 'incomplete_expired')),
  provider_customer_id text,
  provider_subscription_id text,
  provider_price_id text,
  current_period_starts_at timestamptz,
  current_period_ends_at timestamptz,
  cancel_at_period_end boolean not null default false,
  trial_starts_at timestamptz,
  trial_ends_at timestamptz,
  paywall_trial_starts_at timestamptz,
  paywall_trial_ends_at timestamptz,
  paywall_trial_ended_at timestamptz,
  canceled_at timestamptz,
  ended_at timestamptz,
  last_payment_status text check (last_payment_status in ('succeeded', 'failed', 'pending', 'requires_action', 'refunded', 'canceled')),
  last_payment_at timestamptz,
  last_payment_amount_cents bigint check (last_payment_amount_cents is null or last_payment_amount_cents >= 0),
  last_payment_currency text,
  last_payment_invoice_id text,
  last_provider_event_id text,
  last_provider_event_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  unique (user_id, tenant_id),
  unique (tenant_id),
  unique (billing_provider, provider_subscription_id)
);

create table if not exists public.openclaw_subscription_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  tenant_id text not null,
  billing_provider text not null check (billing_provider in ('manual', 'stripe')),
  event_type text not null,
  event_id text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  unique (billing_provider, event_id)
);

alter table public.openclaw_runtime_profiles
  add column if not exists onboarding_complete boolean not null default false;
alter table public.openclaw_runtime_profiles
  add column if not exists onboarding_completed_at timestamptz;

alter table public.openclaw_subscriptions
  add column if not exists paywall_trial_starts_at timestamptz;
alter table public.openclaw_subscriptions
  add column if not exists paywall_trial_ends_at timestamptz;
alter table public.openclaw_subscriptions
  add column if not exists paywall_trial_ended_at timestamptz;
alter table public.openclaw_subscriptions
  add column if not exists last_payment_status text;
alter table public.openclaw_subscriptions
  add column if not exists last_payment_at timestamptz;
alter table public.openclaw_subscriptions
  add column if not exists last_payment_amount_cents bigint;
alter table public.openclaw_subscriptions
  add column if not exists last_payment_currency text;
alter table public.openclaw_subscriptions
  add column if not exists last_payment_invoice_id text;

alter table public.openclaw_subscriptions
  drop constraint if exists openclaw_subscriptions_billing_status_check;
alter table public.openclaw_subscriptions
  add constraint openclaw_subscriptions_billing_status_check
  check (billing_status in ('free', 'trialing', 'active', 'paused', 'past_due', 'unpaid', 'canceled', 'incomplete', 'incomplete_expired'));

alter table public.openclaw_subscriptions
  drop constraint if exists openclaw_subscriptions_last_payment_status_check;
alter table public.openclaw_subscriptions
  add constraint openclaw_subscriptions_last_payment_status_check
  check (last_payment_status is null or last_payment_status in ('succeeded', 'failed', 'pending', 'requires_action', 'refunded', 'canceled'));

alter table public.openclaw_subscriptions
  drop constraint if exists openclaw_subscriptions_last_payment_amount_cents_check;
alter table public.openclaw_subscriptions
  add constraint openclaw_subscriptions_last_payment_amount_cents_check
  check (last_payment_amount_cents is null or last_payment_amount_cents >= 0);

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
create index if not exists openclaw_subscriptions_lookup_idx
  on public.openclaw_subscriptions (user_id, plan_code, billing_status);
drop index if exists openclaw_subscriptions_period_idx;
create index openclaw_subscriptions_period_idx
  on public.openclaw_subscriptions (current_period_ends_at, trial_ends_at, paywall_trial_ends_at);
create index if not exists openclaw_subscriptions_payment_idx
  on public.openclaw_subscriptions (last_payment_at desc, last_payment_status);
create index if not exists openclaw_subscription_events_lookup_idx
  on public.openclaw_subscription_events (tenant_id, created_at desc);

alter table public.subscribers enable row level security;
alter table public.openclaw_runtime_sessions enable row level security;
alter table public.openclaw_runtime_profiles enable row level security;
alter table public.openclaw_runtime_messages enable row level security;
alter table public.openclaw_subscriptions enable row level security;
alter table public.openclaw_subscription_events enable row level security;

grant usage on schema public to anon, authenticated;
grant insert on table public.subscribers to anon;
grant insert on table public.subscribers to authenticated;
grant select, insert, update, delete on table public.openclaw_runtime_sessions to authenticated;
grant select, insert, update, delete on table public.openclaw_runtime_profiles to authenticated;
grant select, insert, update, delete on table public.openclaw_runtime_messages to authenticated;
grant select, insert, update, delete on table public.openclaw_subscriptions to authenticated;
grant select, insert on table public.openclaw_subscription_events to authenticated;

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

drop policy if exists "Subscriptions are user scoped" on public.openclaw_subscriptions;
create policy "Subscriptions are user scoped"
on public.openclaw_subscriptions
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Subscription events are user scoped read" on public.openclaw_subscription_events;
create policy "Subscription events are user scoped read"
on public.openclaw_subscription_events
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Subscription events are user scoped insert" on public.openclaw_subscription_events;
create policy "Subscription events are user scoped insert"
on public.openclaw_subscription_events
for insert
to authenticated
with check (auth.uid() = user_id);

notify pgrst, 'reload schema';
