"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/citizen", label: "Início", icon: "home" },
  { href: "/citizen/minha-coleta", label: "Rotas", icon: "local_shipping" },
  { href: "/citizen/educacao", label: "Educação", icon: "eco" },
  { href: "/citizen/perfil", label: "Perfil", icon: "person" },
];

export function CitizenTabBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-[1000] bg-surface-container-lowest border-t border-outline-variant/40 shadow-[0_-2px_12px_rgba(0,0,0,0.08)]">
      <div className="max-w-2xl mx-auto flex items-stretch">
        {TABS.map((tab) => {
          const active = tab.href === "/citizen" ? pathname === "/citizen" : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex-1 flex flex-col items-center gap-1 py-3 text-label-lg transition-colors ${
                active ? "text-primary" : "text-on-surface-variant"
              }`}
            >
              <span className="material-symbols-outlined text-[24px]">{tab.icon}</span>
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
