-- ==============================================================================
-- Duta Integra Solutions — Production Database Initialization Script
-- Project: wnehfuhpaptrxxnlzmck
-- Run this in: https://supabase.com/dashboard/project/wnehfuhpaptrxxnlzmck/sql/new
-- ==============================================================================

-- 1. Leads & Website Enquiries Table
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  company text,
  service text,
  message text,
  status text not null default 'new',
  source text default 'contact-form',
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  lead_score integer not null default 0,
  industry text,
  assigned_role text,
  emailed_at timestamptz,
  user_agent text,
  ip text
);

create index if not exists leads_status_created_idx on public.leads(status, created_at desc);
create index if not exists leads_email_idx on public.leads(lower(email));
create index if not exists leads_phone_idx on public.leads(phone);

alter table public.leads enable row level security;

-- Policies for leads
create policy "Allow insert for website lead funnels" on public.leads
  for insert with check (true);

create policy "Allow service role full access on leads" on public.leads
  for all using (auth.role() = 'service_role');

-- 2. Testimonials
create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text,
  role text,
  content text not null,
  rating integer default 5,
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.testimonials enable row level security;

create policy "Allow public read approved testimonials" on public.testimonials
  for select using (approved = true);

create policy "Allow insert testimonials" on public.testimonials
  for insert with check (true);

create policy "Allow service role full access on testimonials" on public.testimonials
  for all using (auth.role() = 'service_role');

-- 3. Health Probe Table (Used by /api/health to confirm DB connectivity)
create table if not exists public.health_probe (
  id integer primary key,
  probed_at timestamptz not null default now()
);

alter table public.health_probe enable row level security;

create policy "Allow read on health_probe" on public.health_probe
  for select using (true);

insert into public.health_probe (id, probed_at)
values (1, now())
on conflict (id) do update set probed_at = now();
