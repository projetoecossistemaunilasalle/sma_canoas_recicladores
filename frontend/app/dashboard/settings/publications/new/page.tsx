import Link from "next/link";
import { redirect } from "next/navigation";
import { getToken } from "@/lib/session";
import { getCurrentUser } from "@/lib/auth";

export default async function NewPublicationPage() {
  const token = await getToken();

  if (!token) {
    redirect("/login");
  }

  const user = await getCurrentUser(token);

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex flex-col gap-8 max-w-5xl">
      {/* CABEÇALHO */}
      <div className="flex flex-col gap-2">
        <span className="text-label-lg text-primary uppercase tracking-wider">
          Publicações
        </span>

        <h1 className="text-display-lg text-on-surface">
          Nova publicação
        </h1>

        <p className="text-body-lg text-on-surface-variant">
          Crie uma nova publicação com informações da sua cooperativa.
        </p>
      </div>

      {/* FORMULÁRIO */}
      <form className="flex flex-col gap-6">
        {/* INFORMAÇÕES PRINCIPAIS */}
        <section className="bg-surface-container rounded-2xl p-7 shadow-sm">
          <div className="mb-6">
            <h2 className="text-title-lg text-on-surface">
              Informações principais
            </h2>

            <p className="text-body-md text-on-surface-variant mt-1">
              Informe o título e o conteúdo da publicação.
            </p>
          </div>

          <div className="flex flex-col gap-5">
            <div>
              <label
                htmlFor="title"
                className="block text-label-lg text-on-surface mb-2"
              >
                Título
              </label>

              <input
                id="title"
                name="title"
                type="text"
                placeholder="Digite o título da publicação"
                className="w-full h-12 px-4 rounded-xl border border-outline bg-surface text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div>
              <label
                htmlFor="content"
                className="block text-label-lg text-on-surface mb-2"
              >
                Texto da publicação
              </label>

              <textarea
                id="content"
                name="content"
                rows={7}
                placeholder="Escreva aqui as informações da publicação..."
                className="w-full px-4 py-3 rounded-xl border border-outline bg-surface text-on-surface placeholder:text-on-surface-variant resize-y focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
        </section>

        {/* LOCALIZAÇÃO */}
        <section className="bg-surface-container rounded-2xl p-7 shadow-sm">
          <div className="mb-6">
            <h2 className="text-title-lg text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">
                location_on
              </span>
              Localização da cooperativa
            </h2>

            <p className="text-body-md text-on-surface-variant mt-1">
              Informe onde a cooperativa está localizada.
            </p>
          </div>

          <div className="flex flex-col gap-5">
            <div>
              <label
                htmlFor="cooperativeName"
                className="block text-label-lg text-on-surface mb-2"
              >
                Nome da cooperativa
              </label>

              <input
                id="cooperativeName"
                name="cooperativeName"
                type="text"
                placeholder="Nome da cooperativa"
                className="w-full h-12 px-4 rounded-xl border border-outline bg-surface text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div>
              <label
                htmlFor="address"
                className="block text-label-lg text-on-surface mb-2"
              >
                Endereço
              </label>

              <input
                id="address"
                name="address"
                type="text"
                placeholder="Rua, número, bairro, cidade - RS"
                defaultValue={user.address ?? ""}
                className="w-full h-12 px-4 rounded-xl border border-outline bg-surface text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div>
              <label
                htmlFor="phone"
                className="block text-label-lg text-on-surface mb-2"
              >
                Telefone
              </label>

              <input
                id="phone"
                name="phone"
                type="tel"
                placeholder="(51) 99999-9999"
                className="w-full h-12 px-4 rounded-xl border border-outline bg-surface text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
        </section>

        {/* HORÁRIO */}
        <section className="bg-surface-container rounded-2xl p-7 shadow-sm">
          <div className="mb-6">
            <h2 className="text-title-lg text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">
                schedule
              </span>
              Horário de funcionamento
            </h2>

            <p className="text-body-md text-on-surface-variant mt-1">
              Informe os horários em que a cooperativa funciona.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label
                htmlFor="weekdayHours"
                className="block text-label-lg text-on-surface mb-2"
              >
                Segunda a sexta
              </label>

              <input
                id="weekdayHours"
                name="weekdayHours"
                type="text"
                placeholder="Ex.: 08:00 às 17:00"
                className="w-full h-12 px-4 rounded-xl border border-outline bg-surface text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div>
              <label
                htmlFor="saturdayHours"
                className="block text-label-lg text-on-surface mb-2"
              >
                Sábado
              </label>

              <input
                id="saturdayHours"
                name="saturdayHours"
                type="text"
                placeholder="Ex.: 08:00 às 12:00"
                className="w-full h-12 px-4 rounded-xl border border-outline bg-surface text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div>
              <label
                htmlFor="sundayHours"
                className="block text-label-lg text-on-surface mb-2"
              >
                Domingo
              </label>

              <input
                id="sundayHours"
                name="sundayHours"
                type="text"
                placeholder="Ex.: Fechado"
                className="w-full h-12 px-4 rounded-xl border border-outline bg-surface text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
        </section>

        {/* FOTOS IMPORTANTES */}
        <section className="bg-surface-container rounded-2xl p-7 shadow-sm">
          <div className="mb-6">
            <h2 className="text-title-lg text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">
                photo_library
              </span>
              Fotos importantes
            </h2>

            <p className="text-body-md text-on-surface-variant mt-1">
              Adicione fotos que representam a cooperativa.
            </p>
          </div>

          <div className="border-2 border-dashed border-outline-variant rounded-2xl p-8 flex flex-col items-center justify-center text-center">
            <span className="material-symbols-outlined text-primary text-[42px]">
              add_photo_alternate
            </span>

            <h3 className="text-title-md text-on-surface mt-3">
              Adicionar foto
            </h3>

            <p className="text-body-sm text-on-surface-variant mt-1">
              Fachada, equipe, veículos ou estrutura da cooperativa.
            </p>

            <input
              id="importantPhoto"
              name="importantPhoto"
              type="file"
              accept="image/*"
              className="mt-5 w-full max-w-sm text-sm"
            />
          </div>

          <div className="mt-5">
            <label
              htmlFor="importantPhotoDescription"
              className="block text-label-lg text-on-surface mb-2"
            >
              Descrição da foto
            </label>

            <textarea
              id="importantPhotoDescription"
              name="importantPhotoDescription"
              rows={3}
              placeholder="Descreva o que aparece na foto..."
              className="w-full px-4 py-3 rounded-xl border border-outline bg-surface text-on-surface placeholder:text-on-surface-variant resize-y focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </section>

        {/* FOTOS ATUALIZADAS */}
        <section className="bg-surface-container rounded-2xl p-7 shadow-sm">
          <div className="mb-6">
            <h2 className="text-title-lg text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">
                update
              </span>
              Fotos atualizadas
            </h2>

            <p className="text-body-md text-on-surface-variant mt-1">
              Mostre novidades, mudanças ou atualizações recentes.
            </p>
          </div>

          <div className="border-2 border-dashed border-outline-variant rounded-2xl p-8 flex flex-col items-center justify-center text-center">
            <span className="material-symbols-outlined text-primary text-[42px]">
              add_photo_alternate
            </span>

            <h3 className="text-title-md text-on-surface mt-3">
              Adicionar foto atualizada
            </h3>

            <p className="text-body-sm text-on-surface-variant mt-1">
              Ex.: novo veículo, nova estrutura ou atividade recente.
            </p>

            <input
              id="updatedPhoto"
              name="updatedPhoto"
              type="file"
              accept="image/*"
              className="mt-5 w-full max-w-sm text-sm"
            />
          </div>

          <div className="mt-5 flex flex-col gap-5">
            <div>
              <label
                htmlFor="updatedPhotoDescription"
                className="block text-label-lg text-on-surface mb-2"
              >
                Descrição da foto
              </label>

              <textarea
                id="updatedPhotoDescription"
                name="updatedPhotoDescription"
                rows={3}
                placeholder="Descreva a atualização mostrada na foto..."
                className="w-full px-4 py-3 rounded-xl border border-outline bg-surface text-on-surface placeholder:text-on-surface-variant resize-y focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div>
              <label
                htmlFor="updatedDate"
                className="block text-label-lg text-on-surface mb-2"
              >
                Data da atualização
              </label>

              <input
                id="updatedDate"
                name="updatedDate"
                type="date"
                className="w-full md:w-64 h-12 px-4 rounded-xl border border-outline bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
        </section>

        {/* BOTÕES */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pb-8">
          <Link
            href="/dashboard/settings/publications"
            className="h-12 px-6 rounded-full border border-outline flex items-center justify-center text-on-surface hover:bg-surface-container transition-colors"
          >
            Cancelar
          </Link>

          <button
            type="button"
            className="h-12 px-6 rounded-full bg-surface-container-high text-on-surface font-medium hover:bg-surface-variant transition-colors"
          >
            Salvar rascunho
          </button>

          <button
            type="submit"
            className="h-12 px-7 rounded-full bg-primary text-on-primary font-medium hover:bg-primary-container transition-colors flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[20px]">
              publish
            </span>
            Publicar
          </button>
        </div>
      </form>
    </div>
  );
}
