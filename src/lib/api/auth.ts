"use server";

import { getSupabaseServer } from "@/lib/supabase/server-client";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase/config";

/**
 * Some email patterns are syntactically valid per RFC but rejected by Supabase
 * Auth's stricter validator (e.g. plus-addressing `user+tag@x.com`). Catch them
 * client-side so users get a clearer error than the cryptic API response.
 */
function validateEmailLocal(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) return "Email wajib diisi.";
  if (trimmed.length > 254) return "Email terlalu panjang.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return "Format email tidak valid.";
  if (trimmed.includes("+")) {
    return "Supabase tidak menerima email dengan tanda + (plus-addressing). Pakai email tanpa tanda +.";
  }
  return null;
}

/** Translate cryptic Supabase Auth errors into friendlier Indonesian copy. */
function friendlyAuthError(raw: string): string {
  const low = raw.toLowerCase();
  if (low.includes("email not confirmed")) {
    return "Email belum dikonfirmasi. Cek inbox-mu atau minta admin untuk konfirmasi manual.";
  }
  if (low.includes("invalid login credentials")) {
    return "Email atau password salah.";
  }
  if (low.includes("user already registered")) {
    return "Email sudah terdaftar. Coba masuk lewat halaman login.";
  }
  if (low.includes("password should be at least")) {
    return "Password harus minimal 8 karakter.";
  }
  if (low.includes("email") && low.includes("invalid")) {
    return "Format email tidak valid menurut Supabase. Pakai email biasa (tanpa +tag).";
  }
  if (low.includes("rate limit")) {
    return "Terlalu banyak percobaan. Coba lagi dalam beberapa menit.";
  }
  return raw;
}

export async function signUp(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("fullName") ?? email.split("@")[0]);

  const localErr = validateEmailLocal(email);
  if (localErr) return { error: localErr };
  if (password.length < 8) return { error: "Password harus minimal 8 karakter." };

  const sb = await getSupabaseServer();
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
  if (error) return { error: friendlyAuthError(error.message) };

  // When "Confirm email" is ON in Supabase, signUp returns a user with NO session.
  // We can't auto-login, so route the user to login with a helpful message.
  if (data?.user && !data.session) {
    return {
      pendingConfirmation: true,
      message:
        "Akun berhasil dibuat. Cek email-mu untuk link konfirmasi sebelum login, atau minta admin untuk konfirmasi manual.",
    };
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const localErr = validateEmailLocal(email);
  if (localErr) return { error: localErr };

  const sb = await getSupabaseServer();
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) {
    const friendly = friendlyAuthError(error.message);
    // If unconfirmed, offer to resend the confirmation email so the user has a way forward.
    if (error.message.toLowerCase().includes("email not confirmed")) {
      try {
        await sb.auth.resend({ type: "signup", email });
        return { error: `${friendly} Kami baru saja kirim ulang link konfirmasi ke ${email}.` };
      } catch {
        return { error: friendly };
      }
    }
    return { error: friendly };
  }
  revalidatePath("/", "layout");
  redirect("/");
}

export async function signOut() {
  const sb = await getSupabaseServer();
  await sb.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

/**
 * Change-password from settings (while logged in). Verifies the old password via
 * a throwaway client so we don't disturb the active session cookies, then updates.
 */
export async function changePassword(formData: FormData) {
  const oldPassword = String(formData.get("oldPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  if (newPassword.length < 8) return { error: "Password baru minimal 8 karakter." };

  const sb = await getSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user?.email) return { error: "Kamu harus login untuk mengubah password." };

  // Verify the old password without touching the live session: a standalone,
  // non-persisting client just checks the credentials.
  const verifier = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: verifyErr } = await verifier.auth.signInWithPassword({
    email: user.email,
    password: oldPassword,
  });
  if (verifyErr) return { error: "oldPasswordWrong" };

  const { error } = await sb.auth.updateUser({ password: newPassword });
  if (error) return { error: friendlyAuthError(error.message) };
  return { ok: true };
}
