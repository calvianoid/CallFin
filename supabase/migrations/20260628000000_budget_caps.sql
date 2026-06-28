-- ============================================================================
-- budget_caps — per-month total spending cap ("pagu total bulanan")
-- One total budget per user per month. Individual category budgets must sum to
-- at most this cap; the remainder is shown in the UI as "Other Categories".
-- ============================================================================
create table public.budget_caps (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  total_amount  numeric(16, 2) not null check (total_amount > 0),
  month_year    text not null check (month_year ~ '^\d{4}-\d{2}$'), -- YYYY-MM
  created_at    timestamptz not null default now(),
  -- One cap per month per user
  constraint budget_caps_unique_month unique (user_id, month_year)
);

create index budget_caps_user_month_idx on public.budget_caps(user_id, month_year);

-- Row Level Security — users only see/modify their own caps
alter table public.budget_caps enable row level security;

create policy "budget_caps own read"
  on public.budget_caps for select
  using ((select auth.uid()) = user_id);

create policy "budget_caps own insert"
  on public.budget_caps for insert
  with check ((select auth.uid()) = user_id);

create policy "budget_caps own update"
  on public.budget_caps for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "budget_caps own delete"
  on public.budget_caps for delete
  using ((select auth.uid()) = user_id);
