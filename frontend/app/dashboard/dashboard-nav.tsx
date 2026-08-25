"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const comingSoonNav = [
  {
    icon: "analytics",
    label: "teste 2",
  },
  {
    icon: "group",
    label: "Equipe",
  },
];

export default function DashboardNav() {
  const pathname = usePathname();

  const isDashboard =
    pathname === "/dashboard";

  const isSettings =
    pathname.startsWith("/dashboard/settings");

  const isRoutes =
    pathname.startsWith("/dashboard/routes");

  return (
    <nav className="flex-1 px-4 space-y-1 hidden md:block">

      {/* DASHBOARD */}
      <Link
        href="/dashboard"
        className={`flex items-center h-12 px-4 rounded-xl transition-all ${
          isDashboard
            ? "bg-secondary-container text-on-secondary-container font-bold"
            : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
        }`}
      >
        <span className="material-symbols-outlined mr-4">
          dashboard
        </span>

        <span className="text-label-lg">
          Dashboard
        </span>
      </Link>

      {/* ROTAS DE COLETA */}
      <Link
        href="/dashboard/routes"
        className={`flex items-center h-12 px-4 rounded-xl transition-all ${
          isRoutes
            ? "bg-secondary-container text-on-secondary-container font-bold"
            : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
        }`}
      >
        <span className="material-symbols-outlined mr-4">
          route
        </span>

        <span className="text-label-lg">
          Rotas de Coleta
        </span>
      </Link>

      {/* ITENS EM BREVE */}
      {comingSoonNav.map((item) => (
        <span
          key={item.label}
          className="flex items-center justify-between h-12 px-4 rounded-xl text-on-surface-variant/50 cursor-not-allowed"
        >
          <span className="flex items-center">

            <span className="material-symbols-outlined mr-4">
              {item.icon}
            </span>

            <span className="text-label-lg">
              {item.label}
            </span>

          </span>

          <span className="text-[10px] uppercase tracking-wider bg-surface-variant px-2 py-0.5 rounded-full">
            Em breve
          </span>
        </span>
      ))}

      {/* CONFIGURAÇÕES */}
      <Link
        href="/dashboard/settings"
        className={`flex items-center h-12 px-4 rounded-xl transition-all ${
          isSettings
            ? "bg-secondary-container text-on-secondary-container font-bold"
            : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
        }`}
      >
        <span className="material-symbols-outlined mr-4">
          settings
        </span>

        <span className="text-label-lg">
          Configurações
        </span>
      </Link>

    </nav>
  );
}