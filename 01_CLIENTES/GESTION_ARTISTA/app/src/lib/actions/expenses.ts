"use server";

import { createAdminSupabaseClient, createServerSupabaseClient } from "@/lib/supabase/server";
import type { Expense, ExpenseCategory } from "@/types/database";
import { z } from "zod";

const ExpenseSchema = z.object({
  category: z.enum(["studio","mixing","mastering","distribucion","artwork","marketing","equipamiento","viajes","legales","otro"]),
  amount: z.number().positive(),
  currency: z.string().default("USD"),
  description: z.string().min(1),
  period_month: z.string().regex(/^\d{4}-\d{2}$/),
  song_id: z.string().uuid().nullable().default(null),
  project_id: z.string().uuid().nullable().default(null),
  notes: z.string().nullable().default(null),
});

export type ExpenseFormData = z.infer<typeof ExpenseSchema>;

export async function getExpenses(year?: number): Promise<{ data: Expense[]; error: string | null }> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: [], error: "No autenticado" };

  let query = supabase
    .from("expenses")
    .select("*")
    .eq("created_by", user.id)
    .eq("is_deleted", false)
    .order("period_month", { ascending: false });

  if (year) {
    query = query.like("period_month", `${year}-%`);
  }

  const { data, error } = await query;
  return { data: data ?? [], error: error?.message ?? null };
}

export async function createExpense(form: ExpenseFormData): Promise<{ data: Expense | null; error: string | null }> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "No autenticado" };

  const parsed = ExpenseSchema.safeParse(form);
  if (!parsed.success) return { data: null, error: parsed.error.errors[0].message };

  const { data, error } = await supabase
    .from("expenses")
    .insert({ ...parsed.data, created_by: user.id })
    .select()
    .single();

  return { data: data ?? null, error: error?.message ?? null };
}

export async function updateExpense(id: string, form: ExpenseFormData): Promise<{ data: Expense | null; error: string | null }> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "No autenticado" };

  const parsed = ExpenseSchema.safeParse(form);
  if (!parsed.success) return { data: null, error: parsed.error.errors[0].message };

  const { data, error } = await supabase
    .from("expenses")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("created_by", user.id)
    .select()
    .single();

  return { data: data ?? null, error: error?.message ?? null };
}

export async function deleteExpense(id: string): Promise<{ error: string | null }> {
  const admin = createAdminSupabaseClient();
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { error } = await admin
    .from("expenses")
    .update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: user.id })
    .eq("id", id)
    .eq("created_by", user.id);

  return { error: error?.message ?? null };
}
