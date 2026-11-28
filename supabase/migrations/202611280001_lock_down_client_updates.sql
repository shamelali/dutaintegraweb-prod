-- Client profile writes use the service role; role, tier, status, and password_hash are server-only.
revoke update on public.clients from authenticated;
drop policy if exists "Clients can update own data" on public.clients;
