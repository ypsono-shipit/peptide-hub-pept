-- PEPT Trade waitlist
-- Run in Supabase SQL editor (or supabase db push)

create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  wallet text,
  x_handle text,
  -- e.g. landing | launchpad | waitlist (optional analytics)
  source text,
  created_at timestamptz not null default now(),
  constraint waitlist_email_unique unique (email)
);

-- Safe for existing projects that already created the table without source
alter table public.waitlist add column if not exists source text;

create index if not exists waitlist_created_at_idx on public.waitlist (created_at desc);

-- Public can only insert; reads go through server with service role
alter table public.waitlist enable row level security;

drop policy if exists "anon_insert_waitlist" on public.waitlist;
create policy "anon_insert_waitlist"
  on public.waitlist
  for insert
  to anon, authenticated
  with check (true);

-- No public select — count/list via service role API only
drop policy if exists "no_public_select" on public.waitlist;
