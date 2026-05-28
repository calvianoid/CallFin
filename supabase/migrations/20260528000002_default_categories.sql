-- Auto-seed default categories + a "Tunai" wallet for every new user.
-- Runs after profiles row is created.

create or replace function public.seed_user_defaults()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- Default income categories
  insert into public.categories (user_id, name, type, color, icon, is_default) values
    (new.id, 'Gaji',       'income',  'bg-emerald-100 text-emerald-700', '💼', true),
    (new.id, 'Freelance',  'income',  'bg-cyan-100 text-cyan-700',       '💻', true),
    (new.id, 'Bonus',      'income',  'bg-green-100 text-green-700',     '🎁', true),
    (new.id, 'Investasi',  'income',  'bg-indigo-100 text-indigo-700',   '📈', true);

  -- Default expense categories
  insert into public.categories (user_id, name, type, color, icon, is_default) values
    (new.id, 'Makanan',      'expense', 'bg-orange-100 text-orange-700', '🍔', true),
    (new.id, 'Transportasi', 'expense', 'bg-blue-100 text-blue-700',     '🚗', true),
    (new.id, 'Tagihan',      'expense', 'bg-red-100 text-red-700',       '📄', true),
    (new.id, 'Belanja',      'expense', 'bg-pink-100 text-pink-700',     '🛍️', true),
    (new.id, 'Hiburan',      'expense', 'bg-purple-100 text-purple-700', '🎬', true),
    (new.id, 'Kesehatan',    'expense', 'bg-green-100 text-green-700',   '🏥', true),
    (new.id, 'Lainnya',      'expense', 'bg-gray-100 text-gray-700',     '📌', true);

  -- Internal category (managed by system for goal contributions)
  insert into public.categories (user_id, name, type, color, icon, is_default, is_internal) values
    (new.id, 'Tabungan', 'expense', 'bg-violet-100 text-violet-700', '🐷', true, true);

  -- Starter wallet
  insert into public.wallets (user_id, name, type, balance, color, icon) values
    (new.id, 'Tunai', 'cash', 0, 'bg-emerald-500', '💵');

  return new;
end;
$$;

create trigger seed_defaults_on_profile_create
  after insert on public.profiles
  for each row execute function public.seed_user_defaults();
