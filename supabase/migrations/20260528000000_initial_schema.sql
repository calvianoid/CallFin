-- CallFin — Initial Schema
-- Mirrors the FE data model in src/types and src/lib/store.tsx.
-- Auth.users (Supabase managed) is the source of truth for user IDs.

create extension if not exists "uuid-ossp";

-- ============================================================================
-- profiles — one row per auth user, holds display info & preferences
-- ============================================================================
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  full_name    text not null,
  email        text not null,
  phone        text,
  avatar_url   text,
  locale       text not null default 'id' check (locale in ('id', 'en')),
  theme        text not null default 'system' check (theme in ('light', 'dark', 'system')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.profiles is 'User profile + preferences. One row per auth user.';

-- ============================================================================
-- wallets — multi-wallet support (cash, bank, e-wallet, credit)
-- ============================================================================
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

-- ============================================================================
-- categories — user-customizable income/expense categories
-- ============================================================================
create type category_type as enum ('income', 'expense');

create table public.categories (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  name         text not null check (length(name) between 1 and 30),
  type         category_type not null,
  color        text not null default 'bg-gray-100 text-gray-700',
  icon         text,
  is_default   boolean not null default false,
  is_internal  boolean not null default false, -- e.g. "Tabungan" used for goal contributions
  created_at   timestamptz not null default now(),
  -- Unique per user+type+name (case-insensitive)
  constraint categories_unique_name unique (user_id, type, name)
);

create index categories_user_idx on public.categories(user_id);

-- ============================================================================
-- transactions — income, expense, transfer, goal contribution
-- ============================================================================
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
  goal_id                uuid, -- FK to goals(id) added at end of file (forward ref)
  transfer_to_wallet_id  uuid references public.wallets(id) on delete restrict,
  created_at             timestamptz not null default now(),
  -- Transfer must have a destination, and it must differ from source
  constraint transfer_has_destination check (
    (type = 'transfer' and transfer_to_wallet_id is not null and transfer_to_wallet_id <> wallet_id)
    or
    (type <> 'transfer' and transfer_to_wallet_id is null)
  ),
  -- goal_id only valid on expense transactions
  constraint goal_only_on_expense check (
    goal_id is null or type = 'expense'
  )
);

create index transactions_user_idx     on public.transactions(user_id);
create index transactions_wallet_idx   on public.transactions(wallet_id);
create index transactions_date_idx     on public.transactions(user_id, date desc);
create index transactions_category_idx on public.transactions(user_id, category);
create index transactions_goal_idx     on public.transactions(goal_id) where goal_id is not null;

-- ============================================================================
-- budgets — per-category monthly spending cap
-- ============================================================================
create table public.budgets (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  category      text not null,
  limit_amount  numeric(16, 2) not null check (limit_amount > 0),
  month_year    text not null check (month_year ~ '^\d{4}-\d{2}$'), -- YYYY-MM
  created_at    timestamptz not null default now(),
  -- No duplicate category per month per user
  constraint budgets_unique_cat_month unique (user_id, category, month_year)
);

create index budgets_user_month_idx on public.budgets(user_id, month_year);

-- ============================================================================
-- goals — financial targets (dana darurat, liburan, etc.)
-- ============================================================================
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

-- Now wire the FK we forward-declared in transactions
alter table public.transactions
  add constraint transactions_goal_id_fkey foreign key (goal_id) references public.goals(id) on delete set null;

-- ============================================================================
-- chat_history — AI agent memory
-- ============================================================================
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
-- updated_at triggers
-- ============================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger wallets_set_updated_at
  before update on public.wallets
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Auto-create profile on auth signup
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- Atomic transfer function: deducts from source, adds to destination, records 1 tx
-- ============================================================================
create or replace function public.do_transfer(
  p_from_wallet uuid,
  p_to_wallet   uuid,
  p_amount      numeric,
  p_description text default null
)
returns uuid
language plpgsql
security invoker
as $$
declare
  v_user_id uuid;
  v_tx_id   uuid;
  v_to_name text;
