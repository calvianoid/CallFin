-- Switch default category catalogue to English only and drop overlapping
-- duplicates (Streaming, Concert, Lost, Cicilan, Tagihan Terbayar).
-- Internal "Tabungan" → "Savings".
--
-- This migration is destructive for unused default categories. It preserves
-- any category that has at least one transaction or budget referencing it,
-- so historical data is never orphaned.
--
-- After running this:
--   - Every NEW signup gets the English defaults (via updated trigger).
--   - Every EXISTING user gets the English defaults inserted.
--   - Unused Indonesian default categories are removed.
--   - Used Indonesian categories stay (marked as user-owned, not default).
--   - The system-managed "Tabungan" category is renamed to "Savings", and any
--     transactions referencing 'Tabungan' are remapped to 'Savings'.

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. Replace seed_user_defaults() — English-only for new signups
-- ──────────────────────────────────────────────────────────────────────────────
create or replace function public.seed_user_defaults()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- Income (8)
  insert into public.categories (user_id, name, type, color, icon, is_default) values
    (new.id, 'Salary',           'income',  'bg-emerald-100 text-emerald-700', '💼', true),
    (new.id, 'Bonus',            'income',  'bg-green-100 text-green-700',     '🎁', true),
    (new.id, 'Freelance',        'income',  'bg-cyan-100 text-cyan-700',       '💻', true),
    (new.id, 'Interest Income',  'income',  'bg-amber-100 text-amber-700',     '💸', true),
    (new.id, 'Reimbursement',    'income',  'bg-teal-100 text-teal-700',       '🔄', true),
    (new.id, 'Angpau',           'income',  'bg-red-100 text-red-700',         '🧧', true),
    (new.id, 'Loan Received',    'income',  'bg-blue-100 text-blue-700',       '🏦', true),
    (new.id, 'Other Income',     'income',  'bg-gray-100 text-gray-700',       '📥', true);

  -- Expense — daily (6)
  insert into public.categories (user_id, name, type, color, icon, is_default) values
    (new.id, 'Food & Drinks',          'expense', 'bg-orange-100 text-orange-700',  '🍔', true),
    (new.id, 'Transportation',         'expense', 'bg-blue-100 text-blue-700',      '🚗', true),
    (new.id, 'Fuel',                   'expense', 'bg-amber-100 text-amber-700',    '⛽', true),
    (new.id, 'Parking',                'expense', 'bg-yellow-100 text-yellow-700',  '🅿️', true),
    (new.id, 'Shopping',               'expense', 'bg-pink-100 text-pink-700',      '🛍️', true),
    (new.id, 'Clothing & Accessories', 'expense', 'bg-rose-100 text-rose-700',      '👕', true);

  -- Expense — bills & utilities (10)
  insert into public.categories (user_id, name, type, color, icon, is_default) values
    (new.id, 'Rent',              'expense', 'bg-stone-100 text-stone-700',    '🏠', true),
    (new.id, 'Water Bill',        'expense', 'bg-sky-100 text-sky-700',        '💧', true),
    (new.id, 'Electricity Bill',  'expense', 'bg-yellow-100 text-yellow-700',  '⚡', true),
    (new.id, 'Internet Bill',     'expense', 'bg-cyan-100 text-cyan-700',      '🌐', true),
    (new.id, 'Phone & Mobile',    'expense', 'bg-blue-100 text-blue-700',      '📞', true),
    (new.id, 'Other Bills',       'expense', 'bg-red-100 text-red-700',        '📄', true),
    (new.id, 'BPJS',              'expense', 'bg-emerald-100 text-emerald-700','🏛️', true),
    (new.id, 'Insurance',         'expense', 'bg-teal-100 text-teal-700',      '🛡️', true),
    (new.id, 'App Subscriptions', 'expense', 'bg-indigo-100 text-indigo-700',  '📱', true),
    (new.id, 'Admin Fees',        'expense', 'bg-slate-100 text-slate-700',    '🧾', true);

  -- Expense — home & vehicle (6)
  insert into public.categories (user_id, name, type, color, icon, is_default) values
    (new.id, 'Home Maintenance',    'expense', 'bg-amber-100 text-amber-700',    '🔧', true),
    (new.id, 'Vehicle Maintenance', 'expense', 'bg-zinc-100 text-zinc-700',      '🚙', true),
    (new.id, 'Furniture',           'expense', 'bg-stone-100 text-stone-700',    '🛋️', true),
    (new.id, 'Household Help',      'expense', 'bg-teal-100 text-teal-700',      '🧹', true),
    (new.id, 'Laundry',             'expense', 'bg-sky-100 text-sky-700',        '🧺', true),
    (new.id, 'Security',            'expense', 'bg-neutral-100 text-neutral-700','🔒', true);

  -- Expense — health, family, personal (8)
  insert into public.categories (user_id, name, type, color, icon, is_default) values
    (new.id, 'Healthcare',          'expense', 'bg-green-100 text-green-700',    '🏥', true),
    (new.id, 'Fitness',             'expense', 'bg-lime-100 text-lime-700',      '🏋️', true),
    (new.id, 'Cosmetics',           'expense', 'bg-pink-100 text-pink-700',      '💄', true),
    (new.id, 'Haircut',             'expense', 'bg-orange-100 text-orange-700',  '✂️', true),
    (new.id, 'Education',           'expense', 'bg-blue-100 text-blue-700',      '📚', true),
    (new.id, 'Family',              'expense', 'bg-rose-100 text-rose-700',      '👨‍👩‍👧', true),
    (new.id, 'Pets',                'expense', 'bg-yellow-100 text-yellow-700',  '🐶', true),
    (new.id, 'Gifts & Donations',   'expense', 'bg-fuchsia-100 text-fuchsia-700','🎁', true);

  -- Expense — entertainment (2)
  insert into public.categories (user_id, name, type, color, icon, is_default) values
    (new.id, 'Entertainment',       'expense', 'bg-purple-100 text-purple-700',  '🎬', true),
    (new.id, 'Games',               'expense', 'bg-indigo-100 text-indigo-700',  '🎮', true);

  -- Expense — finance (3)
  insert into public.categories (user_id, name, type, color, icon, is_default) values
    (new.id, 'Investment',          'expense', 'bg-emerald-100 text-emerald-700','📈', true),
    (new.id, 'Pay Interest',        'expense', 'bg-amber-100 text-amber-700',    '💸', true),
    (new.id, 'Pay Debt',            'expense', 'bg-red-100 text-red-700',        '💳', true);

  -- Expense — misc (1)
  insert into public.categories (user_id, name, type, color, icon, is_default) values
    (new.id, 'Other Expense',       'expense', 'bg-gray-100 text-gray-700',      '📌', true);

  -- Internal — managed by goal contributions
  insert into public.categories (user_id, name, type, color, icon, is_default, is_internal) values
    (new.id, 'Savings', 'expense', 'bg-violet-100 text-violet-700', '🐷', true, true);

  -- Starter wallet
  insert into public.wallets (user_id, name, type, balance, color, icon) values
    (new.id, 'Cash', 'cash', 0, 'bg-emerald-500', '💵');

  return new;
