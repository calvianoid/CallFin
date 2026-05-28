"use server";

import { getSupabaseServer } from "@/lib/supabase/server-client";
import { revalidatePath } from "next/cache";

export async function getProfile() {
  const sb = await getSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;

  const { data, error } = await sb.from("profiles").select("*").eq("id", user.id).single();
  if (error) throw error;
  return data;
}

export async function updateProfile(patch: {
  full_name?: string;
  phone?: string;
  avatar_url?: string;
  locale?: "id" | "en";
  theme?: "light" | "dark" | "system";
  /** Ignored — auth email change has its own verification flow via sb.auth.updateUser(). */
  email?: string;
}): Promise<void> {
  const sb = await getSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Strip email from the patch — changing the login email must go through
  // sb.auth.updateUser({ email }) which sends a verification email to the new
  // address. We don't expose that flow in the UI yet.
  const safePatch = { ...patch };
  delete (safePatch as { email?: string }).email;

  const { error } = await sb.from("profiles").update(safePatch as never).eq("id", user.id);
  if (error) throw error;
  revalidatePath("/settings");
}
