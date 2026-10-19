-- Préstamos y deudas
-- Ejecuta este script en el SQL Editor de tu proyecto Supabase.

create table if not exists public.loans (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  direction text not null default 'lent' check (direction in ('lent', 'borrowed')),
  counterparty text not null default '',
  amount numeric not null default 0,
  paid_amount numeric not null default 0,
  date timestamptz not null default now(),
  due_date timestamptz,
  note text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists loans_user_id_idx on public.loans (user_id);

alter table public.loans enable row level security;

drop policy if exists "loans_select_own" on public.loans;
drop policy if exists "loans_insert_own" on public.loans;
drop policy if exists "loans_update_own" on public.loans;
drop policy if exists "loans_delete_own" on public.loans;

create policy "loans_select_own" on public.loans
  for select using (auth.uid() = user_id);

create policy "loans_insert_own" on public.loans
  for insert with check (auth.uid() = user_id);

create policy "loans_update_own" on public.loans
  for update using (auth.uid() = user_id);

create policy "loans_delete_own" on public.loans
  for delete using (auth.uid() = user_id);