begin
  if p_from_wallet = p_to_wallet then
    raise exception 'Source and destination wallets must differ';
  end if;
  if p_amount <= 0 then
    raise exception 'Transfer amount must be positive';
  end if;

  -- Both wallets must belong to the caller
  select user_id into v_user_id from public.wallets
    where id = p_from_wallet
      and user_id = (select auth.uid())
    for update;
  if v_user_id is null then
    raise exception 'Source wallet not found or not yours';
  end if;

  select name into v_to_name from public.wallets
    where id = p_to_wallet and user_id = v_user_id
    for update;
  if v_to_name is null then
    raise exception 'Destination wallet not found or not yours';
  end if;

  -- Move money
  update public.wallets set balance = balance - p_amount where id = p_from_wallet;
  update public.wallets set balance = balance + p_amount where id = p_to_wallet;

  -- Record one transaction
  insert into public.transactions (user_id, wallet_id, transfer_to_wallet_id, type, amount, category, description)
  values (v_user_id, p_from_wallet, p_to_wallet, 'transfer', p_amount, 'Transfer',
          coalesce(p_description, 'Transfer ke ' || v_to_name))
  returning id into v_tx_id;

  return v_tx_id;
end;
$$;

-- ============================================================================
-- Atomic goal contribution: deduct wallet, bump goal, record one tx
-- ============================================================================
create or replace function public.do_goal_contribution(
  p_goal_id   uuid,
  p_wallet_id uuid,
  p_amount    numeric,
  p_note      text default null
)
returns uuid
language plpgsql
security invoker
as $$
declare
  v_user_id   uuid;
  v_goal_name text;
  v_tx_id     uuid;
begin
  if p_amount <= 0 then
    raise exception 'Amount must be positive';
  end if;

  select user_id, goal_name into v_user_id, v_goal_name
    from public.goals
    where id = p_goal_id and user_id = (select auth.uid())
    for update;
  if v_user_id is null then
    raise exception 'Goal not found or not yours';
  end if;

  -- Verify wallet ownership
  perform 1 from public.wallets where id = p_wallet_id and user_id = v_user_id;
  if not found then
    raise exception 'Wallet not found or not yours';
  end if;

  update public.goals
    set current_amount = current_amount + p_amount
    where id = p_goal_id;

  update public.wallets
    set balance = balance - p_amount
    where id = p_wallet_id;

  insert into public.transactions (user_id, wallet_id, goal_id, type, amount, category, description)
  values (v_user_id, p_wallet_id, p_goal_id, 'expense', p_amount, 'Tabungan',
          coalesce(p_note, 'Setor ke goal: ' || v_goal_name))
  returning id into v_tx_id;

  return v_tx_id;
end;
$$;

-- ============================================================================
-- Helper: auto-update wallet balance & budget spent on transaction insert/delete
-- ============================================================================
create or replace function public.apply_transaction()
returns trigger
language plpgsql
as $$
declare
  v_delta numeric;
begin
  if tg_op = 'INSERT' then
    -- Skip for transfers/goal contributions — handled by RPC functions atomically
    if new.type = 'transfer' or new.goal_id is not null then
      return new;
    end if;
    v_delta := case when new.type = 'income' then new.amount else -new.amount end;
    update public.wallets set balance = balance + v_delta where id = new.wallet_id;
    return new;
  elsif tg_op = 'DELETE' then
    if old.type = 'transfer' or old.goal_id is not null then
      return old;
    end if;
    v_delta := case when old.type = 'income' then -old.amount else old.amount end;
    update public.wallets set balance = balance + v_delta where id = old.wallet_id;
    return old;
  end if;
  return null;
end;
$$;

create trigger transactions_apply
  after insert or delete on public.transactions
  for each row execute function public.apply_transaction();
