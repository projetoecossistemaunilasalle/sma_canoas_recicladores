import { redirect } from "next/navigation";

// Single source of truth for "where does this role land after auth" —
// cooperative staff go to the dashboard, citizens to their own area. Never
// the other way around: a citizen must never resolve to /dashboard.
export function redirectForRole(role: string): never {
  if (role === "cooperative_admin") {
    redirect("/dashboard");
  }
  redirect("/citizen");
}
