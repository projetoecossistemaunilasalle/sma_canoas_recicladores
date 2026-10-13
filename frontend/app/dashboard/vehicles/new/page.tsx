import { VehicleForm } from "../vehicle-form";
import { PageHeader } from "../../page-header";

export default function NewVehiclePage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="Frota" title="Novo Veículo" />
      <VehicleForm />
    </div>
  );
}
