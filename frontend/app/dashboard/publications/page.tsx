import Link from "next/link";
import { redirect } from "next/navigation";

import { getToken } from "@/lib/session";
import { getCurrentUser } from "@/lib/auth";
import { getPublications } from "@/lib/data";

export default async function PublicationsPage() {
  const token = await getToken();

  if (!token) {
    redirect("/login");
  }

  const user = await getCurrentUser(token);

  if (!user) {
    redirect("/login");
  }

  const publications = await getPublications(token);

  return (
    <div className="w-full flex flex-col gap-8">
      {/* CABEÇALHO */}
      <div className="flex flex-col gap-4">
        <div>
          <span className="text-label-lg text-primary uppercase tracking-wider">
            Publicações
          </span>

          <h1 className="text-display-lg text-on-surface mt-1">
            Suas publicações
          </h1>

          <p className="text-body-lg text-on-surface-variant mt-2">
            Crie, edite, publique e arquive informações da sua cooperativa.
          </p>
        </div>

        {/* NOVA PUBLICAÇÃO */}
        {(user.role === "admin" ||
          user.role === "cooperative_admin") && (
          <div>
            <Link
              href="/dashboard/settings/publications/new"
              className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-full bg-primary text-on-primary font-medium hover:bg-primary-container transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">
                add
              </span>

              Nova publicação
            </Link>
          </div>
        )}
      </div>

      {/* LISTA DE PUBLICAÇÕES */}
      {publications.length === 0 ? (
        <section className="w-full bg-surface-container rounded-2xl p-10 shadow-sm">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-primary-container text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[32px]">
                campaign
              </span>
            </div>

            <h2 className="text-title-lg text-on-surface mt-5">
              Nenhuma publicação encontrada
            </h2>

            <p className="text-body-md text-on-surface-variant mt-2 max-w-md">
              Ainda não existem publicações cadastradas. Crie uma nova
              publicação para compartilhar informações da cooperativa.
            </p>

            {(user.role === "admin" ||
              user.role === "cooperative_admin") && (
              <Link
                href="/dashboard/settings/publications/new"
                className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-full bg-primary text-on-primary font-medium mt-6 hover:bg-primary-container transition-colors"
              >
                <span className="material-symbols-outlined text-[19px]">
                  add
                </span>

                Criar publicação
              </Link>
            )}
          </div>
        </section>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {publications.map((publication) => (
            <article
              key={publication.id}
              className="bg-surface-container rounded-2xl p-6 shadow-sm"
            >
              {/* STATUS */}
              <div className="flex items-center justify-between gap-3">
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-label-md ${
                    publication.status === "PUBLISHED"
                      ? "bg-primary-container text-primary"
                      : publication.status === "DRAFT"
                        ? "bg-surface-container-high text-on-surface-variant"
                        : "bg-surface-container-high text-on-surface-variant"
                  }`}
                >
                  {publication.status === "PUBLISHED"
                    ? "Publicada"
                    : publication.status === "DRAFT"
                      ? "Rascunho"
                      : "Arquivada"}
                </span>

                <span className="material-symbols-outlined text-primary">
                  campaign
                </span>
              </div>

              {/* TÍTULO */}
              <h2 className="text-title-lg text-on-surface mt-5">
                {publication.title}
              </h2>

              {/* CONTEÚDO */}
              <p className="text-body-md text-on-surface-variant mt-2 line-clamp-4">
                {publication.content}
              </p>

              {/* INFORMAÇÕES */}
              <div className="flex flex-col gap-2 mt-5">
                {publication.address && (
                  <div className="flex items-center gap-2 text-on-surface-variant">
                    <span className="material-symbols-outlined text-[19px]">
                      location_on
                    </span>

                    <span className="text-body-sm">
                      {publication.address}
                    </span>
                  </div>
                )}

                {publication.phone && (
                  <div className="flex items-center gap-2 text-on-surface-variant">
                    <span className="material-symbols-outlined text-[19px]">
                      phone
                    </span>

                    <span className="text-body-sm">
                      {publication.phone}
                    </span>
                  </div>
                )}
              </div>

              {/* AÇÕES */}
              <div className="flex items-center gap-3 mt-6">
                <Link
                  href={`/dashboard/settings/publications/${publication.id}`}
                  className="flex items-center justify-center gap-2 h-10 px-4 rounded-full border border-outline text-primary hover:bg-primary-container transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    visibility
                  </span>

                  Ver
                </Link>

                {(user.role === "admin" ||
                  user.role === "cooperative_admin") && (
                  <Link
                    href={`/dashboard/settings/publications/${publication.id}/edit`}
                    className="flex items-center justify-center gap-2 h-10 px-4 rounded-full border border-outline text-primary hover:bg-primary-container transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      edit
                    </span>

                    Editar
                  </Link>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}