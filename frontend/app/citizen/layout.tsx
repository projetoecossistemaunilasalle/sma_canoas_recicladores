import { requireUser } from "@/lib/auth";
import { CitizenTabBar } from "./citizen-tab-bar";

export default async function CitizenLayout({ children }: { children: React.ReactNode }) {
  await requireUser();

  return (
    <div className="min-h-screen bg-background">
      {children}
      <CitizenTabBar />
    </div>
  );
}
