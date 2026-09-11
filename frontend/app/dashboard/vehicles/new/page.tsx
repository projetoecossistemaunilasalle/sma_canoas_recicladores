import { requireUser } from "@/lib/auth";
import { getCooperatives } from "@/lib/data";
import { VehicleForm } from "../vehicle-form";
import { PageHeader } from "../../page-header";

export default async function NewVehiclePage() {
  const { token, user } = await requireUser();

  const cooperatives = user.role === "admin" ? await getCooperatives(token) : undefined;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="Frota" title="Novo Veículo" />
      <VehicleForm cooperatives={cooperatives} />
    </div>
  );
}
