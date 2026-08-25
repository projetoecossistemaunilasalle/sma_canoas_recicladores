import { redirect } from "next/navigation";
import { getToken } from "@/lib/session";
import { getCurrentUser } from "@/lib/auth";
import { MinhaColeta } from "./minha-coleta-view";

export default async function MinhaColetaPage() {
  const token = await getToken();
  if (!token) redirect("/login");
  const user = await getCurrentUser(token);
  if (!user) redirect("/login");

  return <MinhaColeta user={user} />;
}
