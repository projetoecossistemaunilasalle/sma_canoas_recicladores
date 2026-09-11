import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getVehicles, getCooperatives } from "@/lib/data";
import { deleteVehicleAction } from "./actions";
import { VehicleLoanControl } from "./vehicle-loan-control";
import { PageHeader, EmptyListCard } from "../page-header";
import { RowActions } from "../row-actions";
import { vehicleColorHex, vehicleColorLabel, vehicleTypeIcon, vehicleTypeLabel } from "@/lib/vehicle-options";

export default async function VehiclesListPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const { token, user } = await requireUser();

  const [vehicles, cooperatives] = await Promise.all([
    getVehicles(token),
    user.role === "admin" || user.role === "cooperative_admin" ? getCooperatives(token) : Promise.resolve([]),
  ]);
  const cooperativeById = new Map(cooperatives.map((c) => [c.id, c]));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Frota"
        title="Veículos Cadastrados"
        action={
          <Link
            className="flex items-center gap-2 px-5 h-12 bg-primary text-on-primary text-action-lg rounded-full hover:bg-primary-container transition-colors shrink-0"
            href="/dashboard/vehicles/new"
          >
            <span className="material-symbols-outlined">add_circle</span>
            Novo Veículo
          </Link>
        }
      />

      {error ? (
        <div className="bg-error-container text-on-error-container rounded-2xl p-4 text-body-md">
          {error}
        </div>
      ) : null}

      {vehicles.length === 0 ? (
        <EmptyListCard message="Nenhum veículo cadastrado ainda." />
      ) : (
        <div className="flex flex-col gap-3">
          {vehicles.map((vehicle) => {
            const cooperative = vehicle.cooperativeId
              ? cooperativeById.get(vehicle.cooperativeId)
              : undefined;
            const borrowerCoop = vehicle.loanedToCooperativeId
              ? cooperativeById.get(vehicle.loanedToCooperativeId)
              : undefined;
            const isOwner = user.role === "admin" || vehicle.cooperativeId === user.cooperativeId;
            const isBorrowedByViewer =
              user.role === "cooperative_admin" && !isOwner && vehicle.loanedToCooperativeId === user.cooperativeId;
            const lendTargets = cooperatives.filter((c) => c.active && c.id !== vehicle.cooperativeId);

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
                  {isOwner && vehicle.loanedToCooperativeId ? (
                    <p className="text-label-lg text-tertiary flex items-center gap-1 mt-1">
                      <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                        sync_alt
                      </span>
                      Emprestado para {borrowerCoop?.name ?? "outra cooperativa"}
                    </p>
                  ) : null}
                  {isBorrowedByViewer ? (
                    <p className="text-label-lg text-tertiary flex items-center gap-1 mt-1">
                      <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                        sync_alt
                      </span>
                      Emprestado por {cooperative?.name ?? "outra cooperativa"}
                    </p>
                  ) : null}
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
                <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                  {isOwner ? (
                    <VehicleLoanControl vehicle={vehicle} lendTargets={lendTargets} borrowerName={borrowerCoop?.name} />
                  ) : null}
                  {isOwner ? (
                    <RowActions
                      editHref={`/dashboard/vehicles/${vehicle.id}/edit`}
                      deleteAction={deleteVehicleAction.bind(null, vehicle.id)}
                    />
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
