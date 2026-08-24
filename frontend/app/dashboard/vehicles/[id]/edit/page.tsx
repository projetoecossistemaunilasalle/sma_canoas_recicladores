import { redirect, notFound } from "next/navigation";
import { getToken } from "@/lib/session";
import { getCurrentUser } from "@/lib/auth";
import { getVehicle, getCooperatives } from "@/lib/data";
import { ApiError } from "@/lib/api";
import { VehicleForm } from "../../vehicle-form";

export default async function EditVehiclePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const token = await getToken();
  if (!token) redirect("/login");

  const user = await getCurrentUser(token);
  if (!user) redirect("/login");

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
      <div className="flex flex-col gap-2">
        <span className="text-label-lg text-primary uppercase tracking-wider">
          Frota
        </span>
        <h1 className="text-display-lg text-on-surface">Editar Veículo</h1>
      </div>
      <VehicleForm vehicle={vehicle} cooperatives={cooperatives} />
    </div>
  );
}
