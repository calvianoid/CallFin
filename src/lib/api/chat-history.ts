"use server";

import { getSupabaseServer } from "@/lib/supabase/server-client";

export async function listChatHistory(limit = 50) {
  const sb = await getSupabaseServer();
  const { data, error } = await sb
    .from("chat_history")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).reverse();
}

export async function appendChatMessage(role: "user" | "assistant", message: string, metadata?: Record<string, unknown>) {
  const sb = await getSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await sb.from("chat_history").insert({
    user_id: user.id,
    role,
    message,
    metadata: metadata ?? null,
  } as never);
  if (error) throw error;
}

export async function clearChatHistory() {
  const sb = await getSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { error } = await sb.from("chat_history").delete().eq("user_id", user.id);
  if (error) throw error;
}
