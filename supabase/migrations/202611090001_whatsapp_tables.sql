-- WhatsApp Cloud API Integration: Deduplication, Opt-Out Suppression & Consent Trail.
--
-- Server routes read and write using the service role key. Anon and authenticated
-- roles have no policies, so they cannot read or manipulate WhatsApp messages, opt-outs, or consents.

create table if not exists public.whatsapp_messages (
  wamid text primary key,
  phone text,
  sender_name text,
  message text,
  status text not null default 'pending',
  error_message text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create table if not exists public.whatsapp_optouts (
  phone text primary key,
  reason text default 'user_optout',
  opted_out_at timestamptz not null default now()
);

create table if not exists public.whatsapp_consents (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  company text,
  contact_name text not null,
  consent_method text not null,
  form_version text not null default 'v1.0',
  consent_at timestamptz not null default now(),
  status text not null default 'active',
  revoked_at timestamptz,
  notes text
);

alter table public.whatsapp_messages enable row level security;
alter table public.whatsapp_optouts enable row level security;
alter table public.whatsapp_consents enable row level security;

create index if not exists whatsapp_consents_phone_idx
  on public.whatsapp_consents(phone, status);
