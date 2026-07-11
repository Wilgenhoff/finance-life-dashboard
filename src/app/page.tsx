"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Check,
  CircleDollarSign,
  Edit,
  MoreHorizontal,
  Plus,
  Trash2,
  TrendingUp,
  X
} from "lucide-react";
import { weekDays } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import {
  listTransactions as fetchTransactions,
  createTransaction,
  deleteTransaction,
} from "@/actions/transactions";
import type { DashboardTransaction } from "@/actions/transactions";

import {
  listAssets as fetchAssets,
  updateAssetQuantity,
  createAsset,
  deleteAsset,
} from "@/actions/assets";
import type { DashboardAsset } from "@/actions/assets";

type TransactionType = "income" | "expense";

type TransactionForm = {
  title: string;
  amount: string;
  type: TransactionType;
  category: string;
};

type AssetForm = {
  quantity: string;
};

type NewAssetForm = {
  symbol: string;
  name: string;
  quantity: string;
};

type AssetPriceMap = Record<string, number>;

type LocalHabit = {
  name: string;
  color: string;
  week: boolean[];
};

const initialHabits: LocalHabit[] = [
  { name: "Entrenamiento", color: "#22c55e", week: [false, false, false, false, false, false, false] },
  { name: "Estudio", color: "#3b82f6", week: [false, false, false, false, false, false, false] },
  { name: "Meditación", color: "#eab308", week: [false, false, false, false, false, false, false] },
];

const categories = ["Ingreso", "Hogar", "Comida", "Transporte", "Salud", "Educación", "Inversión", "Ocio"];

const initialForm: TransactionForm = {
  title: "",
  amount: "",
  type: "expense",
  category: "Comida",
};

const DEFAULT_ASSET_PRICES: AssetPriceMap = {
  BTC: 69263.16,
  USDT: 1,
  ARS: 1 / 1200,
};

