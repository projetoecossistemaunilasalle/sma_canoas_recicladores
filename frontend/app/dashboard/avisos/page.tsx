import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getAnnouncements } from "@/lib/data";
import { PageHeader } from "../page-header";
import { AvisosForm } from "./avisos-form";

export default async function DashboardAvisosPage() {
  const { token, user } = await requireUser();

  if (user.role !== "cooperative_admin" || !user.cooperativeId) {
    redirect("/dashboard");
  }

  const recentPosts = await getAnnouncements(token, { cooperativeId: user.cooperativeId });

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
