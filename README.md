<div align="center">

# 💸 CallFin — AI Finance Assistant

**Catat, lacak, dan perbaiki kondisi keuanganmu lewat obrolan AI.**

Aplikasi manajemen keuangan pribadi berbahasa Indonesia & Inggris. Cukup ketik
seperti ngobrol — _"Makan siang 50 ribu pakai GoPay"_ — dan CallFin yang mengisi
form, mengkategorikan, dan memperbarui saldo dompetmu.

[**🌐 Live Demo**](https://callfin.vercel.app) · [Lapor Bug](https://github.com/calvianoid/CallFin/issues)

</div>

---

## ✨ Apa Itu CallFin?

CallFin adalah dashboard keuangan pribadi yang dikendalikan lewat **chat AI**.
Alih-alih mengisi form panjang, kamu cukup mengetik transaksi dengan bahasa
sehari-hari dan AI akan menafsirkannya — selalu dengan **konfirmasi dulu** sebelum
dicatat, jadi tidak ada yang masuk tanpa persetujuanmu.

Cocok untuk siapa saja yang ingin melacak pemasukan/pengeluaran lintas dompet
(tunai, bank, e-wallet, kartu kredit), mengatur budget bulanan, dan menabung ke
target finansial — tanpa ribet.

## 🧠 Filosofi Nama

> **CallFin = _Call_ + _Fin_**

- **_Call_** 📞 — karena cara pakainya seperti **memanggil** seorang teman lalu
  ngobrol. Tidak ada form yang bikin pusing; kamu cukup "memanggil" asistenmu
  dan bilang _"tadi jajan 20 ribu"_. Mengelola uang harusnya semudah mengirim
  satu pesan.
- **_Fin_** 💰 — dari **Fin**ance / **Fin**ansial. Singkat, ramah, dan terdengar
  seperti nama panggilan — biar urusan duit terasa kayak ngobrol sama kawan,
  bukan ngadep akuntan.

Filosofinya sederhana: **keuangan yang baik dimulai dari kebiasaan yang ringan.**
Semakin gampang mencatat, semakin sering kamu melakukannya — dan semakin jelas
ke mana perginya uangmu. Jadi alih-alih aplikasi yang menuntut disiplin tinggi,
CallFin cuma minta kamu... _ngobrol_. 😄

## 🚀 Fitur Utama

| Fitur | Penjelasan |
|-------|-----------|
| 💬 **Chat AI** | Ketik transaksi pakai bahasa natural, AI parse otomatis lalu minta konfirmasi. Bisa juga tanya kondisi keuangan: _"Berapa pengeluaran bulan ini?"_ |
| 👛 **Multi-dompet** | Kelola banyak sumber dana — tunai, bank, e-wallet, kartu kredit. Saldo update otomatis. |
| 🔄 **Transfer antar dompet** | Pindahkan saldo antar dompet; tidak dihitung sebagai pemasukan/pengeluaran. |
| 🎯 **Financial Goals** | Tetapkan target (dana darurat, liburan, dll) dan setor dana dari dompet manapun. |
| 📊 **Budget bulanan** | Atur batas pengeluaran per kategori, dengan peringatan saat hampir habis. |
| 🏷️ **Kategori kustom** | Katalog kategori bawaan ala Money Lover + bikin sendiri. |
| 📈 **Laporan lengkap** | KPI, chart per kategori, tren 6 bulan, aktivitas harian, insight AI — bisa di-export PDF. |
| 📥 **Import CSV** | Wizard import data lama dari Money Lover dengan pemetaan dompet & kategori. |
| 🌗 **Dark mode** | Light / dark / ikut sistem. |
| 🌍 **Dwibahasa** | Indonesia 🇮🇩 & English 🇬🇧 — termasuk chat AI-nya. |

## 🛠️ Tech Stack

- **Framework** — [Next.js 16](https://nextjs.org) (App Router, Server Actions, Turbopack)
- **Bahasa** — TypeScript (strict)
- **Styling** — Tailwind CSS v4 + komponen ala shadcn ([Base UI](https://base-ui.com))
- **Backend** — [Supabase](https://supabase.com) (PostgreSQL, Auth, RLS, RPC, triggers)
- **AI** — [Vercel AI SDK](https://sdk.vercel.ai) + OpenAI (parser lokal sebagai fallback)
- **Chart** — [Recharts](https://recharts.org)
- **Lainnya** — next-themes, cmdk, papaparse, date-fns, lucide-react

> Aplikasi punya **mode demo** otomatis: tanpa env Supabase, app jalan dengan
> data mock supaya bisa langsung dilihat tanpa setup backend.

## 📦 Menjalankan Secara Lokal

### Prasyarat
- **Node.js ≥ 20.9** (Next.js 16). Repo ini ada shim `scripts/use-node21.sh`
  yang otomatis pakai Node v21.7.1 via nvm kalau system Node-mu lebih lama.

### Langkah

```bash
# 1. Clone & install
git clone https://github.com/calvianoid/CallFin.git
cd CallFin
npm install

# 2. (Opsional) Set env untuk mode live — lewati untuk mode demo
cp .env.local.example .env.local
# lalu isi nilainya (lihat di bawah)

# 3. Jalankan dev server
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

### Environment Variables

Semua opsional — tanpa ini app jalan di **mode demo** (data mock).

```env
# Supabase — backend & autentikasi
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenAI — perapihan deskripsi transaksi (opsional, ada fallback regex)
OPENAI_API_KEY=your_openai_api_key
```

### Setup Database (mode live)

Jalankan migrasi SQL di folder `supabase/migrations/` (urut sesuai nama file)
lewat Supabase SQL Editor atau CLI. Migrasi mencakup skema tabel, RLS policy,
kategori default, dan fungsi RPC atomik untuk transfer & setoran goal.

## 📂 Struktur Proyek

```
src/
├── app/
│   ├── (app)/               # Halaman utama (dashboard, transaksi, budget, dll)
│   ├── (auth)/              # Login & register
│   ├── api/                 # Route handler (chat, clean-description)
│   ├── layout.tsx           # Root layout + metadata (OG/Twitter cards)
│   └── opengraph-image.tsx  # OG image di-generate otomatis
├── components/
│   ├── chat/                # Antarmuka chat AI + kartu konfirmasi
│   ├── dashboard/           # Widget dashboard & chart
│   ├── forms/               # Dialog tambah/edit (transaksi, dompet, dll)
│   ├── import/              # Wizard import CSV
│   └── ui/                  # Komponen UI dasar (Base UI/shadcn)
└── lib/
    ├── api/                 # Server actions (Supabase)
    ├── i18n/                # Sistem dwibahasa (id/en)
    ├── chat-ai.ts           # Parser transaksi & Q&A (bilingual)
    ├── store.tsx            # State global (Context, hybrid mock/Supabase)
    └── supabase/            # Klien Supabase
supabase/migrations/         # Skema DB, RLS, RPC, trigger
```

## 📜 Scripts

| Perintah | Fungsi |
|----------|--------|
| `npm run dev` | Jalankan dev server (Turbopack) |
| `npm run build` | Build produksi |
| `npm run start` | Jalankan hasil build |
| `npm run lint` | Lint dengan ESLint |

## 🚢 Deploy

Di-deploy ke [Vercel](https://vercel.com). Push ke `main` → auto-deploy.
Set environment variables di dashboard Vercel untuk mengaktifkan mode live.

---

<div align="center">
<sub>Dibuat dengan ❤️ menggunakan Next.js & Supabase</sub>
</div>
