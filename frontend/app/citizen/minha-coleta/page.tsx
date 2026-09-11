import { requireUser } from "@/lib/auth";
import { getCooperatives } from "@/lib/data";
import { MinhaColeta } from "./minha-coleta-view";

export default async function MinhaColetaPage() {
  const { token, user } = await requireUser();

  const cooperatives = (await getCooperatives(token)).filter(
    (c) => c.active && c.lat != null && c.lng != null
  );

  return <MinhaColeta user={user} cooperatives={cooperatives} />;
}
