"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type DashboardAsset = {
  symbol: string;
  name: string;
  quantity: string;
  value: string;
  change: string;
};

export async function listAssets(): Promise<DashboardAsset[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: assets } = await supabase
    .from("asset_balances")
    .select("*")
    .eq("user_id", user.id);

  if (!assets) return [];

  return assets.map((asset: any) => ({
    symbol: asset.symbol,
    name: asset.name,
    quantity: Number(asset.quantity).toLocaleString("en-US", {
      minimumFractionDigits: asset.symbol === "USDT" ? 2 : 4,
      maximumFractionDigits: asset.symbol === "USDT" ? 2 : 4,
    }),
    value: `$${Number(asset.unit_price).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`,
    change: "0.0%",
  }));
}

export async function updateAssetQuantity(symbol: string, quantity: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const parsed = Number(quantity.replace(/,/g, ""));
  if (!Number.isFinite(parsed) || parsed < 0) return;

  await supabase
    .from("asset_balances")
    .update({ quantity: parsed })
    .eq("user_id", user.id)
    .eq("symbol", symbol);

  revalidatePath("/");
}
