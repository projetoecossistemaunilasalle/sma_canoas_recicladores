import { redirect } from "next/navigation";
import { getToken } from "@/lib/session";
import { getCurrentUser } from "@/lib/auth";
import ProfileForm from "./profile-form";

export default async function ProfilePage() {
  const token = await getToken();

  if (!token) {
    redirect("/login");
  }

  const user = await getCurrentUser(token);

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex flex-col gap-8 max-w-4xl">
      <div className="flex flex-col gap-2">
        <span className="text-label-lg text-primary uppercase tracking-wider">
          Configurações
        </span>

        <h1 className="text-display-lg text-on-surface">
          Seus dados
        </h1>

        <p className="text-body-lg text-on-surface-variant">
          Visualize e altere suas informações pessoais.
        </p>
      </div>

      <ProfileForm
        user={{
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          active: user.active,
          cooperativeId: user.cooperativeId,
          address: user.address,
        }}
      />
    </div>
  );
}