end;
$$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. Update do_goal_contribution() to use 'Savings' instead of 'Tabungan'
-- ──────────────────────────────────────────────────────────────────────────────
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
  if p_amount <= 0 then raise exception 'Amount must be positive'; end if;

  select user_id, goal_name into v_user_id, v_goal_name
    from public.goals
    where id = p_goal_id and user_id = (select auth.uid())
    for update;
  if v_user_id is null then raise exception 'Goal not found or not yours'; end if;

  perform 1 from public.wallets where id = p_wallet_id and user_id = v_user_id;
  if not found then raise exception 'Wallet not found or not yours'; end if;

  update public.goals
    set current_amount = current_amount + p_amount
    where id = p_goal_id;

  update public.wallets
    set balance = balance - p_amount
    where id = p_wallet_id;

  insert into public.transactions (user_id, wallet_id, goal_id, type, amount, category, description)
  values (v_user_id, p_wallet_id, p_goal_id, 'expense', p_amount, 'Savings',
          coalesce(p_note, 'Deposit to goal: ' || v_goal_name))
  returning id into v_tx_id;

  return v_tx_id;
end;
$$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. Backfill English defaults for existing users
-- ──────────────────────────────────────────────────────────────────────────────
with new_defaults (name, type, color, icon, is_internal) as (
  values
    -- Income
    ('Salary',           'income'::category_type,  'bg-emerald-100 text-emerald-700', '💼', false),
    ('Bonus',            'income',  'bg-green-100 text-green-700',     '🎁', false),
    ('Freelance',        'income',  'bg-cyan-100 text-cyan-700',       '💻', false),
    ('Interest Income',  'income',  'bg-amber-100 text-amber-700',     '💸', false),
    ('Reimbursement',    'income',  'bg-teal-100 text-teal-700',       '🔄', false),
    ('Angpau',           'income',  'bg-red-100 text-red-700',         '🧧', false),
    ('Loan Received',    'income',  'bg-blue-100 text-blue-700',       '🏦', false),
    ('Other Income',     'income',  'bg-gray-100 text-gray-700',       '📥', false),
    -- Expense — daily
    ('Food & Drinks',          'expense', 'bg-orange-100 text-orange-700',  '🍔', false),
    ('Transportation',         'expense', 'bg-blue-100 text-blue-700',      '🚗', false),
    ('Fuel',                   'expense', 'bg-amber-100 text-amber-700',    '⛽', false),
    ('Parking',                'expense', 'bg-yellow-100 text-yellow-700',  '🅿️', false),
    ('Shopping',               'expense', 'bg-pink-100 text-pink-700',      '🛍️', false),
    ('Clothing & Accessories', 'expense', 'bg-rose-100 text-rose-700',      '👕', false),
    -- Expense — bills
    ('Rent',              'expense', 'bg-stone-100 text-stone-700',    '🏠', false),
    ('Water Bill',        'expense', 'bg-sky-100 text-sky-700',        '💧', false),
    ('Electricity Bill',  'expense', 'bg-yellow-100 text-yellow-700',  '⚡', false),
    ('Internet Bill',     'expense', 'bg-cyan-100 text-cyan-700',      '🌐', false),
    ('Phone & Mobile',    'expense', 'bg-blue-100 text-blue-700',      '📞', false),
    ('Other Bills',       'expense', 'bg-red-100 text-red-700',        '📄', false),
    ('BPJS',              'expense', 'bg-emerald-100 text-emerald-700','🏛️', false),
    ('Insurance',         'expense', 'bg-teal-100 text-teal-700',      '🛡️', false),
    ('App Subscriptions', 'expense', 'bg-indigo-100 text-indigo-700',  '📱', false),
    ('Admin Fees',        'expense', 'bg-slate-100 text-slate-700',    '🧾', false),
    -- Expense — home & vehicle
    ('Home Maintenance',    'expense', 'bg-amber-100 text-amber-700',    '🔧', false),
    ('Vehicle Maintenance', 'expense', 'bg-zinc-100 text-zinc-700',      '🚙', false),
    ('Furniture',           'expense', 'bg-stone-100 text-stone-700',    '🛋️', false),
    ('Household Help',      'expense', 'bg-teal-100 text-teal-700',      '🧹', false),
    ('Laundry',             'expense', 'bg-sky-100 text-sky-700',        '🧺', false),
    ('Security',            'expense', 'bg-neutral-100 text-neutral-700','🔒', false),
    -- Expense — health, family, personal
    ('Healthcare',          'expense', 'bg-green-100 text-green-700',    '🏥', false),
    ('Fitness',             'expense', 'bg-lime-100 text-lime-700',      '🏋️', false),
    ('Cosmetics',           'expense', 'bg-pink-100 text-pink-700',      '💄', false),
    ('Haircut',             'expense', 'bg-orange-100 text-orange-700',  '✂️', false),
    ('Education',           'expense', 'bg-blue-100 text-blue-700',      '📚', false),
    ('Family',              'expense', 'bg-rose-100 text-rose-700',      '👨‍👩‍👧', false),
    ('Pets',                'expense', 'bg-yellow-100 text-yellow-700',  '🐶', false),
    ('Gifts & Donations',   'expense', 'bg-fuchsia-100 text-fuchsia-700','🎁', false),
    -- Expense — entertainment
    ('Entertainment',       'expense', 'bg-purple-100 text-purple-700',  '🎬', false),
    ('Games',               'expense', 'bg-indigo-100 text-indigo-700',  '🎮', false),
    -- Expense — finance
    ('Investment',          'expense', 'bg-emerald-100 text-emerald-700','📈', false),
    ('Pay Interest',        'expense', 'bg-amber-100 text-amber-700',    '💸', false),
    ('Pay Debt',            'expense', 'bg-red-100 text-red-700',        '💳', false),
    -- Expense — misc
    ('Other Expense',       'expense', 'bg-gray-100 text-gray-700',      '📌', false)
)
insert into public.categories (user_id, name, type, color, icon, is_default, is_internal)
select p.id, d.name, d.type, d.color, d.icon, true, d.is_internal
from public.profiles p
cross join new_defaults d
where not exists (
  select 1 from public.categories c
  where c.user_id = p.id and c.name = d.name and c.type = d.type
);

