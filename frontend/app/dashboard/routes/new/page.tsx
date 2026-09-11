import { requireUser } from "@/lib/auth";
import { getVehicles } from "@/lib/data";
import { RouteBuilder } from "./route-builder";
import { PageHeader } from "../../page-header";

export default async function NewRoutePage() {
  const { token } = await requireUser();

  const vehicles = await getVehicles(token);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Rotas de Coleta"
        title="Nova Rota"
        description="Escolha o veículo e a sequência de ruas. O trajeto entre elas é calculado automaticamente pela malha viária."
      />
      <RouteBuilder vehicles={vehicles} />
    </div>
  );
}
