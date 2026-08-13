import { redirect } from "next/navigation";
import { getToken } from "@/lib/session";
import { getCurrentUser } from "@/lib/auth";
import {
  getVehicles,
  getRoutes,
  getCooperative,
  getLatestPosition,
} from "@/lib/data";
import { parseWktPoint, relativeTime, routeStatusLabel } from "@/lib/format";
import type { Vehicle, VehiclePosition } from "@/lib/types";
import type { FleetMapPoint } from "./fleet-map";
import FleetMap from "./fleet-map-client";

export default async function DashboardPage() {
  const token = await getToken();
  if (!token) redirect("/login");

  const user = await getCurrentUser(token);
  if (!user) redirect("/login");

  const [vehicles, routes, cooperative] = await Promise.all([
    getVehicles(token),
    getRoutes(token),
    user.cooperativeId ? getCooperative(token, user.cooperativeId) : null,
  ]);

  const positions = new Map<string, VehiclePosition | null>(
    await Promise.all(
      vehicles.map(
        async (v) => [v.id, await getLatestPosition(token, v.id)] as const
      )
    )
  );

  const activeVehicles = vehicles.filter((v) => v.active).length;
  const activeRoutes = routes.filter((r) => r.status === "active").length;

  const mapPoints: FleetMapPoint[] = vehicles.flatMap((vehicle) => {
    const position = positions.get(vehicle.id);
    const coords = position ? parseWktPoint(position.location) : null;
    if (!position || !coords) return [];
    return [
      {
        id: vehicle.id,
        label: `${vehicle.plate ?? "Sem placa"}${vehicle.model ? ` · ${vehicle.model}` : ""}`,
        sublabel: `Atualizado ${relativeTime(position.recordedAt)}`,
        lat: coords.lat,
        lng: coords.lng,
      },
    ];
  });

  const title = cooperative
    ? cooperative.name
    : "Todas as Cooperativas";

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <span className="text-label-lg text-primary uppercase tracking-wider">
          Painel da Cooperativa
        </span>
        <h1 className="text-display-lg text-on-surface">{title}</h1>
        <p className="text-body-lg text-on-surface-variant">
          Acompanhe a frota e as rotas de coleta{" "}
          {cooperative ? "da sua cooperativa" : "de todas as cooperativas"}.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon="local_shipping"
          label="Veículos"
          value={String(vehicles.length)}
        />
        <StatCard
          icon="check_circle"
          label="Veículos Ativos"
          value={String(activeVehicles)}
        />
        <StatCard
          icon="route"
          label="Rotas em Andamento"
          value={String(activeRoutes)}
        />
        <StatCard
          icon="event_repeat"
          label="Rotas Totais"
          value={String(routes.length)}
        />
      </div>

      <section className="bg-surface-container rounded-2xl p-6 shadow-sm flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-title-lg text-on-surface">
            Monitoramento de Frota
          </h2>
        </div>
        <FleetMap points={mapPoints} />
        {vehicles.length === 0 ? (
          <EmptyState message="Nenhum veículo cadastrado ainda." />
        ) : (
          <div className="flex flex-col gap-3">
            {vehicles.map((vehicle) => (
              <VehicleRow
                key={vehicle.id}
                vehicle={vehicle}
                position={positions.get(vehicle.id) ?? null}
              />
            ))}
          </div>
        )}
      </section>

      <section className="bg-surface-container rounded-2xl p-6 shadow-sm flex flex-col gap-4">
        <h2 className="text-title-lg text-on-surface">Rotas de Coleta</h2>
        {routes.length === 0 ? (
          <EmptyState message="Nenhuma rota cadastrada ainda." />
        ) : (
          <div className="flex flex-col gap-3">
            {routes.map((route) => (
              <div
                key={route.id}
                className="bg-surface p-3 rounded-xl flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">
                    route
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-label-lg text-on-surface truncate">
                    {route.scheduledDate ?? "Sem data agendada"}
                  </p>
                  <p className="text-body-md text-xs text-on-surface-variant truncate">
                    {route.totalDistanceKm
                      ? `${route.totalDistanceKm.toFixed(1)} km`
                      : "Distância não calculada"}
                  </p>
                </div>
                <span className="text-[10px] uppercase text-secondary px-2 py-0.5 bg-secondary/10 rounded-full shrink-0">
                  {routeStatusLabel(route.status)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-surface-container rounded-2xl p-6 flex flex-col justify-between shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex flex-col">
          <span className="text-label-lg text-on-surface-variant uppercase tracking-wider mb-1">
            {label}
          </span>
          <span className="text-display-lg text-on-surface">{value}</span>
        </div>
        <div className="w-12 h-12 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-[24px]">
            {icon}
          </span>
        </div>
      </div>
    </div>
  );
}

function VehicleRow({
  vehicle,
  position,
}: {
  vehicle: Vehicle;
  position: VehiclePosition | null;
}) {
  const coords = position ? parseWktPoint(position.location) : null;

  return (
    <div className="bg-surface p-3 rounded-xl flex items-center gap-4">
      <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center shrink-0">
        <span className="material-symbols-outlined text-[20px]">
          local_shipping
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-label-lg text-on-surface truncate">
          {vehicle.plate ?? "Sem placa"}
          {vehicle.model ? ` · ${vehicle.model}` : ""}
        </p>
        <p className="text-body-md text-xs text-on-surface-variant truncate">
          {coords && position
            ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)} · ${relativeTime(position.recordedAt)}`
            : "Sem posição registrada"}
        </p>
      </div>
      <span
        className={`text-[10px] uppercase px-2 py-0.5 rounded-full shrink-0 ${
          vehicle.active
            ? "text-primary bg-primary/10"
            : "text-on-surface-variant bg-surface-variant"
        }`}
      >
        {vehicle.active ? "Ativo" : "Inativo"}
      </span>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <p className="text-body-md text-on-surface-variant py-6 text-center">
      {message}
    </p>
  );
}
