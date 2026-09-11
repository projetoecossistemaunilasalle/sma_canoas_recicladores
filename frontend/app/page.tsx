import { redirectIfAuthenticated } from "@/lib/auth";
import { PublicHome } from "./public-home";

export default async function Home() {
  await redirectIfAuthenticated();
  return <PublicHome />;
}
