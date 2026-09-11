import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getVehicle, getCooperatives } from "@/lib/data";
import { ApiError } from "@/lib/api";
import { VehicleForm } from "../../vehicle-form";
import { PageHeader } from "../../../page-header";

export default async function EditVehiclePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { token, user } = await requireUser();

  let vehicle;
  try {
    vehicle = await getVehicle(token, id);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  const cooperatives = user.role === "admin" ? await getCooperatives(token) : undefined;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="Frota" title="Editar Veículo" />
      <VehicleForm vehicle={vehicle} cooperatives={cooperatives} />
    </div>
  );
}
