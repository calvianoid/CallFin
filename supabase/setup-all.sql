-- ============================================================================
-- CallFin — Combined setup script
-- Copy-paste ke Supabase SQL Editor (Dashboard → SQL → New query) lalu RUN.
-- Idempotent — boleh dijalankan ulang kalau setengah berhasil tadi.
-- ============================================================================

-- Cleanup any partial state — order: trigger on auth.users first (separate schema),
-- then drop our tables with CASCADE (auto-drops their triggers/policies/views),
-- then standalone functions, then types.
drop trigger if exists on_auth_user_created on auth.users;

drop table if exists public.chat_history cascade;
drop table if exists public.transactions cascade;
drop table if exists public.budgets cascade;
drop table if exists public.goals cascade;
drop table if exists public.categories cascade;
drop table if exists public.wallets cascade;
drop table if exists public.profiles cascade;

drop function if exists public.seed_user_defaults() cascade;
drop function if exists public.apply_transaction() cascade;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.set_updated_at() cascade;
drop function if exists public.do_transfer(uuid, uuid, numeric, text) cascade;
drop function if exists public.do_goal_contribution(uuid, uuid, numeric, text) cascade;

drop view if exists public.budget_status cascade;

drop type if exists chat_role cascade;
drop type if exists transaction_type cascade;
drop type if exists category_type cascade;
drop type if exists wallet_type cascade;

create extension if not exists "uuid-ossp";

