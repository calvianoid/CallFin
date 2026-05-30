-- ============================================================================
-- CallFin — Seed Demo Persona "Andi"
-- ----------------------------------------------------------------------------
-- Mengisi akunmu dengan ~12 bulan transaksi realistis (software engineer
-- Jakarta) supaya halaman Reports & Financial Freedom punya angka yang masuk
-- akal saat presentasi.
--
-- CARA PAKAI:
--   1. Register / login dulu di https://callfin.vercel.app (biar akunmu ada).
--   2. Ganti email di baris `v_email` di bawah dengan email akunmu.
--   3. Jalankan SELURUH file ini di Supabase → SQL Editor → Run.
--   4. Refresh app. Persona Andi muncul (saldo, transaksi, goal FIRE, dll).
--
-- Aman dijalankan berulang: data lama user ini dihapus dulu tiap run.
-- ============================================================================

-- Helper variasi deterministik (±swing di sekitar base, dibulatkan ke 1.000).
create or replace function pg_temp.vary(base numeric, seed numeric, swing numeric)
returns numeric language sql immutable as $$
  select round((base + sin(seed * 1.7 + 0.5) * swing) / 1000) * 1000;
$$;

do $$
declare
  ----------------------------------------------------------------------------
  v_email text := 'GANTI_DENGAN@EMAIL_KAMU.COM';   -- ← GANTI INI
  ----------------------------------------------------------------------------
  uid       uuid;
  w_cash    uuid;
  w_bca     uuid;
  w_invest  uuid;
  w_gopay   uuid;
  w_credit  uuid;
  i         int;
  m_date    date;        -- first day of each month
  is_dec    boolean;
  cur_month text;
