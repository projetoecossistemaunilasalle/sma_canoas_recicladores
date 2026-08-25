import Link from "next/link";
import { redirect } from "next/navigation";
import { getToken } from "@/lib/session";
import { getCurrentUser } from "@/lib/auth";

export default async function SettingsPage() {
  const token = await getToken();

  if (!token) {
    redirect("/login");
  }

  const user = await getCurrentUser(token);

  if (!user) {
    redirect("/login");
  }

  const roleLabel =
    user.role === "admin"
      ? "Administrador"
      : user.role === "cooperative_admin"
        ? "Administrador da cooperativa"
        : "Usuário";

  return (
    <div className="w-full flex flex-col gap-8">
      {/* CABEÇALHO */}
      <div className="flex flex-col gap-2">
        <span className="text-label-lg text-primary uppercase tracking-wider">
          Configurações
        </span>

        <h1 className="text-display-lg text-on-surface">
          Configurações
        </h1>

        <p className="text-body-lg text-on-surface-variant">
          Gerencie seus dados e as informações da sua cooperativa.
        </p>
      </div>

      {/* PERFIL */}
      <section className="w-full bg-surface-container rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          {/* AVATAR */}
          <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-on-primary text-[40px]">
              person
            </span>
          </div>

          {/* DADOS DO USUÁRIO */}
          <div className="flex-1 min-w-0">
            <span className="text-label-lg text-primary uppercase tracking-wider">
              Seu perfil
            </span>

            <h2 className="text-headline-lg text-on-surface mt-1 break-words">
              {user.name}
            </h2>

            <p className="text-body-md text-on-surface-variant mt-1">
              {roleLabel}
            </p>

            <div className="flex flex-col gap-2 mt-4">
              <div className="flex items-center gap-2 text-on-surface-variant">
                <span className="material-symbols-outlined text-[20px]">
                  mail
                </span>

                <span className="text-body-md break-all">
                  {user.email}
                </span>
              </div>

              {user.address && (
                <div className="flex items-center gap-2 text-on-surface-variant">
                  <span className="material-symbols-outlined text-[20px]">
                    location_on
                  </span>

                  <span className="text-body-md">
                    {user.address}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* EDITAR PERFIL */}
          <Link
            href="/dashboard/settings/profile"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 h-11 rounded-full border border-outline text-primary hover:bg-primary-container transition-colors shrink-0"
          >
            <span className="material-symbols-outlined text-[19px]">
              edit
            </span>

            Editar perfil
          </Link>
        </div>
      </section>

      {/* ADMINISTRAÇÃO */}
      <div className="flex flex-col gap-4">
        <div>
          <span className="text-label-lg text-primary uppercase tracking-wider">
            Administração
          </span>

          <h2 className="text-headline-md text-on-surface mt-1">
            Gerencie sua conta
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full">
          {/* SEUS DADOS */}
          <Link
            href="/dashboard/settings/profile"
            className="group w-full bg-surface-container rounded-2xl p-6 sm:p-7 shadow-sm hover:bg-surface-container-high transition-all"
          >
            <div className="w-14 h-14 rounded-full bg-primary-container text-primary flex items-center justify-center mb-5">
              <span className="material-symbols-outlined text-[28px]">
                person
              </span>
            </div>

            <h2 className="text-title-lg text-on-surface">
              Seus dados
            </h2>

            <p className="text-body-md text-on-surface-variant mt-2">
              Altere seu nome, e-mail, endereço e senha.
            </p>

            <div className="flex items-center gap-1 mt-6 text-primary">
              <span className="text-label-lg">
                Acessar
              </span>

              <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">
                arrow_forward
              </span>
            </div>
          </Link>

          {/* PUBLICAÇÕES */}
          <Link
            href="/dashboard/settings/publications"
            className="group w-full bg-surface-container rounded-2xl p-6 sm:p-7 shadow-sm hover:bg-surface-container-high transition-all"
          >
            <div className="w-14 h-14 rounded-full bg-primary-container text-primary flex items-center justify-center mb-5">
              <span className="material-symbols-outlined text-[28px]">
                campaign
              </span>
            </div>

            <h2 className="text-title-lg text-on-surface">
              Suas publicações
            </h2>

            <p className="text-body-md text-on-surface-variant mt-2">
              Crie, edite, publique e arquive informações da sua cooperativa.
            </p>

            <div className="flex items-center gap-1 mt-6 text-primary">
              <span className="text-label-lg">
                Acessar
              </span>

              <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">
                arrow_forward
              </span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}