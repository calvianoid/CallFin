-- Row Level Security — users can only see/modify their own data.

-- Enable RLS on every user-owned table
alter table public.profiles      enable row level security;
alter table public.wallets       enable row level security;
alter table public.categories    enable row level security;
alter table public.transactions  enable row level security;
alter table public.budgets       enable row level security;
alter table public.goals         enable row level security;
alter table public.chat_history  enable row level security;

-- ============================================================================
-- profiles — user sees only their own row
-- ============================================================================
create policy "profiles self read"
  on public.profiles for select
  using ((select auth.uid()) = id);

create policy "profiles self update"
  on public.profiles for update
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Note: INSERT happens via the on_auth_user_created trigger (security definer)

-- ============================================================================
-- Helper: user_id matches caller (used by all per-user tables)
-- ============================================================================
-- (We just use (select auth.uid()) = user_id inline; trivial enough.)

-- ============================================================================
-- wallets
-- ============================================================================
create policy "wallets own read"
  on public.wallets for select
  using ((select auth.uid()) = user_id);

create policy "wallets own insert"
  on public.wallets for insert
  with check ((select auth.uid()) = user_id);

create policy "wallets own update"
  on public.wallets for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "wallets own delete"
  on public.wallets for delete
  using ((select auth.uid()) = user_id);

-- ============================================================================
-- categories
-- ============================================================================
create policy "categories own read"
  on public.categories for select
  using ((select auth.uid()) = user_id);

create policy "categories own insert"
  on public.categories for insert
  with check ((select auth.uid()) = user_id);

create policy "categories own update"
  on public.categories for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "categories own delete"
  on public.categories for delete
  using ((select auth.uid()) = user_id and is_internal = false);

-- ============================================================================
-- transactions
-- ============================================================================
create policy "transactions own read"
  on public.transactions for select
  using ((select auth.uid()) = user_id);

create policy "transactions own insert"
  on public.transactions for insert
  with check ((select auth.uid()) = user_id);

create policy "transactions own update"
  on public.transactions for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "transactions own delete"
  on public.transactions for delete
  using ((select auth.uid()) = user_id);

-- ============================================================================
-- budgets
-- ============================================================================
create policy "budgets own read"
  on public.budgets for select
  using ((select auth.uid()) = user_id);

create policy "budgets own insert"
  on public.budgets for insert
  with check ((select auth.uid()) = user_id);

create policy "budgets own update"
  on public.budgets for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "budgets own delete"
  on public.budgets for delete
  using ((select auth.uid()) = user_id);

-- ============================================================================
-- goals
-- ============================================================================
create policy "goals own read"
  on public.goals for select
  using ((select auth.uid()) = user_id);

create policy "goals own insert"
  on public.goals for insert
  with check ((select auth.uid()) = user_id);

create policy "goals own update"
  on public.goals for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "goals own delete"
  on public.goals for delete
  using ((select auth.uid()) = user_id);

-- ============================================================================
-- chat_history
-- ============================================================================
create policy "chat_history own read"
  on public.chat_history for select
  using ((select auth.uid()) = user_id);

create policy "chat_history own insert"
  on public.chat_history for insert
  with check ((select auth.uid()) = user_id);

create policy "chat_history own delete"
  on public.chat_history for delete
  using ((select auth.uid()) = user_id);

-- ============================================================================
-- Computed view: budget_status (spent + remaining per budget)
-- ============================================================================
create or replace view public.budget_status with (security_invoker = true) as
select
  b.id,
  b.user_id,
  b.category,
  b.limit_amount,
  b.month_year,
  coalesce((
    select sum(t.amount)
    from public.transactions t
    where t.user_id = b.user_id
      and t.category = b.category
      and t.type = 'expense'
      and t.goal_id is null
      and t.transfer_to_wallet_id is null
      and to_char(t.date, 'YYYY-MM') = b.month_year
  ), 0)::numeric as spent
from public.budgets b;

comment on view public.budget_status is 'Budgets with computed spent amount from matching expense transactions.';
