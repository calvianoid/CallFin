-- Replace the per-user defaults seeder with the expanded Money-Lover-inspired
-- catalogue (9 income + 47 expense + 1 internal "Tabungan").
--
-- This migration:
--   1. Replaces seed_user_defaults() so every NEW signup gets the new set.
--   2. Backfills the new categories for EXISTING users (only the names that
--      they don't already have — preserves their custom categories and any
--      transactions referencing them).

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. Updated seed function for new signups
-- ──────────────────────────────────────────────────────────────────────────────
create or replace function public.seed_user_defaults()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- Income
  insert into public.categories (user_id, name, type, color, icon, is_default) values
    (new.id, 'Gaji',              'income',  'bg-emerald-100 text-emerald-700', '💼', true),
    (new.id, 'Bonus',             'income',  'bg-green-100 text-green-700',     '🎁', true),
    (new.id, 'Freelance',         'income',  'bg-cyan-100 text-cyan-700',       '💻', true),
    (new.id, 'Bunga Diterima',    'income',  'bg-amber-100 text-amber-700',     '💸', true),
    (new.id, 'Reimburse',         'income',  'bg-teal-100 text-teal-700',       '🔄', true),
    (new.id, 'Angpau',            'income',  'bg-red-100 text-red-700',         '🧧', true),
    (new.id, 'Pinjaman Diterima', 'income',  'bg-blue-100 text-blue-700',       '🏦', true),
    (new.id, 'Tagihan Terbayar',  'income',  'bg-violet-100 text-violet-700',   '💰', true),
    (new.id, 'Pemasukan Lainnya', 'income',  'bg-gray-100 text-gray-700',       '📥', true);

  -- Expense — daily
  insert into public.categories (user_id, name, type, color, icon, is_default) values
    (new.id, 'Makanan & Minuman', 'expense', 'bg-orange-100 text-orange-700',   '🍔', true),
    (new.id, 'Transportasi',      'expense', 'bg-blue-100 text-blue-700',       '🚗', true),
    (new.id, 'Bensin',            'expense', 'bg-amber-100 text-amber-700',     '⛽', true),
    (new.id, 'Parkir',            'expense', 'bg-yellow-100 text-yellow-700',   '🅿️', true),
    (new.id, 'Belanja',           'expense', 'bg-pink-100 text-pink-700',       '🛍️', true),
    (new.id, 'Barang Pribadi',    'expense', 'bg-rose-100 text-rose-700',       '👕', true);

  -- Expense — bills
  insert into public.categories (user_id, name, type, color, icon, is_default) values
    (new.id, 'Sewa',                'expense', 'bg-stone-100 text-stone-700',   '🏠', true),
    (new.id, 'Tagihan Air',         'expense', 'bg-sky-100 text-sky-700',       '💧', true),
    (new.id, 'Tagihan Listrik',     'expense', 'bg-yellow-100 text-yellow-700', '⚡', true),
    (new.id, 'Tagihan Internet',    'expense', 'bg-cyan-100 text-cyan-700',     '🌐', true),
    (new.id, 'Pulsa & Telepon',     'expense', 'bg-blue-100 text-blue-700',     '📞', true),
    (new.id, 'Tagihan Lainnya',     'expense', 'bg-red-100 text-red-700',       '📄', true),
    (new.id, 'BPJS',                'expense', 'bg-emerald-100 text-emerald-700','🏛️', true),
    (new.id, 'Asuransi',            'expense', 'bg-teal-100 text-teal-700',     '🛡️', true),
    (new.id, 'Aplikasi Berlangganan','expense','bg-indigo-100 text-indigo-700', '📱', true),
    (new.id, 'Streaming',           'expense', 'bg-purple-100 text-purple-700', '📺', true),
    (new.id, 'Biaya Admin',         'expense', 'bg-slate-100 text-slate-700',   '🧾', true);

  -- Expense — home & vehicle
  insert into public.categories (user_id, name, type, color, icon, is_default) values
    (new.id, 'Perawatan Rumah',     'expense', 'bg-amber-100 text-amber-700',    '🔧', true),
    (new.id, 'Perawatan Kendaraan', 'expense', 'bg-zinc-100 text-zinc-700',      '🚙', true),
    (new.id, 'Perabotan',           'expense', 'bg-stone-100 text-stone-700',    '🛋️', true),
    (new.id, 'Layanan Rumah',       'expense', 'bg-teal-100 text-teal-700',      '🧹', true),
    (new.id, 'Laundry',             'expense', 'bg-sky-100 text-sky-700',        '🧺', true),
    (new.id, 'Keamanan',            'expense', 'bg-neutral-100 text-neutral-700','🔒', true);

  -- Expense — health, family, personal
  insert into public.categories (user_id, name, type, color, icon, is_default) values
    (new.id, 'Kesehatan',           'expense', 'bg-green-100 text-green-700',    '🏥', true),
    (new.id, 'Kebugaran',           'expense', 'bg-lime-100 text-lime-700',      '🏋️', true),
    (new.id, 'Kosmetik',            'expense', 'bg-pink-100 text-pink-700',      '💄', true),
    (new.id, 'Potong Rambut',       'expense', 'bg-orange-100 text-orange-700',  '✂️', true),
    (new.id, 'Pendidikan',          'expense', 'bg-blue-100 text-blue-700',      '📚', true),
    (new.id, 'Keluarga',            'expense', 'bg-rose-100 text-rose-700',      '👨‍👩‍👧', true),
    (new.id, 'Hewan Peliharaan',    'expense', 'bg-yellow-100 text-yellow-700',  '🐶', true),
    (new.id, 'Hadiah & Donasi',     'expense', 'bg-fuchsia-100 text-fuchsia-700','🎁', true);

  -- Expense — entertainment
  insert into public.categories (user_id, name, type, color, icon, is_default) values
    (new.id, 'Hiburan',             'expense', 'bg-purple-100 text-purple-700',  '🎬', true),
    (new.id, 'Konser',              'expense', 'bg-violet-100 text-violet-700',  '🎤', true),
    (new.id, 'Game',                'expense', 'bg-indigo-100 text-indigo-700',  '🎮', true);

  -- Expense — finance
  insert into public.categories (user_id, name, type, color, icon, is_default) values
    (new.id, 'Investasi',           'expense', 'bg-emerald-100 text-emerald-700','📈', true),
    (new.id, 'Bayar Bunga',         'expense', 'bg-amber-100 text-amber-700',    '💸', true),
    (new.id, 'Bayar Hutang',        'expense', 'bg-red-100 text-red-700',        '💳', true),
    (new.id, 'Cicilan',             'expense', 'bg-orange-100 text-orange-700',  '📆', true);

  -- Expense — misc
  insert into public.categories (user_id, name, type, color, icon, is_default) values
    (new.id, 'Hilang',              'expense', 'bg-neutral-100 text-neutral-700','❌', true),
    (new.id, 'Pengeluaran Lainnya', 'expense', 'bg-gray-100 text-gray-700',      '📌', true);

  -- Internal — managed by goal contributions
  insert into public.categories (user_id, name, type, color, icon, is_default, is_internal) values
    (new.id, 'Tabungan', 'expense', 'bg-violet-100 text-violet-700', '🐷', true, true);

  -- Starter wallet
  insert into public.wallets (user_id, name, type, balance, color, icon) values
    (new.id, 'Tunai', 'cash', 0, 'bg-emerald-500', '💵');

  return new;
