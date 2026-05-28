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
  email?: string;
  phone?: string;
  avatar_url?: string;
  locale?: "id" | "en";
  theme?: "light" | "dark" | "system";
}): Promise<void> {
  const sb = await getSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await sb.from("profiles").update(patch as never).eq("id", user.id);
  if (error) throw error;
  revalidatePath("/settings");
}
