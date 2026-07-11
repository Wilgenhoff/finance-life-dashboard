export const summaryCards = [
  {
    label: "Balance total",
    value: "$24,850.00",
    delta: "+8.2%",
    tone: "positive"
  },
  {
    label: "Gastos del mes",
    value: "$2,180.40",
    delta: "-4.1%",
    tone: "positive"
  },
  {
    label: "Racha de hábitos",
    value: "12 días",
    delta: "+3 esta semana",
    tone: "neutral"
  }
] as const;

export const transactions = [
  { id: "t1", title: "Salario", category: "Ingreso", amount: 4200, type: "income", date: "2026-07-01" },
  { id: "t2", title: "Alquiler", category: "Hogar", amount: -1150, type: "expense", date: "2026-07-03" },
  { id: "t3", title: "Supermercado", category: "Comida", amount: -186.4, type: "expense", date: "2026-07-06" },
  { id: "t4", title: "Freelance", category: "Ingreso", amount: 680, type: "income", date: "2026-07-07" }
];

export const assets = [
  { symbol: "USDT", name: "Tether", quantity: "3,250.00", value: "$3,250.00", change: "0.0%" },
  { symbol: "BTC", name: "Bitcoin", quantity: "0.1425", value: "$9,870.00", change: "+6.8%" },
  { symbol: "ARS", name: "Moneda local", quantity: "1,850,000", value: "$1,410.00", change: "-1.2%" }
];

export const habits = [
  {
    name: "Entrenamiento",
    color: "bg-emerald-500",
    week: [true, true, false, true, true, false, false]
  },
  {
    name: "Estudio",
    color: "bg-sky-500",
    week: [true, true, true, true, false, false, false]
  },
  {
    name: "Meditación",
    color: "bg-amber-500",
    week: [false, true, true, true, true, true, false]
  }
];

export const weekDays = ["L", "M", "X", "J", "V", "S", "D"];
