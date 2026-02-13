create extension if not exists "pgcrypto";

create table if not exists public.subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  subscribed_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz
);

alter table public.subscribers enable row level security;

grant usage on schema public to anon, authenticated;
grant insert on table public.subscribers to anon;
grant insert on table public.subscribers to authenticated;

drop policy if exists "Allow anonymous waitlist inserts" on public.subscribers;
create policy "Allow anonymous waitlist inserts"
on public.subscribers
for insert
to anon, authenticated
with check (length(trim(email)) > 0);

notify pgrst, 'reload schema';
