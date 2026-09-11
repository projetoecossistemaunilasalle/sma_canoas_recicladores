import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getRoute, getRouteStops, getVehicles } from "@/lib/data";
import { ApiError } from "@/lib/api";
import { RouteBuilder } from "../../new/route-builder";
import { PageHeader } from "../../../page-header";

export default async function EditRoutePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { token } = await requireUser();

  let route;
  try {
    route = await getRoute(token, id);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  const [stops, vehicles] = await Promise.all([getRouteStops(token, id), getVehicles(token)]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="Rotas de Coleta" title="Editar Rota" />
      <RouteBuilder
        vehicles={vehicles}
        initial={{
          routeId: route.id,
          vehicleId: route.vehicleId ?? undefined,
          daysOfWeek: route.daysOfWeek ?? [],
          shift: route.shift ?? undefined,
          startTime: route.startTime?.slice(0, 5),
          stops: stops.map((s) => ({
            id: s.streetId,
            name: s.name,
            geom: s.geom,
            highwayType: null,
            requiresCollection: null,
            lengthKm: null,
            source: null,
            target: null,
          })),
        }}
      />
    </div>
  );
}