-- ============================================================================
-- Tables
-- ============================================================================
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null,
  email       text not null,
  phone       text,
  avatar_url  text,
  locale      text not null default 'id' check (locale in ('id', 'en')),
  theme       text not null default 'system' check (theme in ('light', 'dark', 'system')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create type wallet_type as enum ('cash', 'bank', 'ewallet', 'credit');

create table public.wallets (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  name        text not null check (length(name) between 1 and 60),
  type        wallet_type not null,
  balance     numeric(16, 2) not null default 0,
  color       text not null default 'bg-emerald-500',
  icon        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index wallets_user_idx on public.wallets(user_id);

create type category_type as enum ('income', 'expense');

create table public.categories (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  name         text not null check (length(name) between 1 and 30),
  type         category_type not null,
  color        text not null default 'bg-gray-100 text-gray-700',
  icon         text,
  is_default   boolean not null default false,
  is_internal  boolean not null default false,
  created_at   timestamptz not null default now(),
  constraint categories_unique_name unique (user_id, type, name)
);
create index categories_user_idx on public.categories(user_id);

create table public.goals (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  goal_name       text not null check (length(goal_name) between 1 and 100),
  target_amount   numeric(16, 2) not null check (target_amount > 0),
  current_amount  numeric(16, 2) not null default 0 check (current_amount >= 0),
  deadline        date not null,
  created_at      timestamptz not null default now()
);
create index goals_user_idx on public.goals(user_id);

create type transaction_type as enum ('income', 'expense', 'transfer');

create table public.transactions (
  id                     uuid primary key default uuid_generate_v4(),
  user_id                uuid not null references public.profiles(id) on delete cascade,
  wallet_id              uuid not null references public.wallets(id) on delete restrict,
  type                   transaction_type not null,
  amount                 numeric(16, 2) not null check (amount > 0),
  category               text not null,
  description            text not null default '',
  date                   date not null default current_date,
  goal_id                uuid references public.goals(id) on delete set null,
  transfer_to_wallet_id  uuid references public.wallets(id) on delete restrict,
  created_at             timestamptz not null default now(),
  constraint transfer_has_destination check (
    (type = 'transfer' and transfer_to_wallet_id is not null and transfer_to_wallet_id <> wallet_id)
    or
    (type <> 'transfer' and transfer_to_wallet_id is null)
  ),
  constraint goal_only_on_expense check (
    goal_id is null or type = 'expense'
  )
);
create index transactions_user_idx     on public.transactions(user_id);
create index transactions_wallet_idx   on public.transactions(wallet_id);
create index transactions_date_idx     on public.transactions(user_id, date desc);
create index transactions_category_idx on public.transactions(user_id, category);
create index transactions_goal_idx     on public.transactions(goal_id) where goal_id is not null;

create table public.budgets (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  category      text not null,
  limit_amount  numeric(16, 2) not null check (limit_amount > 0),
  month_year    text not null check (month_year ~ '^\d{4}-\d{2}$'),
  created_at    timestamptz not null default now(),
  constraint budgets_unique_cat_month unique (user_id, category, month_year)
);
create index budgets_user_month_idx on public.budgets(user_id, month_year);

create type chat_role as enum ('user', 'assistant');

create table public.chat_history (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  role        chat_role not null,
  message     text not null,
  metadata    jsonb,
  created_at  timestamptz not null default now()
);
create index chat_history_user_idx on public.chat_history(user_id, created_at desc);

-- ============================================================================
-- Functions & Triggers
-- ============================================================================
create function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger wallets_set_updated_at before update on public.wallets
  for each row execute function public.set_updated_at();

create function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.seed_user_defaults()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.categories (user_id, name, type, color, icon, is_default) values
    (new.id, 'Gaji',       'income',  'bg-emerald-100 text-emerald-700', '💼', true),
    (new.id, 'Freelance',  'income',  'bg-cyan-100 text-cyan-700',       '💻', true),
    (new.id, 'Bonus',      'income',  'bg-green-100 text-green-700',     '🎁', true),
    (new.id, 'Investasi',  'income',  'bg-indigo-100 text-indigo-700',   '📈', true);
  insert into public.categories (user_id, name, type, color, icon, is_default) values
    (new.id, 'Makanan',      'expense', 'bg-orange-100 text-orange-700', '🍔', true),
    (new.id, 'Transportasi', 'expense', 'bg-blue-100 text-blue-700',     '🚗', true),
    (new.id, 'Tagihan',      'expense', 'bg-red-100 text-red-700',       '📄', true),
    (new.id, 'Belanja',      'expense', 'bg-pink-100 text-pink-700',     '🛍️', true),
    (new.id, 'Hiburan',      'expense', 'bg-purple-100 text-purple-700', '🎬', true),
    (new.id, 'Kesehatan',    'expense', 'bg-green-100 text-green-700',   '🏥', true),
    (new.id, 'Lainnya',      'expense', 'bg-gray-100 text-gray-700',     '📌', true);
  insert into public.categories (user_id, name, type, color, icon, is_default, is_internal) values
    (new.id, 'Tabungan', 'expense', 'bg-violet-100 text-violet-700', '🐷', true, true);
  insert into public.wallets (user_id, name, type, balance, color, icon) values
    (new.id, 'Tunai', 'cash', 0, 'bg-emerald-500', '💵');
  return new;
end;
$$;

create trigger seed_defaults_on_profile_create after insert on public.profiles
  for each row execute function public.seed_user_defaults();

create function public.do_transfer(p_from_wallet uuid, p_to_wallet uuid, p_amount numeric, p_description text default null)
returns uuid language plpgsql security invoker as $$
declare v_user_id uuid; v_tx_id uuid; v_to_name text;
begin
  if p_from_wallet = p_to_wallet then raise exception 'Source and destination wallets must differ'; end if;
  if p_amount <= 0 then raise exception 'Transfer amount must be positive'; end if;
  select user_id into v_user_id from public.wallets where id = p_from_wallet and user_id = (select auth.uid()) for update;
  if v_user_id is null then raise exception 'Source wallet not found or not yours'; end if;
  select name into v_to_name from public.wallets where id = p_to_wallet and user_id = v_user_id for update;
  if v_to_name is null then raise exception 'Destination wallet not found or not yours'; end if;
  update public.wallets set balance = balance - p_amount where id = p_from_wallet;
  update public.wallets set balance = balance + p_amount where id = p_to_wallet;
  insert into public.transactions (user_id, wallet_id, transfer_to_wallet_id, type, amount, category, description)
  values (v_user_id, p_from_wallet, p_to_wallet, 'transfer', p_amount, 'Transfer', coalesce(p_description, 'Transfer ke ' || v_to_name))
  returning id into v_tx_id;
  return v_tx_id;
end;
$$;

create function public.do_goal_contribution(p_goal_id uuid, p_wallet_id uuid, p_amount numeric, p_note text default null)
returns uuid language plpgsql security invoker as $$
declare v_user_id uuid; v_goal_name text; v_tx_id uuid;
begin
  if p_amount <= 0 then raise exception 'Amount must be positive'; end if;
  select user_id, goal_name into v_user_id, v_goal_name from public.goals where id = p_goal_id and user_id = (select auth.uid()) for update;
  if v_user_id is null then raise exception 'Goal not found or not yours'; end if;
  perform 1 from public.wallets where id = p_wallet_id and user_id = v_user_id;
  if not found then raise exception 'Wallet not found or not yours'; end if;
  update public.goals set current_amount = current_amount + p_amount where id = p_goal_id;
  update public.wallets set balance = balance - p_amount where id = p_wallet_id;
  insert into public.transactions (user_id, wallet_id, goal_id, type, amount, category, description)
  values (v_user_id, p_wallet_id, p_goal_id, 'expense', p_amount, 'Tabungan', coalesce(p_note, 'Setor ke goal: ' || v_goal_name))
  returning id into v_tx_id;
  return v_tx_id;
end;
$$;

create function public.apply_transaction()
returns trigger language plpgsql as $$
declare v_delta numeric;
begin
  if tg_op = 'INSERT' then
    if new.type = 'transfer' or new.goal_id is not null then return new; end if;
    v_delta := case when new.type = 'income' then new.amount else -new.amount end;
    update public.wallets set balance = balance + v_delta where id = new.wallet_id;
    return new;
  elsif tg_op = 'DELETE' then
    if old.type = 'transfer' or old.goal_id is not null then return old; end if;
    v_delta := case when old.type = 'income' then -old.amount else old.amount end;
    update public.wallets set balance = balance + v_delta where id = old.wallet_id;
    return old;
  end if;
  return null;
end;
$$;

create trigger transactions_apply after insert or delete on public.transactions
  for each row execute function public.apply_transaction();

-- ============================================================================
-- RLS
-- ============================================================================
alter table public.profiles enable row level security;
alter table public.wallets enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;
alter table public.goals enable row level security;
alter table public.chat_history enable row level security;

create policy "profiles self read" on public.profiles for select using ((select auth.uid()) = id);
create policy "profiles self update" on public.profiles for update using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "wallets own read" on public.wallets for select using ((select auth.uid()) = user_id);
create policy "wallets own insert" on public.wallets for insert with check ((select auth.uid()) = user_id);
create policy "wallets own update" on public.wallets for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "wallets own delete" on public.wallets for delete using ((select auth.uid()) = user_id);

create policy "categories own read" on public.categories for select using ((select auth.uid()) = user_id);
create policy "categories own insert" on public.categories for insert with check ((select auth.uid()) = user_id);
create policy "categories own update" on public.categories for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "categories own delete" on public.categories for delete using ((select auth.uid()) = user_id and is_internal = false);

create policy "transactions own read" on public.transactions for select using ((select auth.uid()) = user_id);
create policy "transactions own insert" on public.transactions for insert with check ((select auth.uid()) = user_id);
create policy "transactions own update" on public.transactions for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "transactions own delete" on public.transactions for delete using ((select auth.uid()) = user_id);

create policy "budgets own read" on public.budgets for select using ((select auth.uid()) = user_id);
create policy "budgets own insert" on public.budgets for insert with check ((select auth.uid()) = user_id);
create policy "budgets own update" on public.budgets for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "budgets own delete" on public.budgets for delete using ((select auth.uid()) = user_id);

create policy "goals own read" on public.goals for select using ((select auth.uid()) = user_id);
create policy "goals own insert" on public.goals for insert with check ((select auth.uid()) = user_id);
create policy "goals own update" on public.goals for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "goals own delete" on public.goals for delete using ((select auth.uid()) = user_id);

create policy "chat_history own read" on public.chat_history for select using ((select auth.uid()) = user_id);
create policy "chat_history own insert" on public.chat_history for insert with check ((select auth.uid()) = user_id);
create policy "chat_history own delete" on public.chat_history for delete using ((select auth.uid()) = user_id);

-- ============================================================================
-- View
-- ============================================================================
create view public.budget_status with (security_invoker = true) as
select
  b.id, b.user_id, b.category, b.limit_amount, b.month_year,
  coalesce((
    select sum(t.amount) from public.transactions t
    where t.user_id = b.user_id and t.category = b.category and t.type = 'expense'
      and t.goal_id is null and t.transfer_to_wallet_id is null
      and to_char(t.date, 'YYYY-MM') = b.month_year
  ), 0)::numeric as spent
from public.budgets b;

-- ============================================================================
-- Backfill profiles for existing auth.users (in case any already registered)
-- ============================================================================
insert into public.profiles (id, full_name, email)
select
  u.id,
  coalesce(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
  u.email
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);

-- Done.
select 'CallFin DB setup complete ✅' as status;
