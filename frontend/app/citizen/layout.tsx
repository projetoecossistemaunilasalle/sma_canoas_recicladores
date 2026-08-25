import { redirect } from "next/navigation";
import { getToken } from "@/lib/session";
import { getCurrentUser } from "@/lib/auth";
import { CitizenTabBar } from "./citizen-tab-bar";

export default async function CitizenLayout({ children }: { children: React.ReactNode }) {
  const token = await getToken();
  if (!token) redirect("/login");
  const user = await getCurrentUser(token);
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-background">
      {children}
      <CitizenTabBar />
    </div>
  );
}
