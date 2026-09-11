import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getRoutes, getVehicles } from "@/lib/data";
import { routeLiveStatusLabel, dayOfWeekLabel, shiftLabel } from "@/lib/format";
import { deleteRouteAction } from "./actions";
import { PageHeader, EmptyListCard } from "../page-header";
import { RowActions } from "../row-actions";

export default async function RoutesListPage() {
  const { token } = await requireUser();

  const [routes, vehicles] = await Promise.all([getRoutes(token), getVehicles(token)]);
  const vehicleById = new Map(vehicles.map((v) => [v.id, v]));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Rotas de Coleta"
        title="Rotas Cadastradas"
        action={
          <Link
            className="flex items-center gap-2 px-5 h-12 bg-primary text-on-primary text-action-lg rounded-full hover:bg-primary-container transition-colors shrink-0"
            href="/dashboard/routes/new"
          >
            <span className="material-symbols-outlined">add_circle</span>
            Nova Rota
          </Link>
        }
      />

      {routes.length === 0 ? (
        <EmptyListCard message="Nenhuma rota cadastrada ainda." />
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
                    {(route.daysOfWeek ?? []).map(dayOfWeekLabel).join(", ") || "Sem dias"}
                    {" · "}
                    {route.shift ? shiftLabel(route.shift) : "Sem turno"}
                    {route.startTime ? ` · ${route.startTime.slice(0, 5)}` : ""}
                  </p>
                  <p className="text-body-md text-on-surface-variant">
                    {route.totalDistanceKm != null
                      ? `${route.totalDistanceKm.toFixed(1)} km`
                      : "Distância não calculada"}
                  </p>
                </div>
                <span
                  className={`text-[10px] uppercase px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1 ${
                    route.isRunningNow ? "text-primary bg-primary/10 font-bold" : "text-secondary bg-secondary/10"
                  }`}
                >
                  {route.isRunningNow ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" aria-hidden="true" />
                  ) : null}
                  {routeLiveStatusLabel(route)}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  <RowActions
                    editHref={`/dashboard/routes/${route.id}/edit`}
                    deleteAction={deleteRouteAction.bind(null, route.id)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
