import { redirect } from "next/navigation";
import { getToken } from "@/lib/session";
import { getCurrentUser } from "@/lib/auth";
import { PublicHome } from "./public-home";

export default async function Home() {
  const token = await getToken();
  if (token && (await getCurrentUser(token))) {
    redirect("/dashboard");
  }
  return <PublicHome />;
}
