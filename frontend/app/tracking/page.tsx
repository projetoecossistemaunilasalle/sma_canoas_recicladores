import { redirect } from "next/navigation";
import { getToken } from "@/lib/session";
import { getCurrentUser } from "@/lib/auth";
import { getVehicles } from "@/lib/data";
import { logout } from "@/app/login/actions";
import { TrackingWidget } from "./tracking-widget";

export default async function TrackingPage() {
  const token = await getToken();
  if (!token) redirect("/login");

  const user = await getCurrentUser(token);
  if (!user) redirect("/login");

  const vehicles = await getVehicles(token);

  return (
    <main className="min-h-screen bg-background">
      <header className="h-20 px-container-margin flex items-center justify-between border-b border-outline-variant">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[32px]">
            recycling
          </span>
          <span className="text-headline-lg text-primary tracking-tight">
            Canoas Coleta+
          </span>
        </div>
        <form action={logout}>
          <button
            className="text-label-lg text-on-surface-variant hover:text-primary transition-colors"
            type="submit"
          >
            Sair
          </button>
        </form>
      </header>
      <div className="max-w-2xl mx-auto px-container-margin py-8 flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-display-lg text-on-surface">Onde está o caminhão?</h1>
          <p className="text-body-lg text-on-surface-variant">
            Olá, {user.name}. Escolha o caminhão da sua região e sua localização para saber
            se ele passa perto de você hoje.
          </p>
        </div>
        <TrackingWidget vehicles={vehicles} />
      </div>
    </main>
  );
}
