"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  CalendarCheck2,
  ChevronRight,
  CreditCard,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Settings,
  WalletCards
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth-provider";

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Finanzas", href: "/finanzas", icon: CreditCard },
  { label: "Activos", href: "/activos", icon: WalletCards },
  { label: "Hábitos", href: "/habitos", icon: CalendarCheck2 },
  { label: "Reportes", href: "/reportes", icon: BarChart3 }
];

const secondaryItems = [
  { label: "Configuración", href: "/configuracion", icon: Settings },
  { label: "Soporte", href: "/soporte", icon: LifeBuoy }
];

export function Sidebar() {
  const pathname = usePathname();
  const { signOut } = useAuth();

  return (
    <aside className="fixed inset-y-0 left-0 z-20 flex w-72 flex-col border-r border-border bg-surface px-4 py-5">
      <Link href="/" className="mb-7 flex items-center gap-3 px-2">
        <div className="grid h-10 w-10 place-items-center rounded-md bg-emerald-500/15 text-emerald-400">
          <Activity className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <p className="text-sm font-semibold tracking-wide text-foreground">LifeLedger</p>
          <p className="text-xs text-subtle">Finanzas y hábitos</p>
        </div>
      </Link>

      <nav className="space-y-1">
        {navItems.map((item) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex h-11 items-center justify-between rounded-md px-3 text-sm font-medium text-subtle transition hover:bg-muted hover:text-foreground",
                isActive && "bg-muted text-foreground"
              )}
            >
              <span className="flex items-center gap-3">
                <item.icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </span>
              {isActive ? <ChevronRight className="h-4 w-4 text-emerald-400" aria-hidden="true" /> : null}
            </Link>
          );
        })}
      </nav>

      <div className="mt-7 rounded-md border border-border bg-background p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-subtle">Meta mensual</p>
        <div className="mt-3 flex items-end justify-between">
          <div>
            <p className="text-lg font-semibold">$3,000</p>
            <p className="text-xs text-subtle">Ahorro objetivo</p>
          </div>
          <p className="text-sm font-medium text-emerald-400">72%</p>
        </div>
        <div className="mt-3 h-2 rounded-full bg-muted">
          <div className="h-2 w-[72%] rounded-full bg-emerald-500" />
        </div>
      </div>

      <nav className="mt-auto space-y-1">
        {secondaryItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-subtle transition hover:bg-muted hover:text-foreground"
          >
            <item.icon className="h-4 w-4" aria-hidden="true" />
            {item.label}
          </Link>
        ))}
        <button
          type="button"
          onClick={signOut}
          className="flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm font-medium text-subtle transition hover:bg-red-500/10 hover:text-red-400"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Cerrar sesión
        </button>
      </nav>
    </aside>
  );
}