function formatCurrency(value: number) {
  const sign = value < 0 ? "-" : "+";
  return `${sign}$${Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatMoney(value: number) {
  const sign = value < 0 ? "-" : "";
  return `${sign}$${Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function parseQuantity(value: string) {
  return Number(value.replace(/,/g, ""));
}

function getAssetUsdValue(asset: DashboardAsset, prices: AssetPriceMap) {
  const quantity = parseQuantity(asset.quantity);
  const price = prices[asset.symbol] ?? 0;
  return Number.isFinite(quantity) ? quantity * price : 0;
}

function getAssetPriceLabel(asset: DashboardAsset, prices: AssetPriceMap) {
  const price = prices[asset.symbol] ?? 0;
  if (asset.symbol === "ARS" && price > 0) {
    return `1 USD = ${Math.round(1 / price).toLocaleString("en-US")} ARS`;
  }
  return `${formatMoney(price)} por ${asset.symbol}`;
}

export default function DashboardPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<TransactionForm>(initialForm);
  const [transactions, setTransactions] = useState<DashboardTransaction[]>([]);
  const [habits, setHabits] = useState<LocalHabit[]>(initialHabits);
  const [assets, setAssets] = useState<DashboardAsset[]>([]);
  const [assetPrices, setAssetPrices] = useState<AssetPriceMap>(DEFAULT_ASSET_PRICES);
  const [editingAsset, setEditingAsset] = useState<DashboardAsset | null>(null);
  const [assetForm, setAssetForm] = useState<AssetForm>({ quantity: "" });
  const [isNewAssetOpen, setIsNewAssetOpen] = useState(false);
  const [newAssetForm, setNewAssetForm] = useState<NewAssetForm>({ symbol: "", name: "", quantity: "" });
  const [arsRate, setArsRate] = useState<number>(1200);
  const [newHabitName, setNewHabitName] = useState("");

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [txns, assts] = await Promise.all([
        fetchTransactions(),
        fetchAssets(),
      ]);
      setTransactions(txns);
      setAssets(assts);
    } catch {
      setTransactions([]);
      setAssets([]);
    } finally {
      setHasLoadedInitialData(true);
    }
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    loadData();
  }, [isMounted, loadData]);

  useEffect(() => {
    if (!isMounted) return;

    let isActive = true;

    async function fetchAssetPrices() {
      try {
        const [cryptoRes, arsRes] = await Promise.all([
          fetch(
            "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,tether&vs_currencies=usd",
            { cache: "no-store" }
          ),
          fetch(
            "https://api.exchangerate-api.com/v4/latest/USD",
            { cache: "no-store" }
          ),
        ]);

        if (!isActive) return;

        if (cryptoRes.ok) {
          const prices = await cryptoRes.json();
          setAssetPrices((current) => ({
            ...current,
            BTC: Number(prices.bitcoin?.usd) || current.BTC,
            USDT: Number(prices.tether?.usd) || current.USDT,
          }));
        }

        if (arsRes.ok) {
          const arsData = await arsRes.json();
          const liveArsRate = Number(arsData.rates?.ARS) || 0;
          if (liveArsRate > 0) {
            setArsRate(liveArsRate);
          }
        }
      } catch {
        // keep defaults if API fails
      }
    }

    fetchAssetPrices();

    return () => {
      isActive = false;
    };
  }, [isMounted]);

  useEffect(() => {
    setAssetPrices((current) => ({
      ...current,
      ARS: 1 / (arsRate > 0 ? arsRate : 1200),
    }));
  }, [arsRate]);

  const financialSummary = useMemo(() => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    const totalIncome = transactions
      .filter((transaction) => transaction.type === "income")
      .reduce((total, transaction) => total + transaction.amount, 0);

    const monthlyExpenses = transactions
      .filter((transaction) => {
        const transactionDate = new Date(`${transaction.date}T00:00:00`);
        return (
          transaction.type === "expense" &&
          transactionDate.getMonth() === currentMonth &&
          transactionDate.getFullYear() === currentYear
        );
      })
      .reduce((total, transaction) => total + Math.abs(transaction.amount), 0);

    const transactionBalance = transactions.reduce((total, transaction) => total + transaction.amount, 0);
    const savingsRate = totalIncome > 0 ? Math.max(((totalIncome - monthlyExpenses) / totalIncome) * 100, 0) : 0;
    const investmentValue = assets.reduce((total, asset) => total + getAssetUsdValue(asset, assetPrices), 0);
    const maxPulseValue = Math.max(totalIncome, monthlyExpenses, investmentValue, 1);

    return {
      totalIncome,
      monthlyExpenses,
      transactionBalance,
      savingsRate,
      investmentValue,
      incomeBarWidth: `${Math.round((totalIncome / maxPulseValue) * 100)}%`,
      expensesBarWidth: `${Math.round((monthlyExpenses / maxPulseValue) * 100)}%`,
      investmentsBarWidth: `${Math.round((investmentValue / maxPulseValue) * 100)}%`,
    };
  }, [assetPrices, assets, transactions]);

  const totalCompletedDays = useMemo(
    () => habits.reduce((sum, h) => sum + h.week.filter((d) => d).length, 0),
    [habits]
  );

  const summaryCards = useMemo(
    () => [
      {
        label: "Balance total",
        value: formatMoney(financialSummary.transactionBalance),
        delta: "Según movimientos activos",
        tone: financialSummary.transactionBalance >= 0 ? "positive" : "negative",
      },
      {
        label: "Gastos del mes",
        value: formatMoney(financialSummary.monthlyExpenses),
        delta: "Actualizado al instante",
        tone: financialSummary.monthlyExpenses === 0 ? "neutral" : "negative",
      },
      {
        label: "Racha de hábitos",
        value: `${totalCompletedDays} días`,
        delta: "Completados esta semana",
        tone: "neutral",
      },
    ],
    [financialSummary.monthlyExpenses, financialSummary.transactionBalance, totalCompletedDays]
  );

  const orderedTransactions = useMemo(() => transactions.slice(0, 6), [transactions]);

  function closeModal() {
    setIsModalOpen(false);
    setForm(initialForm);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsedAmount = Number.parseFloat(form.amount);
    if (!form.title.trim() || Number.isNaN(parsedAmount) || parsedAmount <= 0) return;

    try {
      await createTransaction({
        title: form.title.trim(),
        amount: parsedAmount,
        type: form.type,
        category: form.category,
        date: new Date().toISOString().slice(0, 10),
      });

      const txns = await fetchTransactions();
      setTransactions(txns);
    } catch {
      // silent fail
    }

    closeModal();
  }

  async function handleDeleteTransaction(id: string) {
    const previous = transactions;
    setTransactions((current) => current.filter((t) => t.id !== id));

    try {
      await deleteTransaction(id);
      const txns = await fetchTransactions();
      setTransactions(txns);
    } catch {
      setTransactions(previous);
    }
  }

  function openAssetEditor(asset: DashboardAsset) {
    setEditingAsset(asset);
    setAssetForm({ quantity: asset.quantity });
  }

  function closeAssetEditor() {
    setEditingAsset(null);
    setAssetForm({ quantity: "" });
  }

  async function handleAssetSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingAsset) return;

    const rawQty = assetForm.quantity.trim();
    const parsedQuantity = parseQuantity(rawQty);
    if (!rawQty || Number.isNaN(parsedQuantity) || parsedQuantity < 0) return;

    try {
      await updateAssetQuantity(editingAsset.symbol, rawQty);
      const assts = await fetchAssets();
      setAssets(assts);
    } catch {
      // silent fail
    }

    closeAssetEditor();
  }

  function openNewAsset() {
    setNewAssetForm({ symbol: "", name: "", quantity: "" });
    setIsNewAssetOpen(true);
  }

  function closeNewAsset() {
    setIsNewAssetOpen(false);
    setNewAssetForm({ symbol: "", name: "", quantity: "" });
  }

  async function handleNewAssetSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const symbol = newAssetForm.symbol.trim().toUpperCase();
    const name = newAssetForm.name.trim();
    if (!symbol || !name) return;

    const rawQty = newAssetForm.quantity.trim() || "0";

    try {
      await createAsset({ symbol, name, quantity: rawQty });
      const assts = await fetchAssets();
      setAssets(assts);
    } catch {
      // silent fail
    }

    closeNewAsset();
  }

  async function handleDeleteAsset(symbol: string) {
    const previous = assets;
    setAssets((current) => current.filter((a) => a.symbol !== symbol));

    try {
      await deleteAsset(symbol);
      const assts = await fetchAssets();
      setAssets(assts);
    } catch {
      setAssets(previous);
    }
  }

  function handleToggleHabit(name: string, dayIndex: number) {
    setHabits((current) =>
      current.map((h) =>
        h.name === name
          ? { ...h, week: h.week.map((d, i) => (i === dayIndex ? !d : d)) }
          : h
      )
    );
  }

  function handleAddHabit() {
    const name = newHabitName.trim();
    if (!name) return;
    const colors = ["#a855f7", "#f97316", "#06b6d4", "#ec4899", "#84cc16"];
    const usedColors = habits.map((h) => h.color);
    const color = colors.find((c) => !usedColors.includes(c)) ?? "#6366f1";
    setHabits((current) => [...current, { name, color, week: [false, false, false, false, false, false, false] }]);
    setNewHabitName("");
  }

  const today = new Date();
  const dateStr = today.toLocaleDateString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-subtle capitalize">{dateStr}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-foreground">
            Dashboard personal
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium text-foreground transition hover:bg-muted"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nueva transacción
          </button>
          <button className="grid h-10 w-10 place-items-center rounded-md border border-border bg-surface text-subtle transition hover:bg-muted hover:text-foreground">
            <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Más acciones</span>
          </button>
        </div>
      </header>

      <section className="grid grid-cols-3 gap-4">
        {summaryCards.map((card) => (
          <article key={card.label} className="rounded-md border border-border bg-surface p-5 shadow-soft">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-subtle">{card.label}</p>
                <p className="mt-3 text-2xl font-semibold">{card.value}</p>
              </div>
              <div className="grid h-9 w-9 place-items-center rounded-md bg-emerald-500/10 text-emerald-400">
                {card.label === "Gastos del mes" ? (
                  <ArrowDownRight className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                )}
              </div>
            </div>
            <p
              className={cn(
                "mt-5 text-sm font-medium",
                card.tone === "positive" && "text-emerald-400",
                card.tone === "negative" && "text-red-400",
                card.tone === "neutral" && "text-subtle"
              )}
            >
              {card.delta}
            </p>
          </article>
        ))}
      </section>

      <section className="grid grid-cols-[1.15fr_0.85fr] gap-4">
        <div className="rounded-md border border-border bg-surface">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h2 className="text-base font-semibold">Movimientos recientes</h2>
              <p className="mt-1 text-sm text-subtle">Ingresos y egresos del mes actual</p>
            </div>
            <button className="text-sm font-medium text-emerald-400 transition hover:text-emerald-300">
              Ver todo
            </button>
          </div>
          <div className="divide-y divide-border">
            {orderedTransactions.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-subtle">
                {hasLoadedInitialData
                  ? "Aún no hay movimientos. Crea tu primera transacción."
                  : "Cargando movimientos…"}
              </div>
            ) : (
              orderedTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="grid grid-cols-[1fr_130px_120px_44px] items-center gap-2 px-5 py-4"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "grid h-9 w-9 place-items-center rounded-md",
                        transaction.type === "income"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-red-500/10 text-red-400"
                      )}
                    >
                      {transaction.type === "income" ? (
                        <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4" aria-hidden="true" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{transaction.title}</p>
                      <p className="mt-1 text-xs text-subtle">{transaction.category}</p>
                    </div>
                  </div>
                  <p className="text-sm text-subtle">{transaction.date}</p>
                  <p
                    className={cn(
                      "text-right text-sm font-semibold",
                      transaction.amount > 0 ? "text-emerald-400" : "text-foreground"
                    )}
                  >
                    {formatCurrency(transaction.amount)}
                  </p>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleDeleteTransaction(transaction.id)}
                      className="grid h-8 w-8 place-items-center rounded-md text-subtle transition hover:bg-red-500/10 hover:text-red-500"
                      aria-label={`Eliminar transacción ${transaction.title}`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-md border border-border bg-surface">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h2 className="text-base font-semibold">Activos manuales</h2>
              <p className="mt-1 text-sm text-subtle">Balances cargados por el usuario</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-sky-400">{formatMoney(financialSummary.investmentValue)}</span>
              <label className="flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[10px] text-subtle">
                <span>ARS</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={arsRate}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (v > 0) setArsRate(v);
                  }}
                  className="w-14 bg-transparent text-xs text-foreground outline-none"
                />
              </label>
              <button
                type="button"
                onClick={openNewAsset}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-medium text-subtle transition hover:bg-muted hover:text-foreground"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Nuevo
              </button>
            </div>
          </div>
          <div className="space-y-4 p-5">
            {assets.length === 0 ? (
              <p className="text-center text-sm text-subtle">
                {hasLoadedInitialData
                  ? "Sin activos registrados."
                  : "Cargando activos…"}
              </p>
            ) : (
              assets.map((asset) => {
                const usdValue = getAssetUsdValue(asset, assetPrices);
                const priceLabel = getAssetPriceLabel(asset, assetPrices);
                return (
                  <div key={asset.symbol} className="group flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-md bg-background text-sm font-semibold">
                        {asset.symbol.slice(0, 3)}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{asset.name}</p>
                        <p className="mt-1 text-xs text-subtle">
                          {asset.quantity} <span className="text-foreground/60">{asset.symbol}</span>
                        </p>
                        <p className="mt-1 text-xs text-emerald-400">
                          {formatMoney(usdValue)} USD
                        </p>
                        <p className="mt-0.5 text-[10px] text-subtle">
                          {priceLabel}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-semibold">{formatMoney(usdValue)}</p>
                        <p className={cn("mt-1 text-xs font-medium", asset.change.startsWith("+") ? "text-emerald-400" : "text-subtle")}>
                          {asset.change}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => openAssetEditor(asset)}
                        className="grid h-8 w-8 place-items-center rounded-md text-subtle opacity-0 transition hover:bg-sky-500/10 hover:text-sky-400 focus:opacity-100 group-hover:opacity-100"
                        aria-label={`Editar activo ${asset.name}`}
                      >
                        <Edit className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteAsset(asset.symbol)}
                        className="grid h-8 w-8 place-items-center rounded-md text-subtle opacity-0 transition hover:bg-red-500/10 hover:text-red-500 focus:opacity-100 group-hover:opacity-100"
                        aria-label={`Eliminar activo ${asset.name}`}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-[0.85fr_1.15fr] gap-4">
        <div className="rounded-md border border-border bg-surface p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-md bg-emerald-500/10 text-emerald-400">
              <TrendingUp className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Pulso financiero</h2>
              <p className="mt-1 text-sm text-subtle">
                Ratio ahorro estimado: {Math.round(financialSummary.savingsRate)}%
              </p>
            </div>
          </div>
          <div className="mt-6 space-y-4">
            <div>
              <div className="mb-2 flex justify-between text-sm">
                <span className="text-subtle">Ingresos</span>
                <span className="font-medium">{formatMoney(financialSummary.totalIncome)}</span>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div className="h-2 rounded-full bg-emerald-500" style={{ width: financialSummary.incomeBarWidth }} />
              </div>
            </div>
            <div>
              <div className="mb-2 flex justify-between text-sm">
                <span className="text-subtle">Gastos</span>
                <span className="font-medium">{formatMoney(financialSummary.monthlyExpenses)}</span>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div className="h-2 rounded-full bg-red-500" style={{ width: financialSummary.expensesBarWidth }} />
              </div>
            </div>
            <div>
              <div className="mb-2 flex justify-between text-sm">
                <span className="text-subtle">Inversiones</span>
                <span className="font-medium">{formatMoney(financialSummary.investmentValue)}</span>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div className="h-2 rounded-full bg-sky-500" style={{ width: financialSummary.investmentsBarWidth }} />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-md border border-border bg-surface">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="flex items-center gap-3">
              <div>
                <h2 className="text-base font-semibold">Hábitos de la semana</h2>
                <p className="mt-1 text-sm text-subtle">Checklist diario para mantener racha</p>
              </div>
              <div className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1">
                <input
                  value={newHabitName}
                  onChange={(e) => setNewHabitName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddHabit(); }}
                  placeholder="Nuevo hábito"
                  className="w-24 bg-transparent text-xs text-foreground outline-none placeholder:text-subtle"
                />
                <button
                  type="button"
                  onClick={handleAddHabit}
                  className="grid h-5 w-5 place-items-center rounded text-subtle transition hover:bg-muted hover:text-foreground"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-emerald-400">
              <CircleDollarSign className="h-4 w-4" aria-hidden="true" />
              {totalCompletedDays} días
            </div>
          </div>
          <div className="p-5">
            <div className="mb-3 grid grid-cols-[170px_repeat(7,42px)] gap-2 text-center text-xs text-subtle">
              <span />
              {weekDays.map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>
            <div className="space-y-3">
              {habits.map((habit) => (
                <div key={habit.name} className="grid grid-cols-[170px_repeat(7,42px)] items-center gap-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: habit.color }} />
                    {habit.name}
                  </div>
                  {habit.week.map((done, index) => (
                    <button
                      type="button"
                      key={`${habit.name}-${index}`}
                      onClick={() => handleToggleHabit(habit.name, index)}
                      className={cn(
                        "grid h-9 w-9 place-items-center rounded-md border text-xs transition",
                        done
                          ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                          : "border-border bg-background text-subtle hover:border-emerald-500/30 hover:bg-emerald-500/5"
                      )}
                    >
                      {done ? <Check className="h-4 w-4" aria-hidden="true" /> : ""}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-6 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-transaction-title"
            className="w-full max-w-lg rounded-md border border-border bg-surface shadow-soft"
          >
            <div className="flex items-center justify-between border-b border-border px-6 py-5">
              <div>
                <h2 id="new-transaction-title" className="text-lg font-semibold">Nueva transacción</h2>
                <p className="mt-1 text-sm text-subtle">Carga un movimiento para verlo en el dashboard.</p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="grid h-9 w-9 place-items-center rounded-md text-subtle transition hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">Cerrar modal</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-6">
              <label className="block">
                <span className="text-sm font-medium text-foreground">Descripción</span>
                <input
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Ej: Supermercado, salario, gym"
                  className="mt-2 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none transition placeholder:text-subtle focus:border-emerald-500"
                />
              </label>

              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-sm font-medium text-foreground">Monto</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.amount}
                    onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
                    placeholder="0.00"
                    className="mt-2 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none transition placeholder:text-subtle focus:border-emerald-500"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-foreground">Categoría</span>
                  <select
                    value={form.category}
                    onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                    className="mt-2 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-emerald-500"
                  >
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div>
                <span className="text-sm font-medium text-foreground">Tipo</span>
                <div className="mt-2 grid grid-cols-2 gap-2 rounded-md border border-border bg-background p-1">
                  {[
                    { label: "Egreso", value: "expense" },
                    { label: "Ingreso", value: "income" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          type: option.value as TransactionType,
                          category:
                            option.value === "income"
                              ? "Ingreso"
                              : current.category === "Ingreso"
                                ? "Comida"
                                : current.category,
                        }))
                      }
                      className={cn(
                        "h-9 rounded-md text-sm font-medium text-subtle transition",
                        form.type === option.value && "bg-muted text-foreground"
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-border pt-5">
                <button
                  type="button"
                  onClick={closeModal}
                  className="h-10 rounded-md px-4 text-sm font-medium text-subtle transition hover:bg-muted hover:text-foreground"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex h-10 items-center gap-2 rounded-md bg-emerald-500 px-4 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Guardar movimiento
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {editingAsset ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-6 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-asset-title"
            className="w-full max-w-md rounded-md border border-border bg-surface shadow-soft"
          >
            <div className="flex items-center justify-between border-b border-border px-6 py-5">
              <div>
                <h2 id="edit-asset-title" className="text-lg font-semibold">
                  Editar {editingAsset.symbol}
                </h2>
                <p className="mt-1 text-sm text-subtle">{editingAsset.name}</p>
              </div>
              <button
                type="button"
                onClick={closeAssetEditor}
                className="grid h-9 w-9 place-items-center rounded-md text-subtle transition hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">Cerrar modal</span>
              </button>
            </div>

            <form onSubmit={handleAssetSubmit} className="space-y-5 p-6">
              <label className="block">
                <span className="text-sm font-medium text-foreground">Cantidad / balance</span>
                <input
                  value={assetForm.quantity}
                  onChange={(event) => setAssetForm((current) => ({ ...current, quantity: event.target.value }))}
                  placeholder="Ej: 0.1425"
                  className="mt-2 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none transition placeholder:text-subtle focus:border-sky-500"
                />
              </label>

              <div className="rounded-md border border-border bg-background p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-subtle">Precio usado</span>
                  <span className="font-medium">
                    {getAssetPriceLabel(editingAsset, assetPrices)}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-subtle">Equivalente estimado</span>
                  <span className="font-semibold text-sky-400">
                    {formatMoney(
                      (Number.isFinite(parseQuantity(assetForm.quantity))
                        ? parseQuantity(assetForm.quantity)
                        : 0) * (assetPrices[editingAsset.symbol] ?? 0)
                    )}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-border pt-5">
                <button
                  type="button"
                  onClick={closeAssetEditor}
                  className="h-10 rounded-md px-4 text-sm font-medium text-subtle transition hover:bg-muted hover:text-foreground"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex h-10 items-center gap-2 rounded-md bg-sky-500 px-4 text-sm font-semibold text-zinc-950 transition hover:bg-sky-400"
                >
                  <Edit className="h-4 w-4" aria-hidden="true" />
                  Guardar balance
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isNewAssetOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-6 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-asset-title"
            className="w-full max-w-md rounded-md border border-border bg-surface shadow-soft"
          >
            <div className="flex items-center justify-between border-b border-border px-6 py-5">
              <div>
                <h2 id="new-asset-title" className="text-lg font-semibold">Nuevo activo</h2>
                <p className="mt-1 text-sm text-subtle">Agrega un activo manual para trackear.</p>
              </div>
              <button
                type="button"
                onClick={closeNewAsset}
                className="grid h-9 w-9 place-items-center rounded-md text-subtle transition hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">Cerrar</span>
              </button>
            </div>

            <form onSubmit={handleNewAssetSubmit} className="space-y-5 p-6">
              <label className="block">
                <span className="text-sm font-medium text-foreground">Símbolo</span>
                <input
                  value={newAssetForm.symbol}
                  onChange={(event) =>
                    setNewAssetForm((current) => ({ ...current, symbol: event.target.value }))
                  }
                  placeholder="Ej: BTC, ETH, AAPL"
                  className="mt-2 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none transition placeholder:text-subtle focus:border-sky-500"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-foreground">Nombre</span>
                <input
                  value={newAssetForm.name}
                  onChange={(event) =>
                    setNewAssetForm((current) => ({ ...current, name: event.target.value }))
                  }
                  placeholder="Ej: Bitcoin, Ethereum, Apple"
                  className="mt-2 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none transition placeholder:text-subtle focus:border-sky-500"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-foreground">Cantidad / balance</span>
                <input
                  value={newAssetForm.quantity}
                  onChange={(event) =>
                    setNewAssetForm((current) => ({ ...current, quantity: event.target.value }))
                  }
                  placeholder="Ej: 0.1425"
                  className="mt-2 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none transition placeholder:text-subtle focus:border-sky-500"
                />
              </label>

              <div className="flex items-center justify-end gap-3 border-t border-border pt-5">
                <button
                  type="button"
                  onClick={closeNewAsset}
                  className="h-10 rounded-md px-4 text-sm font-medium text-subtle transition hover:bg-muted hover:text-foreground"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex h-10 items-center gap-2 rounded-md bg-sky-500 px-4 text-sm font-semibold text-zinc-950 transition hover:bg-sky-400"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Crear activo
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
