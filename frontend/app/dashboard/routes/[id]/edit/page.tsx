import { redirect, notFound } from "next/navigation";
import { getToken } from "@/lib/session";
import { getCurrentUser } from "@/lib/auth";
import { getRoute, getRouteStops, getVehicles } from "@/lib/data";
import { ApiError } from "@/lib/api";
import { RouteBuilder } from "../../new/route-builder";

export default async function EditRoutePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const token = await getToken();
  if (!token) redirect("/login");

  const user = await getCurrentUser(token);
  if (!user) redirect("/login");

  let route;
  try {
    [route] = await Promise.all([getRoute(token, id)]);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  const [stops, vehicles] = await Promise.all([getRouteStops(token, id), getVehicles(token)]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <span className="text-label-lg text-primary uppercase tracking-wider">
          Rotas de Coleta
        </span>
        <h1 className="text-display-lg text-on-surface">Editar Rota</h1>
      </div>
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
