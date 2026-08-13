import Link from "next/link";
import { redirect } from "next/navigation";
import { getToken } from "@/lib/session";
import { getCurrentUser } from "@/lib/auth";
import { logout } from "@/app/login/actions";

const comingSoonNav = [
  { icon: "analytics", label: "teste 2" },
  { icon: "group", label: "Equipe" },
  { icon: "settings", label: "Configurações" },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const token = await getToken();
  if (!token) redirect("/login");

  const user = await getCurrentUser(token);
  if (!user) redirect("/login");

  if (user.role !== "admin" && user.role !== "cooperative_admin") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background p-8 text-center">
        <span className="material-symbols-outlined text-primary text-[48px]">
          lock
        </span>
        <h1 className="text-headline-lg text-on-surface">Acesso restrito</h1>
        <p className="text-body-md text-on-surface-variant max-w-md">
          Esta área é exclusiva para a equipe das cooperativas.
        </p>
        <form action={logout}>
          <button
            className="mt-3 px-6 h-12 bg-primary text-on-primary text-action-lg rounded-full hover:bg-primary-container transition-colors"
            type="submit"
          >
            Sair
          </button>
        </form>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-surface md:flex">
      <aside className="md:fixed md:left-0 md:top-0 md:h-full md:w-72 bg-surface-container-lowest md:shadow-[1px_0_8px_rgba(0,0,0,0.02)] flex md:flex-col">
        <div className="px-8 py-8 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[32px]">
            recycling
          </span>
          <div className="flex flex-col">
            <span className="text-headline-lg text-primary leading-none">
              Canoas
            </span>
            <span className="text-label-lg text-secondary tracking-widest uppercase">
              Coleta+
            </span>
          </div>
        </div>
        <nav className="flex-1 px-4 space-y-1 hidden md:block">
          <span className="flex items-center h-12 px-4 rounded-xl bg-secondary-container text-on-secondary-container font-bold">
            <span className="material-symbols-outlined mr-4">
              dashboard
            </span>
            <span className="text-label-lg">Dashboard</span>
          </span>
          <Link
            className="flex items-center h-12 px-4 rounded-xl text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all"
            href="/dashboard/routes"
          >
            <span className="material-symbols-outlined mr-4">route</span>
            <span className="text-label-lg">Rotas de Coleta</span>
          </Link>
          {comingSoonNav.map((item) => (
            <span
              key={item.label}
              className="flex items-center justify-between h-12 px-4 rounded-xl text-on-surface-variant/50 cursor-not-allowed"
            >
              <span className="flex items-center">
                <span className="material-symbols-outlined mr-4">
                  {item.icon}
                </span>
                <span className="text-label-lg">{item.label}</span>
              </span>
              <span className="text-[10px] uppercase tracking-wider bg-surface-variant px-2 py-0.5 rounded-full">
                Em breve
              </span>
            </span>
          ))}
        </nav>
        <div className="p-8 border-t border-outline-variant mt-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-on-primary text-[20px]">
                person
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-label-lg text-on-surface truncate">
                {user.name}
              </p>
              <p className="text-xs text-on-surface-variant truncate">
                {user.role === "admin" ? "Administrador" : "Cooperativa"}
              </p>
            </div>
          </div>
          <form action={logout}>
            <button
              className="p-2 text-on-surface-variant hover:text-error hover:bg-error-container rounded-full transition-colors shrink-0"
              type="submit"
              aria-label="Sair"
              title="Sair"
            >
              <span className="material-symbols-outlined">logout</span>
            </button>
          </form>
        </div>
      </aside>
      <div className="flex-1 md:pl-72">
        <main className="px-5 py-8">{children}</main>
      </div>
    </div>
  );
}