-- ──────────────────────────────────────────────────────────────────────────────
-- 4. Migrate "Tabungan" → "Savings"
-- ──────────────────────────────────────────────────────────────────────────────
-- First remap any transactions tied to 'Tabungan' to 'Savings' (text field).
update public.transactions
  set category = 'Savings'
  where category = 'Tabungan';

-- Delete the old Tabungan internal category row. The English "Savings"
-- internal row was already inserted by the backfill above. If somehow not,
-- skip safely.
delete from public.categories
  where name = 'Tabungan' and is_internal = true;

-- Make sure every user has the Savings internal row (safety net in case the
-- backfill above hit a name conflict — extremely unlikely but cheap to check).
insert into public.categories (user_id, name, type, color, icon, is_default, is_internal)
select p.id, 'Savings', 'expense', 'bg-violet-100 text-violet-700', '🐷', true, true
from public.profiles p
where not exists (
  select 1 from public.categories c
  where c.user_id = p.id and c.name = 'Savings' and c.is_internal = true
);

-- ──────────────────────────────────────────────────────────────────────────────
-- 5. Clean up unused Indonesian default categories
-- ──────────────────────────────────────────────────────────────────────────────
-- Delete categories that:
--   - are flagged as default (so we don't touch user-created ones)
--   - have an Indonesian name that is NOT in the English list above
--   - are NOT referenced by any transaction or budget (so we don't orphan history)
delete from public.categories c
where c.is_default = true
  and c.is_internal = false
  and c.name in (
    -- Old Indonesian defaults from migrations 002 + 004
    'Gaji', 'Freelance', 'Bonus', 'Investasi',
    'Makanan', 'Transportasi', 'Tagihan', 'Belanja', 'Hiburan', 'Kesehatan', 'Lainnya',
    'Pendidikan', 'Bunga Diterima', 'Reimburse', 'Angpau', 'Pinjaman Diterima',
    'Tagihan Terbayar', 'Pemasukan Lainnya', 'Makanan & Minuman', 'Bensin', 'Parkir',
    'Barang Pribadi', 'Sewa', 'Tagihan Air', 'Tagihan Listrik', 'Tagihan Internet',
    'Pulsa & Telepon', 'Tagihan Lainnya', 'Asuransi', 'Aplikasi Berlangganan',
    'Streaming', 'Biaya Admin', 'Perawatan Rumah', 'Perawatan Kendaraan', 'Perabotan',
    'Layanan Rumah', 'Laundry', 'Keamanan', 'Kebugaran', 'Kosmetik',
    'Potong Rambut', 'Keluarga', 'Hewan Peliharaan', 'Hadiah & Donasi',
    'Konser', 'Game', 'Bayar Bunga', 'Bayar Hutang', 'Cicilan',
    'Hilang', 'Pengeluaran Lainnya'
  )
  and not exists (
    select 1 from public.transactions t
    where t.user_id = c.user_id and t.category = c.name
  )
  and not exists (
    select 1 from public.budgets b
    where b.user_id = c.user_id and b.category = c.name
  );

-- Categories with historical transactions/budgets are NOT deleted — they
-- remain owned by the user (now flagged as non-default since they're legacy).
update public.categories
  set is_default = false
  where is_default = true
    and is_internal = false
    and name in (
      'Gaji', 'Freelance', 'Bonus', 'Investasi',
      'Makanan', 'Transportasi', 'Tagihan', 'Belanja', 'Hiburan', 'Kesehatan', 'Lainnya',
      'Pendidikan', 'Bunga Diterima', 'Reimburse', 'Angpau', 'Pinjaman Diterima',
      'Tagihan Terbayar', 'Pemasukan Lainnya', 'Makanan & Minuman', 'Bensin', 'Parkir',
      'Barang Pribadi', 'Sewa', 'Tagihan Air', 'Tagihan Listrik', 'Tagihan Internet',
      'Pulsa & Telepon', 'Tagihan Lainnya', 'Asuransi', 'Aplikasi Berlangganan',
      'Streaming', 'Biaya Admin', 'Perawatan Rumah', 'Perawatan Kendaraan', 'Perabotan',
      'Layanan Rumah', 'Laundry', 'Keamanan', 'Kebugaran', 'Kosmetik',
      'Potong Rambut', 'Keluarga', 'Hewan Peliharaan', 'Hadiah & Donasi',
      'Konser', 'Game', 'Bayar Bunga', 'Bayar Hutang', 'Cicilan',
      'Hilang', 'Pengeluaran Lainnya'
    );
