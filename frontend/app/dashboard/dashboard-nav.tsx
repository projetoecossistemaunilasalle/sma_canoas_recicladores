"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", shortLabel: "Painel", icon: "dashboard" },
  { href: "/dashboard/routes", label: "Rotas de Coleta", shortLabel: "Rotas", icon: "route" },
  { href: "/dashboard/vehicles", label: "Veículos", shortLabel: "Veículos", icon: "local_shipping" },
];

// "admin" has no cooperativeId, so these two are meaningless for that role —
// each links to a page that redirects admin away on its own, but hiding the
// entry avoids a dead-end click.
const COOPERATIVE_ADMIN_NAV_ITEMS = [
  { href: "/dashboard/cooperativa", label: "Minha Cooperativa", shortLabel: "Cooperativa", icon: "store" },
  { href: "/dashboard/avisos", label: "Avisos e Notícias", shortLabel: "Avisos", icon: "campaign" },
];

const COMING_SOON_NAV = [
  { icon: "analytics", label: "teste 2" },
  { icon: "group", label: "Equipe" },
  { icon: "settings", label: "Configurações" },
];

function navItemsForRole(role: string) {
  return role === "cooperative_admin" ? [...NAV_ITEMS, ...COOPERATIVE_ADMIN_NAV_ITEMS] : NAV_ITEMS;
}

// Exact match for the /dashboard root — otherwise it'd also light up for
// every sub-route (/dashboard/routes, /dashboard/vehicles, ...).
function isActive(pathname: string, href: string) {
  return href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);
}

/** Desktop/tablet-landscape sidebar nav — hidden below md, where DashboardMobileNav takes over. */
export function DashboardNav({ role }: { role: string }) {
  const pathname = usePathname();
  const items = navItemsForRole(role);

  return (
    <nav className="flex-1 px-4 space-y-1 hidden md:block">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`flex items-center h-12 px-4 rounded-xl transition-all ${
            isActive(pathname, item.href)
              ? "bg-secondary-container text-on-secondary-container font-bold"
              : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
          }`}
        >
          <span className="material-symbols-outlined mr-4">{item.icon}</span>
          <span className="text-label-lg">{item.label}</span>
        </Link>
      ))}
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

/** Fixed bottom tab bar for mobile/small-tablet — mirrors app/citizen/citizen-tab-bar.tsx's pattern. */
export function DashboardMobileNav({ role }: { role: string }) {
  const pathname = usePathname();
  const items = navItemsForRole(role);

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-[1000] bg-surface-container-lowest border-t border-outline-variant/40 shadow-[0_-2px_12px_rgba(0,0,0,0.08)]">
      <div className="flex items-stretch overflow-x-auto">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 min-w-[64px] flex flex-col items-center gap-1 py-2.5 text-label-lg transition-colors ${
              isActive(pathname, item.href) ? "text-primary" : "text-on-surface-variant"
            }`}
          >
            <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
            <span className="text-[11px] leading-tight">{item.shortLabel}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
