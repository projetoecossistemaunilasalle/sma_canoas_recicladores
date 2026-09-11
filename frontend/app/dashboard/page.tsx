import Link from "next/link";
import { requireUser } from "@/lib/auth";
import {
  getVehicles,
  getRoutes,
  getCooperative,
  getLatestPosition,
} from "@/lib/data";
import { parseWktPoint, routeLiveStatusLabel, dayOfWeekLabel, shiftLabel, formatTime } from "@/lib/format";
import type { VehiclePosition } from "@/lib/types";
import { FleetMonitor, type FleetVehicleInfo } from "./fleet-monitor";
import { PageHeader } from "./page-header";

export default async function DashboardPage() {
  const { token, user } = await requireUser();

  const [vehicles, routes, cooperative] = await Promise.all([
    getVehicles(token),
    getRoutes(token),
    user.cooperativeId ? getCooperative(token, user.cooperativeId) : null,
  ]);

  const vehicleById = new Map(vehicles.map((v) => [v.id, v]));

  const positions = new Map<string, VehiclePosition | null>(
    await Promise.all(
      vehicles.map(
        async (v) => [v.id, await getLatestPosition(token, v.id)] as const
      )
    )
  );

  const activeVehicles = vehicles.filter((v) => v.active).length;
  // Real-time signal (today's schedule + current time inside the shift
  // window), not just `status` — every route sits at status "active" from
  // creation onward, so that alone can't tell "scheduled" from "happening
  // right now" (see RouteService.withRunningStatus on the backend).
  const runningRoutes = routes.filter((r) => r.isRunningNow).length;
  // Routes actually running now surface first; the rest keep their existing order.
  const sortedRoutes = [...routes].sort((a, b) => Number(b.isRunningNow) - Number(a.isRunningNow));

  const fleetVehicles: FleetVehicleInfo[] = vehicles.map((vehicle) => {
    const position = positions.get(vehicle.id);
    const coords = position ? parseWktPoint(position.location) : null;
    return {
      id: vehicle.id,
      plate: vehicle.plate,
      model: vehicle.model,
      color: vehicle.color,
      type: vehicle.type,
      active: vehicle.active,
      initialLat: coords?.lat ?? null,
      initialLng: coords?.lng ?? null,
      initialRecordedAt: position?.recordedAt ?? null,
    };
  });

  const title = cooperative
    ? cooperative.name
    : "Todas as Cooperativas";

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Painel da Cooperativa"
        title={title}
        description={`Acompanhe a frota e as rotas de coleta ${cooperative ? "da sua cooperativa" : "de todas as cooperativas"}.`}
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <QuickAction href="/dashboard/routes/new" icon="add_road" label="Nova Rota" />
        <QuickAction href="/dashboard/vehicles/new" icon="local_shipping" label="Novo Veículo" />
        {user.role === "cooperative_admin" ? (
          <QuickAction href="/dashboard/avisos" icon="campaign" label="Criar Aviso" />
        ) : null}
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
          value={String(runningRoutes)}
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
        <FleetMonitor vehicles={fleetVehicles} />
      </section>

      <section className="bg-surface-container rounded-2xl p-6 shadow-sm flex flex-col gap-4">
        <h2 className="text-title-lg text-on-surface">Rotas de Coleta</h2>
        {routes.length === 0 ? (
          <EmptyState message="Nenhuma rota cadastrada ainda." />
        ) : (
          <div className="flex flex-col gap-3">
            {sortedRoutes.map((route) => {
              const vehicle = route.vehicleId ? vehicleById.get(route.vehicleId) : undefined;
              return (
                <div
                  key={route.id}
                  className="bg-surface p-3 rounded-xl flex items-center gap-4 flex-wrap"
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      route.isRunningNow
                        ? "bg-primary text-on-primary"
                        : "bg-secondary-container text-on-secondary-container"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      route
                    </span>
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <p className="text-label-lg text-on-surface truncate">
                      {vehicle?.plate ?? "Veículo removido"}
                      {vehicle?.model ? ` · ${vehicle.model}` : ""}
                    </p>
                    <p className="text-body-md text-xs text-on-surface-variant truncate">
                      {(route.daysOfWeek ?? []).map(dayOfWeekLabel).join(", ") || "Sem dias"}
                      {" · "}
                      {route.shift ? shiftLabel(route.shift) : "Sem turno"}
                      {route.startTime ? ` · ${formatTime(route.startTime)}` : ""}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] uppercase px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1 ${
                      route.isRunningNow
                        ? "text-primary bg-primary/10 font-bold"
                        : "text-secondary bg-secondary/10"
                    }`}
                  >
                    {route.isRunningNow ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" aria-hidden="true" />
                    ) : null}
                    {routeLiveStatusLabel(route)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function QuickAction({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 bg-surface-container rounded-2xl px-4 py-3.5 shadow-sm hover:shadow-md transition-shadow"
    >
      <span className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center shrink-0">
        <span className="material-symbols-outlined text-[20px]">{icon}</span>
      </span>
      <span className="text-label-lg text-on-surface">{label}</span>
    </Link>
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

function EmptyState({ message }: { message: string }) {
  return (
    <p className="text-body-md text-on-surface-variant py-6 text-center">
      {message}
    </p>
  );
}
