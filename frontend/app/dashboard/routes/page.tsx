import Link from "next/link";
import { redirect } from "next/navigation";
import { getToken } from "@/lib/session";
import { getCurrentUser } from "@/lib/auth";
import { getRoutes, getVehicles } from "@/lib/data";
import { routeStatusLabel } from "@/lib/format";
import { deleteRouteAction } from "./actions";

const dayLabels: Record<string, string> = {
  seg: "Seg",
  ter: "Ter",
  qua: "Qua",
  qui: "Qui",
  sex: "Sex",
  sab: "Sáb",
  dom: "Dom",
};

const shiftLabels: Record<string, string> = {
  manha: "Manhã",
  tarde: "Tarde",
  noite: "Noite",
};

export default async function RoutesListPage() {
  const token = await getToken();
  if (!token) redirect("/login");

  const user = await getCurrentUser(token);
  if (!user) redirect("/login");

  const [routes, vehicles] = await Promise.all([getRoutes(token), getVehicles(token)]);
  const vehicleById = new Map(vehicles.map((v) => [v.id, v]));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-2">
          <span className="text-label-lg text-primary uppercase tracking-wider">
            Rotas de Coleta
          </span>
          <h1 className="text-display-lg text-on-surface">Rotas Cadastradas</h1>
        </div>
        <Link
          className="flex items-center gap-2 px-5 h-12 bg-primary text-on-primary text-action-lg rounded-full hover:bg-primary-container transition-colors shrink-0"
          href="/dashboard/routes/new"
        >
          <span className="material-symbols-outlined">add_circle</span>
          Nova Rota
        </Link>
      </div>

      {routes.length === 0 ? (
        <div className="bg-surface-container rounded-2xl p-12 text-center">
          <p className="text-body-lg text-on-surface-variant">
            Nenhuma rota cadastrada ainda.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {routes.map((route) => {
            const vehicle = route.vehicleId ? vehicleById.get(route.vehicleId) : undefined;
            return (
              <div
                key={route.id}
                className="bg-surface-container rounded-2xl p-5 flex items-center gap-4 flex-wrap"
              >
                <div className="w-12 h-12 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined">local_shipping</span>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <p className="text-title-lg text-on-surface">
                    {vehicle?.plate ?? "Veículo removido"}
                    {vehicle?.model ? ` · ${vehicle.model}` : ""}
                  </p>
                  <p className="text-body-md text-on-surface-variant">
                    {(route.daysOfWeek ?? []).map((d) => dayLabels[d] ?? d).join(", ") || "Sem dias"}
                    {" · "}
                    {route.shift ? shiftLabels[route.shift] ?? route.shift : "Sem turno"}
                    {route.startTime ? ` · ${route.startTime.slice(0, 5)}` : ""}
                  </p>
                  <p className="text-body-md text-on-surface-variant">
                    {route.totalDistanceKm != null
                      ? `${route.totalDistanceKm.toFixed(1)} km`
                      : "Distância não calculada"}
                  </p>
                </div>
                <span className="text-[10px] uppercase text-secondary px-2 py-0.5 bg-secondary/10 rounded-full shrink-0">
                  {routeStatusLabel(route.status)}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  <Link
                    className="p-2 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-full transition-colors"
                    href={`/dashboard/routes/${route.id}/edit`}
                    aria-label="Editar"
                    title="Editar"
                  >
                    <span className="material-symbols-outlined">edit</span>
                  </Link>
                  <form action={deleteRouteAction.bind(null, route.id)}>
                    <button
                      className="p-2 text-on-surface-variant hover:text-error hover:bg-error-container rounded-full transition-colors"
                      type="submit"
                      aria-label="Excluir"
                      title="Excluir"
                    >
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
