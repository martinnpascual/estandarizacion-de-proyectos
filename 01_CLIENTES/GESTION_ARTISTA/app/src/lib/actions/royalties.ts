"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { RoyaltyPaymentSchema } from "@/lib/schemas";
import type { RoyaltyPaymentFormData } from "@/lib/schemas";
import type { RoyaltyPayment } from "@/types/database";
import { revalidatePath } from "next/cache";

// ─── Get all royalty payments ─────────────────────────────────────────────────
export async function getRoyaltyPayments(filters?: {
  source?: string;
  year?: number;
}): Promise<{ data: RoyaltyPayment[]; error: string | null }> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: [], error: "No autenticado" };

  let query = supabase
    .from("royalty_payments")
    .select("*")
    .eq("created_by", user.id)
    .order("period_month", { ascending: false });

  if (filters?.source) {
    query = query.eq("source", filters.source);
  }
  if (filters?.year) {
    query = query.like("period_month", `${filters.year}-%`);
  }

  const { data, error } = await query;
  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as RoyaltyPayment[], error: null };
}

// ─── Get royalty summary ──────────────────────────────────────────────────────
export async function getRoyaltySummary(): Promise<{
  data: {
    total_all_time: number;
    total_this_year: number;
    total_last_month: number;
    by_source: { source: string; total: number }[];
    by_month: { period_month: string; total: number }[];
  } | null;
  error: string | null;
}> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "No autenticado" };

  const { data, error } = await supabase
    .from("royalty_payments")
    .select("source, amount, period_month, currency")
    .eq("created_by", user.id);

  if (error) return { data: null, error: error.message };

  const payments = data ?? [];
  const now = new Date();
  const thisYear = now.getFullYear().toString();
  const lastMonth = `${now.getFullYear()}-${String(now.getMonth()).padStart(2, "0")}`;

  const total_all_time = payments.reduce((s, p) => s + Number(p.amount), 0);
  const total_this_year = payments
    .filter((p) => p.period_month.startsWith(thisYear))
    .reduce((s, p) => s + Number(p.amount), 0);
  const total_last_month = payments
    .filter((p) => p.period_month === lastMonth)
    .reduce((s, p) => s + Number(p.amount), 0);

  // Aggregate by source
  const sourceMap: Record<string, number> = {};
  for (const p of payments) {
    sourceMap[p.source] = (sourceMap[p.source] ?? 0) + Number(p.amount);
  }
  const by_source = Object.entries(sourceMap)
    .map(([source, total]) => ({ source, total }))
    .sort((a, b) => b.total - a.total);

  // Aggregate by month (last 12)
  const monthMap: Record<string, number> = {};
  for (const p of payments) {
    monthMap[p.period_month] = (monthMap[p.period_month] ?? 0) + Number(p.amount);
  }
  const by_month = Object.entries(monthMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-12)
    .map(([period_month, total]) => ({ period_month, total }));

  return {
    data: { total_all_time, total_this_year, total_last_month, by_source, by_month },
    error: null,
  };
}

// ─── Create royalty payment ───────────────────────────────────────────────────
export async function createRoyaltyPayment(
  formData: RoyaltyPaymentFormData
): Promise<{ data: RoyaltyPayment | null; error: string | null }> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "No autenticado" };

  const parsed = RoyaltyPaymentSchema.safeParse(formData);
  if (!parsed.success) {
    return { data: null, error: parsed.error.errors[0].message };
  }

  const { data, error } = await supabase
    .from("royalty_payments")
    .insert({ ...parsed.data, created_by: user.id })
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  revalidatePath("/ingresos");
  return { data: data as RoyaltyPayment, error: null };
}

// ─── Update royalty payment ───────────────────────────────────────────────────
export async function updateRoyaltyPayment(
  id: string,
  formData: Partial<RoyaltyPaymentFormData>
): Promise<{ data: RoyaltyPayment | null; error: string | null }> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "No autenticado" };

  const { data, error } = await supabase
    .from("royalty_payments")
    .update(formData)
    .eq("id", id)
    .eq("created_by", user.id)
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  revalidatePath("/ingresos");
  return { data: data as RoyaltyPayment, error: null };
}

// ─── Delete royalty payment ───────────────────────────────────────────────────
export async function deleteRoyaltyPayment(
  id: string
): Promise<{ error: string | null }> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { error } = await supabase
    .from("royalty_payments")
    .delete()
    .eq("id", id)
    .eq("created_by", user.id);

  if (error) return { error: error.message };
  revalidatePath("/ingresos");
  return { error: null };
}
