"use server";

import { getSupabaseServer } from "@/lib/supabase/server-client";
import { toCategory } from "./mappers";
import type { Category, CategoryType } from "@/types";
import { revalidatePath } from "next/cache";

export async function listCategories(): Promise<Category[]> {
  const sb = await getSupabaseServer();
  const { data, error } = await sb.from("categories").select("*").order("type").order("name");
  if (error) throw error;
  return (data ?? []).map(toCategory);
}

export async function createCategory(input: {
  name: string;
  type: CategoryType;
  color: string;
  icon?: string;
}): Promise<Category> {
  const sb = await getSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await sb
    .from("categories")
    .insert({ ...input, user_id: user.id } as never)
    .select("*")
    .single();
  if (error) throw error;
  revalidatePath("/categories");
  return toCategory(data);
}

export async function updateCategory(id: string, patch: Partial<Omit<Category, "id" | "user_id">>): Promise<void> {
  const sb = await getSupabaseServer();
  const dbPatch: Record<string, unknown> = { ...patch };
  if ("isDefault" in dbPatch) { dbPatch.is_default = dbPatch.isDefault; delete dbPatch.isDefault; }
  if ("isInternal" in dbPatch) { dbPatch.is_internal = dbPatch.isInternal; delete dbPatch.isInternal; }

  const { error } = await sb.from("categories").update(dbPatch as never).eq("id", id);
  if (error) throw error;
  revalidatePath("/categories");
}

export async function deleteCategory(id: string): Promise<void> {
  const sb = await getSupabaseServer();
  const { error } = await sb.from("categories").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/categories");
}
