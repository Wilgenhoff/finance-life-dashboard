"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type DashboardHabit = {
  name: string;
  color: string;
  week: boolean[];
};

export async function listHabits(): Promise<DashboardHabit[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Calculate current week (Mon-Sun)
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const { data: habits } = await supabase
    .from("habits")
    .select("id, name, color, logs:habit_logs(id, log_date)")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .gte("logs.log_date", monday.toISOString())
    .lte("logs.log_date", sunday.toISOString());

  if (!habits) return [];

  const weekDates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    weekDates.push(d.toISOString().slice(0, 10));
  }

  return habits.map((habit: any) => {
    const loggedDates = new Set(
      (habit.logs ?? []).map((log: any) => log.log_date?.slice(0, 10))
    );
    const week = weekDates.map((date) => loggedDates.has(date));
    return { name: habit.name, color: habit.color, week };
  });
}

export async function toggleHabitLog(name: string, date: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data: habits } = await supabase
    .from("habits")
    .select("id")
    .eq("user_id", user.id)
    .eq("name", name)
    .eq("is_active", true);

  if (!habits || habits.length === 0) return;
  const habitId = habits[0].id;

  // Check if log exists for this date
  const { data: existingLogs } = await supabase
    .from("habit_logs")
    .select("id")
    .eq("habit_id", habitId)
    .eq("log_date", date);

  if (existingLogs && existingLogs.length > 0) {
    await supabase
      .from("habit_logs")
      .delete()
      .eq("id", existingLogs[0].id);
  } else {
    await supabase.from("habit_logs").insert({
      user_id: user.id,
      habit_id: habitId,
      log_date: date,
    });
  }

  revalidatePath("/");
}
