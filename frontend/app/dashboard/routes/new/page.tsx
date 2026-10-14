import { requireUser } from "@/lib/auth";
import { getVehicles } from "@/lib/data";
import { RouteBuilder } from "./route-builder";
import { PageHeader } from "../../page-header";

export default async function NewRoutePage() {
  const { token } = await requireUser("/admin/login");

  const vehicles = await getVehicles(token);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Rotas de Coleta"
        title="Nova Rota"
        description="Marque no mapa as ruas onde o caminhão vai coletar, na ordem. O caminho entre uma rua e outra é calculado sozinho."
      />
      <RouteBuilder vehicles={vehicles} />
    </div>
  );
}
