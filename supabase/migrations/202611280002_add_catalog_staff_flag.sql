-- Server-controlled: public signup and company profile updates cannot set this flag.
alter table public.companies add column if not exists is_staff boolean not null default false;
comment on column public.companies.is_staff is 'Server-controlled staff access flag.';
