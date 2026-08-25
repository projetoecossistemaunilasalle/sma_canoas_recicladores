import { redirect } from "next/navigation";
import { getToken } from "@/lib/session";
import { getCooperatives } from "@/lib/data";

export default async function CooperativasPage() {
  const token = await getToken();
  if (!token) redirect("/login");

  const cooperatives = (await getCooperatives(token)).filter((c) => c.active);

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 pb-28 flex flex-col gap-6">
      <div>
        <h1 className="text-display-lg text-on-surface">Cooperativas de Canoas</h1>
        <p className="text-body-md text-on-surface-variant">
          Conheça as cooperativas que fazem a coleta seletiva na cidade.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {cooperatives.map((coop) => (
          <div
            key={coop.id}
            className="bg-surface-container-lowest rounded-2xl p-4 shadow-sm border border-outline-variant/30 flex flex-col gap-2"
          >
            <p className="text-title-lg text-on-surface">{coop.name}</p>
            {coop.address ? (
              <p className="text-body-md text-on-surface-variant flex items-center gap-1">
                <span className="material-symbols-outlined text-[18px]">location_on</span>
                {coop.address}
              </p>
            ) : null}
            <div className="flex items-center gap-3 mt-1">
              {coop.phone ? (
                <a
                  href={`tel:${coop.phone}`}
                  className="text-label-lg text-primary flex items-center gap-1 hover:underline"
                >
                  <span className="material-symbols-outlined text-[18px]">call</span>
                  Contato
                </a>
              ) : null}
              {coop.address ? (
                <a
                  href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(coop.address)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-label-lg text-primary flex items-center gap-1 hover:underline"
                >
                  <span className="material-symbols-outlined text-[18px]">map</span>
                  Ver no mapa
                </a>
              ) : null}
              {coop.instagram ? (
                <a
                  href={coop.instagram}
                  target="_blank"
                  rel="noreferrer"
                  className="text-label-lg text-primary flex items-center gap-1 hover:underline"
                >
                  <span className="material-symbols-outlined text-[18px]">alternate_email</span>
                  Instagram
                </a>
              ) : null}
            </div>
          </div>
        ))}
        {cooperatives.length === 0 ? (
          <p className="text-body-md text-on-surface-variant">Nenhuma cooperativa cadastrada ainda.</p>
        ) : null}
      </div>
    </main>
  );
}
