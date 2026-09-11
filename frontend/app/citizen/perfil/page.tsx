import { requireUser } from "@/lib/auth";
import { logout } from "@/app/login/actions";
import { ProfileForm } from "./profile-form";

export default async function PerfilPage() {
  const { user } = await requireUser();

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 pb-28 flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="w-14 h-14 shrink-0 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center text-headline-lg">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-title-lg text-on-surface truncate">{user.name}</p>
          <p className="text-body-md text-on-surface-variant truncate">{user.email}</p>
        </div>
      </div>

      <ProfileForm user={user} />

      <form action={logout}>
        <button type="submit" className="text-label-lg text-error hover:underline">
          Sair da conta
        </button>
      </form>
    </main>
  );
}
