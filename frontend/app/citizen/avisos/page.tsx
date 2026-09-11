import { requireUser } from "@/lib/auth";
import { getAnnouncements } from "@/lib/data";
import { AvisosList } from "./avisos-list";

export default async function AvisosPage() {
  const { token } = await requireUser();
  const announcements = await getAnnouncements(token);

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 pb-28 flex flex-col gap-6">
      <div>
        <h1 className="text-display-lg text-on-surface">Avisos e Notícias</h1>
        <p className="text-body-md text-on-surface-variant">
          Publicações das cooperativas de Canoas, mais recentes primeiro.
        </p>
      </div>
      <AvisosList announcements={announcements} />
    </main>
  );
}
