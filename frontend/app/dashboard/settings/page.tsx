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

  const published = publications.filter(
    (publication) => publication.status === "PUBLISHED"
  );

  const drafts = publications.filter(
    (publication) => publication.status === "DRAFT"
  );

  const archived = publications.filter(
    (publication) => publication.status === "ARCHIVED"
  );

  return (
    <div className="w-full flex flex-col gap-8">

      {/* CABEÇALHO */}
      <div className="flex flex-col gap-2">
        <span className="text-label-lg text-primary uppercase tracking-wider">
          Publicações
        </span>

        <h1 className="text-display-lg text-on-surface">
          Suas publicações
        </h1>

        <p className="text-body-lg text-on-surface-variant">
          Gerencie as informações publicadas pela sua cooperativa.
        </p>
      </div>

      {/* PERFIL RESUMIDO */}
      <section className="w-full bg-surface-container rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">

          {/* AVATAR */}
          <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-on-primary text-[32px]">
              person
            </span>
          </div>

          {/* DADOS */}
          <div className="flex-1 min-w-0">
            <span className="text-label-lg text-primary uppercase tracking-wider">
              Seu perfil
            </span>

            <h2 className="text-title-lg text-on-surface mt-1">
              {user.name}
            </h2>

            <p className="text-body-md text-on-surface-variant mt-1 break-all">
              {user.email}
            </p>

            {user.address && (
              <p className="text-body-md text-on-surface-variant mt-1">
                {user.address}
              </p>
            )}
          </div>

          {/* ATUALIZAR DADOS */}
          <Link
            href="/dashboard/settings/profile"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 h-11 rounded-full border border-outline text-primary hover:bg-primary-container transition-colors"
          >
            <span className="material-symbols-outlined text-[19px]">
              edit
            </span>

            Atualizar dados
          </Link>
        </div>
      </section>

      {/* PUBLICAÇÕES */}
      <section className="flex flex-col gap-5">

        {/* TÍTULO + BOTÃO */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

          <div>
            <span className="text-label-lg text-primary uppercase tracking-wider">
              Conteúdo
            </span>

            <h2 className="text-headline-md text-on-surface mt-1">
              Publicações da cooperativa
            </h2>
          </div>

          <Link
            href="/dashboard/settings/publications/new"
            className="inline-flex items-center justify-center gap-2 px-5 h-11 rounded-full bg-primary text-on-primary hover:opacity-90 transition-opacity"
          >
            <span className="material-symbols-outlined text-[20px]">
              add
            </span>

            Nova publicação
          </Link>
        </div>

        {/* RESUMO */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          <div className="bg-surface-container rounded-2xl p-5 shadow-sm">
            <span className="material-symbols-outlined text-primary text-[26px]">
              public
            </span>

            <p className="text-body-md text-on-surface-variant mt-3">
              Publicadas
            </p>

            <p className="text-headline-md text-on-surface mt-1">
              {published.length}
            </p>
          </div>

          <div className="bg-surface-container rounded-2xl p-5 shadow-sm">
            <span className="material-symbols-outlined text-primary text-[26px]">
              edit_note
            </span>

            <p className="text-body-md text-on-surface-variant mt-3">
              Rascunhos
            </p>

            <p className="text-headline-md text-on-surface mt-1">
              {drafts.length}
            </p>
          </div>

          <div className="bg-surface-container rounded-2xl p-5 shadow-sm">
            <span className="material-symbols-outlined text-primary text-[26px]">
              archive
            </span>

            <p className="text-body-md text-on-surface-variant mt-3">
              Arquivadas
            </p>

            <p className="text-headline-md text-on-surface mt-1">
              {archived.length}
            </p>
          </div>

        </div>

        {/* LISTA */}
        {publications.length === 0 ? (

          <div className="bg-surface-container rounded-2xl p-10 shadow-sm text-center">

            <div className="w-16 h-16 mx-auto rounded-full bg-primary-container text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[32px]">
                campaign
              </span>
            </div>

            <h3 className="text-title-lg text-on-surface mt-5">
              Nenhuma publicação criada
            </h3>

            <p className="text-body-md text-on-surface-variant mt-2 max-w-md mx-auto">
              Crie uma publicação para divulgar informações importantes da
              sua cooperativa.
            </p>

            <Link
              href="/dashboard/settings/publications/new"
              className="inline-flex items-center justify-center gap-2 px-5 h-11 rounded-full bg-primary text-on-primary mt-6"
            >
              <span className="material-symbols-outlined text-[20px]">
                add
              </span>

              Criar primeira publicação
            </Link>

          </div>

        ) : (

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {publications.map((publication) => (

              <article
                key={publication.id}
                className="bg-surface-container rounded-2xl p-6 shadow-sm"
              >

                {/* STATUS */}
                <div className="flex items-center justify-between">

                  <span
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-label-md ${
                      publication.status === "PUBLISHED"
                        ? "bg-primary-container text-primary"
                        : publication.status === "ARCHIVED"
                          ? "bg-surface-container-high text-on-surface-variant"
                          : "bg-secondary-container text-on-secondary-container"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {publication.status === "PUBLISHED"
                        ? "public"
                        : publication.status === "ARCHIVED"
                          ? "archive"
                          : "edit_note"}
                    </span>

                    {publication.status === "PUBLISHED"
                      ? "Publicada"
                      : publication.status === "ARCHIVED"
                        ? "Arquivada"
                        : "Rascunho"}
                  </span>

                </div>

                {/* IMAGEM */}
                {publication.imageUrl && (
                  <div className="mt-5 overflow-hidden rounded-xl">
                    <img
                      src={publication.imageUrl}
                      alt={publication.title}
                      className="w-full h-48 object-cover"
                    />
                  </div>
                )}

                {/* TÍTULO */}
                <h3 className="text-title-lg text-on-surface mt-5">
                  {publication.title}
                </h3>

                {/* TEXTO */}
                <p className="text-body-md text-on-surface-variant mt-2 line-clamp-3">
                  {publication.content}
                </p>

                {/* DATA */}
                {publication.createdAt && (
                  <p className="text-body-sm text-on-surface-variant mt-4">
                    Criada em{" "}
                    {new Date(
                      publication.createdAt
                    ).toLocaleDateString("pt-BR")}
                  </p>
                )}

                {/* AÇÕES */}
                <div className="flex items-center gap-3 mt-6">

                  <Link
                    href={`/dashboard/settings/publications/${publication.id}`}
                    className="inline-flex items-center justify-center gap-2 px-4 h-10 rounded-full border border-outline text-primary hover:bg-primary-container transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      edit
                    </span>

                    Editar
                  </Link>

                </div>

              </article>

            ))}

          </div>

        )}

      </section>

    </div>
  );
}