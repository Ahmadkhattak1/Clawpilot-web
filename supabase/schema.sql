create extension if not exists "pgcrypto";

create table if not exists public.subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  subscribed_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz
);

alter table public.subscribers enable row level security;

drop policy if exists "Allow anonymous waitlist inserts" on public.subscribers;
create policy "Allow anonymous waitlist inserts"
on public.subscribers
for insert
to anon
with check (true);
