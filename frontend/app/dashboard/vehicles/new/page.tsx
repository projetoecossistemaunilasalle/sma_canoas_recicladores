import { redirect } from "next/navigation";
import { getToken } from "@/lib/session";
import { getCurrentUser } from "@/lib/auth";
import { getCooperatives } from "@/lib/data";
import { VehicleForm } from "../vehicle-form";

export default async function NewVehiclePage() {
  const token = await getToken();
  if (!token) redirect("/login");

  const user = await getCurrentUser(token);
  if (!user) redirect("/login");

  const cooperatives = user.role === "admin" ? await getCooperatives(token) : undefined;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <span className="text-label-lg text-primary uppercase tracking-wider">
          Frota
        </span>
        <h1 className="text-display-lg text-on-surface">Novo Veículo</h1>
      </div>
      <VehicleForm cooperatives={cooperatives} />
    </div>
  );
}
