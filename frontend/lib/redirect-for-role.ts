import { redirect } from "next/navigation";

// Single source of truth for "where does this role land after auth" — staff
// (admin/cooperative_admin) go to the dashboard, every other role (citizens)
// goes to their own area. Never the other way around: a citizen role must
// never resolve to /dashboard.
export function redirectForRole(role: string): never {
  if (role === "admin" || role === "cooperative_admin") {
    redirect("/dashboard");
  }
  redirect("/citizen");
}
