-- Transcript for the DutaOS AI chatbar (/api/ai/chat).
--
-- One row per user/assistant message, grouped into sessions owned by a
-- company. The server writes with the service role (which bypasses RLS), so
-- there are deliberately no policies: anon and authenticated cannot reach these
-- tables directly. All reads/writes go through server routes that scope by
-- company_id via the dutaos_session cookie.

create table if not exists public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.chat_sessions(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;

create index if not exists chat_messages_session_created_idx
  on public.chat_messages(session_id, created_at asc);
create index if not exists chat_sessions_company_updated_idx
  on public.chat_sessions(company_id, updated_at desc);
