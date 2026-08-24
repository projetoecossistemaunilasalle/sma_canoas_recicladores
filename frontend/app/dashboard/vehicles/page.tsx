import Link from "next/link";
import { redirect } from "next/navigation";
import { getToken } from "@/lib/session";
import { getCurrentUser } from "@/lib/auth";
import { getVehicles, getCooperatives } from "@/lib/data";
import { deleteVehicleAction } from "./actions";
import { vehicleColorHex, vehicleColorLabel, vehicleTypeIcon, vehicleTypeLabel } from "@/lib/vehicle-options";

export default async function VehiclesListPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const token = await getToken();
  if (!token) redirect("/login");

  const user = await getCurrentUser(token);
  if (!user) redirect("/login");

  const [vehicles, cooperatives] = await Promise.all([
    getVehicles(token),
    user.role === "admin" ? getCooperatives(token) : Promise.resolve([]),
  ]);
  const cooperativeById = new Map(cooperatives.map((c) => [c.id, c]));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-2">
          <span className="text-label-lg text-primary uppercase tracking-wider">
            Frota
          </span>
          <h1 className="text-display-lg text-on-surface">Veículos Cadastrados</h1>
        </div>
        <Link
          className="flex items-center gap-2 px-5 h-12 bg-primary text-on-primary text-action-lg rounded-full hover:bg-primary-container transition-colors shrink-0"
          href="/dashboard/vehicles/new"
        >
          <span className="material-symbols-outlined">add_circle</span>
          Novo Veículo
        </Link>
      </div>

      {error ? (
        <div className="bg-error-container text-on-error-container rounded-2xl p-4 text-body-md">
          {error}
        </div>
      ) : null}

      {vehicles.length === 0 ? (
        <div className="bg-surface-container rounded-2xl p-12 text-center">
          <p className="text-body-lg text-on-surface-variant">
            Nenhum veículo cadastrado ainda.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {vehicles.map((vehicle) => {
            const cooperative = vehicle.cooperativeId
              ? cooperativeById.get(vehicle.cooperativeId)
              : undefined;
            return (
              <div
                key={vehicle.id}
                className="bg-surface-container rounded-2xl p-5 flex items-center gap-4 flex-wrap"
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 text-white"
                  style={{ backgroundColor: vehicleColorHex(vehicle.color) }}
                  title={vehicleTypeLabel(vehicle.type)}
                >
                  <span className="material-symbols-outlined">
                    {vehicleTypeIcon(vehicle.type)}
                  </span>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <p className="text-title-lg text-on-surface">
                    {vehicle.plate ?? "Sem placa"}
                    {vehicle.model ? ` · ${vehicle.model}` : ""}
                  </p>
                  <p className="text-body-md text-on-surface-variant">
                    {vehicleTypeLabel(vehicle.type)}
                    {vehicleColorLabel(vehicle.color) ? ` · ${vehicleColorLabel(vehicle.color)}` : ""}
                    {cooperative ? ` · ${cooperative.name}` : ""}
                  </p>
                </div>
                <span
                  className={`text-[10px] uppercase px-2 py-0.5 rounded-full shrink-0 ${
                    vehicle.active
                      ? "text-secondary bg-secondary/10"
                      : "text-on-surface-variant bg-surface-variant"
                  }`}
                >
                  {vehicle.active ? "Ativo" : "Inativo"}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  <Link
                    className="p-2 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-full transition-colors"
                    href={`/dashboard/vehicles/${vehicle.id}/edit`}
                    aria-label="Editar"
                    title="Editar"
                  >
                    <span className="material-symbols-outlined">edit</span>
                  </Link>
                  <form action={deleteVehicleAction.bind(null, vehicle.id)}>
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
