import { requireCooperativeAdmin } from "@/lib/auth";
import { getCooperative } from "@/lib/data";
import { PageHeader } from "../page-header";
import { CooperativaForm } from "./cooperativa-form";

export default async function CooperativaPage() {
  const { token, cooperativeId } = await requireCooperativeAdmin();
  const cooperative = await getCooperative(token, cooperativeId);

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
