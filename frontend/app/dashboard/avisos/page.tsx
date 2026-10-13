import { requireCooperativeAdmin } from "@/lib/auth";
import { getAnnouncements } from "@/lib/data";
import { PageHeader } from "../page-header";
import { AvisosForm } from "./avisos-form";

export default async function DashboardAvisosPage() {
  const { token, cooperativeId } = await requireCooperativeAdmin();
  const recentPosts = await getAnnouncements(token, { cooperativeId });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Comunicação"
        title="Avisos e Notícias"
        description="Publique um aviso ou notícia para os cidadãos de Canoas."
      />
      <AvisosForm recentPosts={recentPosts} />
    </div>
  );
}
