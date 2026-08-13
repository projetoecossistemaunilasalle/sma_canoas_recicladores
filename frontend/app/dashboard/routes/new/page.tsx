import { redirect } from "next/navigation";
import { getToken } from "@/lib/session";
import { getCurrentUser } from "@/lib/auth";
import { getVehicles } from "@/lib/data";
import { RouteBuilder } from "./route-builder";

export default async function NewRoutePage() {
  const token = await getToken();
  if (!token) redirect("/login");

  const user = await getCurrentUser(token);
  if (!user) redirect("/login");

  const vehicles = await getVehicles(token);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <span className="text-label-lg text-primary uppercase tracking-wider">
          Rotas de Coleta
        </span>
        <h1 className="text-display-lg text-on-surface">Nova Rota</h1>
        <p className="text-body-lg text-on-surface-variant">
          Escolha o veículo e a sequência de ruas. O trajeto entre elas é calculado
          automaticamente pela malha viária.
        </p>
      </div>
      <RouteBuilder vehicles={vehicles} />
    </div>
  );
}
