import { getToken } from "@/lib/session";
import { getCurrentUser } from "@/lib/auth";
import { redirectForRole } from "@/lib/redirect-for-role";
import { PublicHome } from "./public-home";

export default async function Home() {
  const token = await getToken();
  if (token) {
    const user = await getCurrentUser(token);
    if (user) redirectForRole(user.role);
  }
  return <PublicHome />;
}
