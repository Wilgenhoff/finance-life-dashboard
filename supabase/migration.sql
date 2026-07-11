-- ============================================================
-- Migration: Finance & Life Dashboard
-- Ejecutar en: Supabase SQL Editor
-- ============================================================

-- 1. Tabla de usuarios (vinculada a auth.users)
create table if not exists public.users (
  id         uuid        primary key references auth.users(id) on delete cascade,
  email      text        not null unique,
  name       text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.users enable row level security;

create policy "users_read_own" on public.users
  for select using (auth.uid() = id);

create policy "users_insert_own" on public.users
  for insert with check (auth.uid() = id);

create policy "users_update_own" on public.users
  for update using (auth.uid() = id);

-- 2. Auto-crear perfil de usuario al registrarse
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.users (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3. Categorías de transacciones
create table if not exists public.transaction_categories (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null,
  color      text        not null default '#71717a',
  icon       text,
  created_at timestamptz not null default now()
);

alter table public.transaction_categories enable row level security;

create policy "categories_read_all" on public.transaction_categories
  for select using (true);

create policy "categories_insert_all" on public.transaction_categories
  for insert with check (true);

-- 4. Transacciones
create table if not exists public.transactions (
  id          uuid         primary key default gen_random_uuid(),
  user_id     uuid         not null references public.users(id) on delete cascade,
  category_id uuid         references public.transaction_categories(id) on delete set null,
  type        text         not null check (type in ('INCOME', 'EXPENSE')),
  amount      numeric(14,2) not null,
  currency    text         not null default 'USD',
  description text,
  date        date         not null,
  created_at  timestamptz  not null default now(),
  updated_at  timestamptz  not null default now()
);

create index if not exists idx_transactions_user_date on public.transactions(user_id, date);
create index if not exists idx_transactions_category on public.transactions(category_id);

alter table public.transactions enable row level security;

create policy "transactions_read_own" on public.transactions
  for select using (auth.uid() = user_id);

create policy "transactions_insert_own" on public.transactions
  for insert with check (auth.uid() = user_id);

create policy "transactions_update_own" on public.transactions
  for update using (auth.uid() = user_id);

create policy "transactions_delete_own" on public.transactions
  for delete using (auth.uid() = user_id);

-- 5. Activos / balances
create table if not exists public.asset_balances (
  id          uuid          primary key default gen_random_uuid(),
  user_id     uuid          not null references public.users(id) on delete cascade,
  symbol      text          not null,
  name        text          not null,
  quantity    numeric(24,8) not null,
  unit_price  numeric(18,4) not null,
  currency    text          not null default 'USD',
  created_at  timestamptz   not null default now(),
  updated_at  timestamptz   not null default now(),
  constraint asset_balances_user_symbol_unique unique (user_id, symbol)
);

create index if not exists idx_asset_balances_user on public.asset_balances(user_id);

alter table public.asset_balances enable row level security;

create policy "assets_read_own" on public.asset_balances
  for select using (auth.uid() = user_id);

create policy "assets_insert_own" on public.asset_balances
  for insert with check (auth.uid() = user_id);

create policy "assets_update_own" on public.asset_balances
  for update using (auth.uid() = user_id);

create policy "assets_delete_own" on public.asset_balances
  for delete using (auth.uid() = user_id);

-- 6. Hábitos
create table if not exists public.habits (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references public.users(id) on delete cascade,
  name         text        not null,
  frequency    text        not null default 'DAILY' check (frequency in ('DAILY', 'WEEKLY')),
  target_count int         not null default 1,
  color        text        not null default '#22c55e',
  is_active    boolean     not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_habits_user_active on public.habits(user_id, is_active);

alter table public.habits enable row level security;

create policy "habits_read_own" on public.habits
  for select using (auth.uid() = user_id);

create policy "habits_insert_own" on public.habits
  for insert with check (auth.uid() = user_id);

create policy "habits_update_own" on public.habits
  for update using (auth.uid() = user_id);

create policy "habits_delete_own" on public.habits
  for delete using (auth.uid() = user_id);

-- 7. Registros de hábitos
create table if not exists public.habit_logs (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references public.users(id) on delete cascade,
  habit_id     uuid        not null references public.habits(id) on delete cascade,
  log_date     date        not null,
  completed_at timestamptz not null default now(),
  note         text,
  created_at   timestamptz not null default now(),
  constraint habit_logs_habit_date_unique unique (habit_id, log_date)
);

create index if not exists idx_habit_logs_user_date on public.habit_logs(user_id, log_date);

alter table public.habit_logs enable row level security;

create policy "habit_logs_read_own" on public.habit_logs
  for select using (auth.uid() = user_id);

create policy "habit_logs_insert_own" on public.habit_logs
  for insert with check (auth.uid() = user_id);

create policy "habit_logs_update_own" on public.habit_logs
  for update using (auth.uid() = user_id);

create policy "habit_logs_delete_own" on public.habit_logs
  for delete using (auth.uid() = user_id);
