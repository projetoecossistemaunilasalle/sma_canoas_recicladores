import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getCooperative } from "@/lib/data";
import { PageHeader } from "../page-header";
import { CooperativaForm } from "./cooperativa-form";

export default async function CooperativaPage() {
  const { token, user } = await requireUser();

  // "admin" has no cooperativeId — "edit my cooperative" doesn't apply to it.
  if (user.role !== "cooperative_admin" || !user.cooperativeId) {
    redirect("/dashboard");
  }

  const cooperative = await getCooperative(token, user.cooperativeId);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Cooperativa"
        title="Minha Cooperativa"
        description="Essas informações aparecem para os cidadãos no mapa e na lista de cooperativas."
      />
      <CooperativaForm cooperative={cooperative} />
    </div>
  );
}
