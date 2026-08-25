"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/dashboard/routes", label: "Rotas de Coleta", icon: "route" },
  { href: "/dashboard/vehicles", label: "Veículos", icon: "local_shipping" },
];

const COMING_SOON_NAV = [
  { icon: "analytics", label: "teste 2" },
  { icon: "group", label: "Equipe" },
  { icon: "settings", label: "Configurações" },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="flex-1 px-4 space-y-1 hidden md:block">
      {NAV_ITEMS.map((item) => {
        // Exact match for the /dashboard root — otherwise it'd also light up
        // for every sub-route (/dashboard/routes, /dashboard/vehicles, ...).
        const active = item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center h-12 px-4 rounded-xl transition-all ${
              active
                ? "bg-secondary-container text-on-secondary-container font-bold"
                : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
            }`}
          >
            <span className="material-symbols-outlined mr-4">{item.icon}</span>
            <span className="text-label-lg">{item.label}</span>
          </Link>
        );
      })}
      {COMING_SOON_NAV.map((item) => (
        <span
          key={item.label}
          className="flex items-center justify-between h-12 px-4 rounded-xl text-on-surface-variant/50 cursor-not-allowed"
        >
          <span className="flex items-center">
            <span className="material-symbols-outlined mr-4">{item.icon}</span>
            <span className="text-label-lg">{item.label}</span>
          </span>
          <span className="text-[10px] uppercase tracking-wider bg-surface-variant px-2 py-0.5 rounded-full">
            Em breve
          </span>
        </span>
      ))}
    </nav>
  );
}