begin
  -- Resolve the auth user by email
  select id into uid from auth.users where email = v_email;
  if uid is null then
    raise exception 'User dengan email "%" tidak ditemukan. Register dulu di app, lalu jalankan ulang.', v_email;
  end if;

  -- Wipe this user's existing data (urutan penting karena FK) ----------------
  delete from public.transactions where user_id = uid;
  delete from public.budgets      where user_id = uid;
  delete from public.goals        where user_id = uid;
  delete from public.wallets      where user_id = uid;

  -- Wallets (balance diisi 0 dulu; di-set ke nilai final di akhir) -----------
  insert into public.wallets (user_id, name, type, balance, color, icon)
    values (uid, 'Tunai', 'cash', 0, 'bg-emerald-500', '💵') returning id into w_cash;
  insert into public.wallets (user_id, name, type, balance, color, icon)
    values (uid, 'BCA', 'bank', 0, 'bg-blue-600', '🏦') returning id into w_bca;
  insert into public.wallets (user_id, name, type, balance, color, icon)
    values (uid, 'Investasi', 'bank', 0, 'bg-violet-500', '📈') returning id into w_invest;
  insert into public.wallets (user_id, name, type, balance, color, icon)
    values (uid, 'GoPay', 'ewallet', 0, 'bg-sky-500', '📱') returning id into w_gopay;
  insert into public.wallets (user_id, name, type, balance, color, icon)
    values (uid, 'Kartu Kredit', 'credit', 0, 'bg-rose-500', '💳') returning id into w_credit;

  -- 12 bulan terakhir (i=0 paling lama, i=11 = bulan ini) --------------------
  for i in 0..11 loop
    m_date := (date_trunc('month', current_date) - make_interval(months => 11 - i))::date;
    is_dec := extract(month from m_date) = 12;

    -- Income
    insert into public.transactions (user_id, wallet_id, type, amount, category, description, date)
      values (uid, w_bca, 'income', 18000000, 'Salary', 'Gaji bulanan', m_date + 24);
    if i % 3 = 0 then
      insert into public.transactions (user_id, wallet_id, type, amount, category, description, date)
        values (uid, w_bca, 'income', pg_temp.vary(3000000, i, 800000), 'Freelance', 'Proyek sampingan', m_date + 14);
    end if;
    if is_dec then
      insert into public.transactions (user_id, wallet_id, type, amount, category, description, date)
        values (uid, w_bca, 'income', 18000000, 'Bonus', 'Bonus akhir tahun', m_date + 19);
    end if;

    -- Fixed bills
    insert into public.transactions (user_id, wallet_id, type, amount, category, description, date) values
      (uid, w_bca,   'expense', 3500000,                          'Rent',              'Sewa apartemen',          m_date + 1),
      (uid, w_bca,   'expense', pg_temp.vary(420000, i, 80000),   'Electricity Bill',  'Token listrik',           m_date + 4),
      (uid, w_bca,   'expense', 150000,                           'Water Bill',        'Tagihan air',             m_date + 4),
      (uid, w_bca,   'expense', 350000,                           'Internet Bill',     'WiFi rumah',              m_date + 7),
      (uid, w_gopay, 'expense', 100000,                           'Phone & Mobile',    'Pulsa & paket data',      m_date + 7),
      (uid, w_bca,   'expense', 185000,                           'App Subscriptions', 'Netflix, Spotify, iCloud',m_date + 9);

    -- Food & Drinks
    insert into public.transactions (user_id, wallet_id, type, amount, category, description, date) values
      (uid, w_bca,    'expense', pg_temp.vary(750000, i,     100000), 'Food & Drinks', 'Belanja groceries',    m_date + 3),
      (uid, w_bca,    'expense', pg_temp.vary(700000, i + 1, 100000), 'Food & Drinks', 'Belanja groceries',    m_date + 17),
      (uid, w_gopay,  'expense', pg_temp.vary(450000, i + 2, 120000), 'Food & Drinks', 'Makan di luar',        m_date + 8),
      (uid, w_credit, 'expense', pg_temp.vary(520000, i + 3, 150000), 'Food & Drinks', 'Nongkrong akhir pekan',m_date + 22),
      (uid, w_cash,   'expense', pg_temp.vary(380000, i + 4, 80000),  'Food & Drinks', 'Kopi & cemilan',       m_date + 13);

    -- Transport
    insert into public.transactions (user_id, wallet_id, type, amount, category, description, date) values
      (uid, w_gopay, 'expense', pg_temp.vary(600000, i,     120000), 'Transportation', 'Ojek & taksi online', m_date + 11),
      (uid, w_cash,  'expense', pg_temp.vary(400000, i + 2, 80000),  'Fuel',           'Bensin motor',        m_date + 5);

    -- Lifestyle
    insert into public.transactions (user_id, wallet_id, type, amount, category, description, date) values
      (uid, w_credit, 'expense', pg_temp.vary(900000, i,     500000), 'Shopping',      'Belanja online',  m_date + 16),
      (uid, w_credit, 'expense', pg_temp.vary(420000, i + 1, 150000), 'Entertainment', 'Nonton & game',   m_date + 19),
      (uid, w_bca,    'expense', 400000,                              'Fitness',       'Membership gym',  m_date + 2);

    -- One-offs (bikin tiap bulan beda)
    if i = 2 then
      insert into public.transactions (user_id, wallet_id, type, amount, category, description, date)
        values (uid, w_bca, 'expense', 1200000, 'Vehicle Maintenance', 'Servis & ganti oli', m_date + 10);
    end if;
    if i = 5 then
      insert into public.transactions (user_id, wallet_id, type, amount, category, description, date)
        values (uid, w_bca, 'expense', 1500000, 'Healthcare', 'Cek kesehatan & obat', m_date + 12);
    end if;
    if is_dec then
      insert into public.transactions (user_id, wallet_id, type, amount, category, description, date) values
        (uid, w_credit, 'expense', 2000000, 'Gifts & Donations', 'Kado & donasi akhir tahun', m_date + 21),
        (uid, w_credit, 'expense', 1500000, 'Shopping',          'Belanja liburan',           m_date + 26);
    end if;
    if i = 8 then
      insert into public.transactions (user_id, wallet_id, type, amount, category, description, date)
        values (uid, w_credit, 'expense', 1400000, 'Clothing & Accessories', 'Beli baju kerja', m_date + 15);
    end if;
    if i = 10 then
      insert into public.transactions (user_id, wallet_id, type, amount, category, description, date)
        values (uid, w_bca, 'expense', 2500000, 'Education', 'Kursus online & buku', m_date + 18);
    end if;
  end loop;

  -- Goals (termasuk goal khusus Kebebasan Finansial) -------------------------
  insert into public.goals (user_id, goal_name, target_amount, current_amount, deadline) values
    (uid, 'Kebebasan Finansial', 3300000000, 215000000, (current_date + interval '14 years')::date),
    (uid, 'Dana Darurat',          66000000,  45000000, (current_date + interval '7 months')::date),
    (uid, 'DP Rumah',             300000000,  85000000, (current_date + interval '2 years')::date),
    (uid, 'Liburan Jepang',        35000000,  12000000, (current_date + interval '6 months')::date);

  -- Budget bulan ini ---------------------------------------------------------
  cur_month := to_char(current_date, 'YYYY-MM');
  insert into public.budgets (user_id, category, limit_amount, month_year) values
    (uid, 'Food & Drinks',   3500000, cur_month),
    (uid, 'Transportation',  1200000, cur_month),
    (uid, 'Entertainment',    700000, cur_month),
    (uid, 'Shopping',        1500000, cur_month),
    (uid, 'Rent',            3500000, cur_month)
  on conflict (user_id, category, month_year) do nothing;

  -- Set saldo dompet final (override apa pun yang dihitung trigger) ----------
  update public.wallets set balance =    1500000 where id = w_cash;
  update public.wallets set balance =   47000000 where id = w_bca;
  update public.wallets set balance =  215000000 where id = w_invest;
  update public.wallets set balance =     800000 where id = w_gopay;
  update public.wallets set balance =   -3200000 where id = w_credit;

  raise notice 'Seed selesai untuk user % (%). Refresh app-nya.', v_email, uid;
end $$;
