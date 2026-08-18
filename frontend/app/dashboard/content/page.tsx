"use client";

import { useState } from "react";

const cooperatives = [
  "Coopcamate",
  "Renascer",
  "Cooarlas",
  "Coopermag",
  "Coopersol",
  "CMGC",
  "Coopertec",
  "Mãos Dadas",
];

export default function ContentPage() {
  const [cooperative, setCooperative] = useState("Coopcamate");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [saved, setSaved] = useState(false);

  function handleImageChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (file) {
      setImage(file);
    }
  }

  function handleSave() {
    setSaved(true);

    setTimeout(() => {
      setSaved(false);
    }, 3000);
  }

  function handleCancel() {
    setTitle("");
    setDescription("");
    setImage(null);
  }

  return (
    <div className="min-h-screen bg-surface">

      {/* CABEÇALHO */}
      <div className="mb-8">
        <span className="text-label-lg uppercase tracking-wider text-primary">
          Gerenciamento
        </span>

        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="mt-2 text-display-lg text-on-surface">
              Conteúdo das Cooperativas
            </h1>

            <p className="mt-2 max-w-2xl text-body-lg text-on-surface-variant">
              Atualize as informações, textos, imagens e materiais
              apresentados no aplicativo.
            </p>
          </div>

          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-container text-on-primary-container text-label-lg">
            <span className="material-symbols-outlined text-[20px]">
              edit
            </span>

            Modo de edição
          </span>
        </div>
      </div>

      {/* SELEÇÃO DA COOPERATIVA */}
      <section className="mb-6 rounded-2xl bg-surface-container-lowest border border-outline-variant p-6">

        <div className="flex flex-col md:flex-row md:items-end gap-5">

          <div className="flex-1">
            <label
              htmlFor="cooperative"
              className="block mb-2 text-label-lg text-on-surface"
            >
              Selecione a cooperativa
            </label>

            <select
              id="cooperative"
              value={cooperative}
              onChange={(event) =>
                setCooperative(event.target.value)
              }
              className="w-full h-12 rounded-xl border border-outline-variant bg-surface px-4 text-on-surface outline-none focus:border-primary"
            >
              {cooperatives.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3 h-12 px-5 rounded-xl bg-primary-container text-on-primary-container">
            <span className="material-symbols-outlined">
              check_circle
            </span>

            <div>
              <p className="text-label-lg">
                Cooperativa ativa
              </p>

              <p className="text-xs opacity-80">
                Conteúdo disponível para edição
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* ÁREA PRINCIPAL */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* INFORMAÇÕES */}
        <section className="rounded-2xl bg-surface-container-lowest border border-outline-variant p-6">

          <div className="flex items-center gap-3 mb-6">

            <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-primary-container">
              <span className="material-symbols-outlined text-primary">
                business
              </span>
            </div>

            <div>
              <h2 className="text-title-lg text-on-surface">
                Informações da Cooperativa
              </h2>

              <p className="text-body-sm text-on-surface-variant">
                Dados que serão apresentados aos usuários.
              </p>
            </div>

          </div>

          <div className="space-y-5">

            {/* NOME */}
            <div>
              <label className="block mb-2 text-label-lg text-on-surface">
                Nome da cooperativa
              </label>

              <input
                type="text"
                value={cooperative}
                onChange={(event) =>
                  setCooperative(event.target.value)
                }
                className="w-full h-12 rounded-xl border border-outline-variant bg-surface px-4 outline-none focus:border-primary"
              />
            </div>

            {/* TELEFONE */}
            <div>
              <label className="block mb-2 text-label-lg text-on-surface">
                Telefone
              </label>

              <input
                type="text"
                placeholder="(51) 00000-0000"
                className="w-full h-12 rounded-xl border border-outline-variant bg-surface px-4 outline-none focus:border-primary"
              />
            </div>

            {/* ENDEREÇO */}
            <div>
              <label className="block mb-2 text-label-lg text-on-surface">
                Endereço
              </label>

              <input
                type="text"
                placeholder="Rua, número, bairro..."
                className="w-full h-12 rounded-xl border border-outline-variant bg-surface px-4 outline-none focus:border-primary"
              />
            </div>

            {/* WEBSITE */}
            <div>
              <label className="block mb-2 text-label-lg text-on-surface">
                Website
              </label>

              <input
                type="url"
                placeholder="https://..."
                className="w-full h-12 rounded-xl border border-outline-variant bg-surface px-4 outline-none focus:border-primary"
              />
            </div>

            {/* INSTAGRAM */}
            <div>
              <label className="block mb-2 text-label-lg text-on-surface">
                Instagram
              </label>

              <input
                type="text"
                placeholder="@cooperativa"
                className="w-full h-12 rounded-xl border border-outline-variant bg-surface px-4 outline-none focus:border-primary"
              />
            </div>

          </div>
        </section>

        {/* CONTEÚDO */}
        <section className="rounded-2xl bg-surface-container-lowest border border-outline-variant p-6">

          <div className="flex items-center gap-3 mb-6">

            <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-primary-container">
              <span className="material-symbols-outlined text-primary">
                article
              </span>
            </div>

            <div>
              <h2 className="text-title-lg text-on-surface">
                Conteúdo Principal
              </h2>

              <p className="text-body-sm text-on-surface-variant">
                Textos e imagens exibidos no aplicativo.
              </p>
            </div>

          </div>

          <div className="space-y-5">

            {/* TÍTULO */}
            <div>
              <label className="block mb-2 text-label-lg text-on-surface">
                Título principal
              </label>

              <input
                type="text"
                value={title}
                onChange={(event) =>
                  setTitle(event.target.value)
                }
                placeholder="Digite o título do conteúdo..."
                className="w-full h-12 rounded-xl border border-outline-variant bg-surface px-4 outline-none focus:border-primary"
              />
            </div>

            {/* DESCRIÇÃO */}
            <div>
              <div className="flex justify-between mb-2">

                <label className="text-label-lg text-on-surface">
                  Descrição
                </label>

                <span className="text-xs text-on-surface-variant">
                  {description.length}/500
                </span>

              </div>

              <textarea
                value={description}
                maxLength={500}
                onChange={(event) =>
                  setDescription(event.target.value)
                }
                rows={7}
                placeholder="Escreva aqui o conteúdo que será apresentado aos usuários..."
                className="w-full rounded-xl border border-outline-variant bg-surface px-4 py-3 resize-none outline-none focus:border-primary"
              />
            </div>

            {/* IMAGEM */}
            <div>

              <label className="block mb-2 text-label-lg text-on-surface">
                Imagem principal
              </label>

              <label className="flex flex-col items-center justify-center min-h-48 rounded-2xl border-2 border-dashed border-outline-variant cursor-pointer hover:bg-surface-container-low transition-colors">

                <span className="material-symbols-outlined text-primary text-[42px]">
                  cloud_upload
                </span>

                <span className="mt-3 text-title-md text-on-surface">
                  {image
                    ? image.name
                    : "Adicionar imagem"}
                </span>

                <span className="mt-1 text-body-sm text-on-surface-variant">
                  Clique para selecionar PNG, JPG ou WEBP
                </span>

                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleImageChange}
                  className="hidden"
                />

              </label>

            </div>

          </div>
        </section>

      </div>

      {/* RODAPÉ */}
      <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3 rounded-2xl bg-surface-container-lowest border border-outline-variant p-5">

        <button
          type="button"
          onClick={handleCancel}
          className="h-12 px-6 rounded-full border border-outline-variant text-on-surface hover:bg-surface-container transition-colors"
        >
          Cancelar
        </button>

        <button
          type="button"
          onClick={handleSave}
          className="h-12 px-7 rounded-full bg-primary text-on-primary font-semibold hover:opacity-90 transition-colors flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined">
            save
          </span>

          Salvar alterações
        </button>

      </div>

      {/* AVISO DE SALVAMENTO */}
      {saved && (
        <div className="fixed bottom-6 right-6 flex items-center gap-3 rounded-xl bg-primary text-on-primary px-5 py-4 shadow-lg">

          <span className="material-symbols-outlined">
            check_circle
          </span>

          Alterações salvas com sucesso!

        </div>
      )}

    </div>
  );
}