end;
$$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. Backfill new defaults for existing users
-- ──────────────────────────────────────────────────────────────────────────────
-- Insert each new default category for every existing user, skipping any name
-- they already have (so we never duplicate or wipe their custom entries).

with new_defaults (name, type, color, icon, is_internal) as (
  values
    -- Income
    ('Gaji',              'income'::category_type,  'bg-emerald-100 text-emerald-700', '💼', false),
    ('Bonus',             'income',  'bg-green-100 text-green-700',     '🎁', false),
    ('Freelance',         'income',  'bg-cyan-100 text-cyan-700',       '💻', false),
    ('Bunga Diterima',    'income',  'bg-amber-100 text-amber-700',     '💸', false),
    ('Reimburse',         'income',  'bg-teal-100 text-teal-700',       '🔄', false),
    ('Angpau',            'income',  'bg-red-100 text-red-700',         '🧧', false),
    ('Pinjaman Diterima', 'income',  'bg-blue-100 text-blue-700',       '🏦', false),
    ('Tagihan Terbayar',  'income',  'bg-violet-100 text-violet-700',   '💰', false),
    ('Pemasukan Lainnya', 'income',  'bg-gray-100 text-gray-700',       '📥', false),
    -- Expense — daily
    ('Makanan & Minuman', 'expense', 'bg-orange-100 text-orange-700',   '🍔', false),
    ('Transportasi',      'expense', 'bg-blue-100 text-blue-700',       '🚗', false),
    ('Bensin',            'expense', 'bg-amber-100 text-amber-700',     '⛽', false),
    ('Parkir',            'expense', 'bg-yellow-100 text-yellow-700',   '🅿️', false),
    ('Belanja',           'expense', 'bg-pink-100 text-pink-700',       '🛍️', false),
    ('Barang Pribadi',    'expense', 'bg-rose-100 text-rose-700',       '👕', false),
    -- Expense — bills
    ('Sewa',                'expense', 'bg-stone-100 text-stone-700',   '🏠', false),
    ('Tagihan Air',         'expense', 'bg-sky-100 text-sky-700',       '💧', false),
    ('Tagihan Listrik',     'expense', 'bg-yellow-100 text-yellow-700', '⚡', false),
    ('Tagihan Internet',    'expense', 'bg-cyan-100 text-cyan-700',     '🌐', false),
    ('Pulsa & Telepon',     'expense', 'bg-blue-100 text-blue-700',     '📞', false),
    ('Tagihan Lainnya',     'expense', 'bg-red-100 text-red-700',       '📄', false),
    ('BPJS',                'expense', 'bg-emerald-100 text-emerald-700','🏛️', false),
    ('Asuransi',            'expense', 'bg-teal-100 text-teal-700',     '🛡️', false),
    ('Aplikasi Berlangganan','expense','bg-indigo-100 text-indigo-700', '📱', false),
    ('Streaming',           'expense', 'bg-purple-100 text-purple-700', '📺', false),
    ('Biaya Admin',         'expense', 'bg-slate-100 text-slate-700',   '🧾', false),
    -- Expense — home & vehicle
    ('Perawatan Rumah',     'expense', 'bg-amber-100 text-amber-700',    '🔧', false),
    ('Perawatan Kendaraan', 'expense', 'bg-zinc-100 text-zinc-700',      '🚙', false),
    ('Perabotan',           'expense', 'bg-stone-100 text-stone-700',    '🛋️', false),
    ('Layanan Rumah',       'expense', 'bg-teal-100 text-teal-700',      '🧹', false),
    ('Laundry',             'expense', 'bg-sky-100 text-sky-700',        '🧺', false),
    ('Keamanan',            'expense', 'bg-neutral-100 text-neutral-700','🔒', false),
    -- Expense — health, family, personal
    ('Kesehatan',           'expense', 'bg-green-100 text-green-700',    '🏥', false),
    ('Kebugaran',           'expense', 'bg-lime-100 text-lime-700',      '🏋️', false),
    ('Kosmetik',            'expense', 'bg-pink-100 text-pink-700',      '💄', false),
    ('Potong Rambut',       'expense', 'bg-orange-100 text-orange-700',  '✂️', false),
    ('Pendidikan',          'expense', 'bg-blue-100 text-blue-700',      '📚', false),
    ('Keluarga',            'expense', 'bg-rose-100 text-rose-700',      '👨‍👩‍👧', false),
    ('Hewan Peliharaan',    'expense', 'bg-yellow-100 text-yellow-700',  '🐶', false),
    ('Hadiah & Donasi',     'expense', 'bg-fuchsia-100 text-fuchsia-700','🎁', false),
    -- Expense — entertainment
    ('Hiburan',             'expense', 'bg-purple-100 text-purple-700',  '🎬', false),
    ('Konser',              'expense', 'bg-violet-100 text-violet-700',  '🎤', false),
    ('Game',                'expense', 'bg-indigo-100 text-indigo-700',  '🎮', false),
    -- Expense — finance
    ('Investasi',           'expense', 'bg-emerald-100 text-emerald-700','📈', false),
    ('Bayar Bunga',         'expense', 'bg-amber-100 text-amber-700',    '💸', false),
    ('Bayar Hutang',        'expense', 'bg-red-100 text-red-700',        '💳', false),
    ('Cicilan',             'expense', 'bg-orange-100 text-orange-700',  '📆', false),
    -- Expense — misc
    ('Hilang',              'expense', 'bg-neutral-100 text-neutral-700','❌', false),
    ('Pengeluaran Lainnya', 'expense', 'bg-gray-100 text-gray-700',      '📌', false)
)
insert into public.categories (user_id, name, type, color, icon, is_default, is_internal)
select p.id, d.name, d.type, d.color, d.icon, true, d.is_internal
from public.profiles p
cross join new_defaults d
where not exists (
  select 1 from public.categories c
  where c.user_id = p.id and c.name = d.name and c.type = d.type
);
