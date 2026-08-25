import { redirect } from "next/navigation";
import Link from "next/link";
import { getToken } from "@/lib/session";
import { getCurrentUser } from "@/lib/auth";
import { CitizenHomeSummary } from "./citizen-home-summary";

export default async function CitizenHomePage() {
  const token = await getToken();
  if (!token) redirect("/login");
  const user = await getCurrentUser(token);
  if (!user) redirect("/login");

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 pb-28 flex flex-col gap-6">
      <div>
        <p className="text-body-md text-on-surface-variant">Olá, {user.name.split(" ")[0]} 👋</p>
        <h1 className="text-display-lg text-on-surface">Como posso ajudar você hoje?</h1>
      </div>

      {user.addressLat != null && user.addressLng != null ? (
        <CitizenHomeSummary lat={user.addressLat} lng={user.addressLng} />
      ) : (
        <Link
          href="/citizen/perfil"
          className="block bg-surface-container rounded-2xl p-5 shadow-sm border border-outline-variant/30"
        >
          <p className="text-title-lg text-on-surface">Cadastre seu endereço</p>
          <p className="text-body-md text-on-surface-variant">
            Pra acompanhar a coleta na sua rua, adicione seu endereço no Perfil.
          </p>
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3">
        <QuickAction href="/citizen/minha-coleta" icon="local_shipping" label="Quando o caminhão passa?" />
        <QuickAction href="/citizen/educacao" icon="recycling" label="Posso reciclar este material?" />
        <QuickAction href="/citizen/cooperativas" icon="groups" label="Onde fica a cooperativa mais próxima?" />
      </div>
    </main>
  );
}

function QuickAction({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-2 bg-surface-container-lowest rounded-2xl p-4 shadow-sm border border-outline-variant/30 hover:shadow-md transition-shadow"
    >
      <span className="material-symbols-outlined text-primary text-[28px]">{icon}</span>
      <span className="text-label-lg text-on-surface">{label}</span>
    </Link>
  );
}
