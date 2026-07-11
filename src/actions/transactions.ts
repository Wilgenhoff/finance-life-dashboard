"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type DashboardTransaction = {
  id: string;
  title: string;
  category: string;
  amount: number;
  type: "income" | "expense";
  date: string;
};

export async function listTransactions(): Promise<DashboardTransaction[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: transactions } = await supabase
    .from("transactions")
    .select("id, description, type, amount, date, category:category_id(name)")
    .eq("user_id", user.id)
    .order("date", { ascending: false })
    .limit(100);

  if (!transactions) return [];

  return transactions.map((t: any) => ({
    id: t.id,
    title: t.description ?? "Sin título",
    category: t.category?.name ?? "General",
    amount: t.type === "INCOME" ? Number(t.amount) : -Number(t.amount),
    type: t.type === "INCOME" ? "income" as const : "expense" as const,
    date: t.date,
  }));
}

export async function createTransaction(data: {
  title: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  date: string;
}): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  // Find or create category
  let { data: category } = await supabase
    .from("transaction_categories")
    .select("id")
    .eq("name", data.category)
    .maybeSingle();

  if (!category) {
    const { data: newCat } = await supabase
      .from("transaction_categories")
      .insert({ name: data.category })
      .select("id")
      .single();
    category = newCat;
  }

  await supabase.from("transactions").insert({
    user_id: user.id,
    category_id: category?.id ?? null,
    type: data.type === "income" ? "INCOME" : "EXPENSE",
    amount: data.amount,
    description: data.title,
    date: data.date,
  });

  revalidatePath("/");
}

export async function deleteTransaction(id: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  await supabase
    .from("transactions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  revalidatePath("/");
}
