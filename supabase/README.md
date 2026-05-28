# CallFin — Backend (Supabase)

This folder contains the database schema, RLS policies, and seed logic for
CallFin. Mirrors the FE data model defined in `src/types` and `src/lib/store.tsx`.

## Schema Overview

| Table          | Purpose                                                   |
|----------------|-----------------------------------------------------------|
| `profiles`     | One row per auth user. Display info + locale/theme prefs. |
| `wallets`      | Multi-wallet support (cash / bank / e-wallet / credit).   |
| `categories`   | User-customizable income & expense categories.            |
| `transactions` | Income, expense, transfer, and goal-contribution records. |
| `budgets`      | Per-category monthly spending caps.                       |
| `goals`        | Financial targets (dana darurat, liburan, etc.).          |
| `chat_history` | AI agent memory.                                          |

**View** `budget_status` — computed `spent` per budget from matching expense
transactions in the same month. Use this instead of `budgets` when reading.

**RPC functions:**
- `do_transfer(from, to, amount, desc?)` — atomic wallet-to-wallet move.
- `do_goal_contribution(goal, wallet, amount, note?)` — atomic goal funding.

Both update wallet balances and create the transaction row in a single
transaction-level operation, with ownership checks via RLS-aware `auth.uid()`.

## Setup

### 1. Create a Supabase project
https://supabase.com/dashboard → new project. Copy the project URL + anon key.

### 2. Configure env
```
cp .env.local.example .env.local
```
Fill in:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```
The app **auto-detects** these — when missing, it falls back to the in-memory
mock store so local dev still works.

### 3. Apply migrations

**Option A — Supabase CLI** (recommended):
```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

**Option B — Manual** (Dashboard → SQL Editor → New query):
Paste each file in this order:
1. `migrations/20260528000000_initial_schema.sql`
2. `migrations/20260528000001_rls_policies.sql`
3. `migrations/20260528000002_default_categories.sql`

### 4. (Optional) Generate fresh TypeScript types
```bash
npx supabase gen types typescript --project-id <ID> --schema public \
  > src/lib/supabase/types.gen.ts
```
Then in `src/lib/supabase/browser-client.ts` and `server-client.ts`, swap
`from "./types"` to `from "./types.gen"`.

## Auth Flow

- Sign-up triggers `on_auth_user_created` → creates `profiles` row.
- `profiles` insert triggers `seed_defaults_on_profile_create` → creates 12
  default categories + a starter "Tunai" wallet.
- Middleware (`src/middleware.ts`) refreshes the session on every request and
  redirects unauthenticated users to `/login` (except `/login`, `/register`).
- Public/auth pages: `/login`, `/register`.
- `signIn`, `signUp`, `signOut` server actions live in `src/lib/api/auth.ts`.

## RLS Summary

Every table has `enable row level security`. Policies are uniformly:
- **SELECT/INSERT/UPDATE/DELETE** require `auth.uid() = user_id`.
- `profiles` insert happens via the auth trigger (security definer).
- `categories.delete` additionally requires `is_internal = false` — the
  system-managed "Tabungan" category can't be deleted by users.

## API Surface

Server actions in `src/lib/api/`:

| File                  | Functions                                                                                  |
|-----------------------|--------------------------------------------------------------------------------------------|
| `auth.ts`             | `signIn`, `signUp`, `signOut`                                                              |
| `profile.ts`          | `getProfile`, `updateProfile`                                                              |
| `wallets.ts`          | `listWallets`, `createWallet`, `updateWallet`, `deleteWallet`, `transferBetweenWallets`    |
| `transactions.ts`     | `listTransactions` (filterable), `createTransaction`, `deleteTransaction`                  |
| `budgets.ts`          | `listBudgets` (uses `budget_status` view), `createBudget`, `updateBudget`, `deleteBudget`  |
| `goals.ts`            | `listGoals`, `createGoal`, `updateGoal`, `deleteGoal`, `contributeToGoal`                  |
| `categories.ts`       | `listCategories`, `createCategory`, `updateCategory`, `deleteCategory`                     |
| `chat-history.ts`     | `listChatHistory`, `appendChatMessage`, `clearChatHistory`                                 |

All return FE-shape types (camelCase IDs etc.) thanks to `mappers.ts`.

## FE Integration Status

- ✅ **Hydration**: `StoreProvider` automatically loads all data from Supabase
  on mount when env vars are present. Falls back to mock data if the user
  isn't authenticated or the request fails.
- ✅ **Auth pages**: Login/register/logout wired to real Supabase Auth, with
  silent fallback to mock when not configured.
- ⏭ **Mutations**: Currently still use the in-memory store (instant, optimistic).
  To persist mutations, wrap each store action with the matching server
  action — e.g., inside `addWallet`, call `await import("./api/wallets").then(m => m.createWallet(w))`
  before/after the local `setWallets`. Order:
  1. Optimistic local update
  2. Fire-and-forget server action
  3. On error → revert local + show toast

See "Migrating mutations to Supabase" in the project README for the full
recipe.
