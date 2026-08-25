"use client";

import { useState } from "react";
import type { CurrentUser } from "@/lib/types";
import { updateProfile } from "./actions";

export default function ProfileForm({
  user,
}: {
  user: CurrentUser;
}) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const result = await updateProfile(formData);

      if (result.success) {
        setMessage(result.message);
      } else {
        setError(result.message);
      }
    } catch (err) {
      console.error(err);
      setError("Não foi possível salvar as alterações.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="bg-surface-container rounded-2xl p-6 md:p-8 shadow-sm">
      {/* IDENTIFICAÇÃO */}
      <div className="flex items-center gap-4 pb-6 border-b border-outline-variant">
        <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center">
          <span className="material-symbols-outlined text-on-primary text-[30px]">
            person
          </span>
        </div>

        <div>
          <h2 className="text-title-lg text-on-surface">
            {user.name}
          </h2>

          <p className="text-body-md text-on-surface-variant">
            {user.role === "admin"
              ? "Administrador"
              : "Administrador da cooperativa"}
          </p>
        </div>
      </div>

      <form action={handleSubmit} className="flex flex-col gap-6 mt-6">

        {/* ID DO USUÁRIO */}
        <input
          type="hidden"
          name="userId"
          value={user.id}
        />

        {/* NOME */}
        <div className="flex flex-col gap-2">
          <label
            htmlFor="name"
            className="text-label-lg text-on-surface"
          >
            Nome
          </label>

          <input
            id="name"
            name="name"
            type="text"
            defaultValue={user.name}
            required
            className="w-full h-12 px-4 rounded-xl bg-surface border border-outline-variant text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* E-MAIL */}
        <div className="flex flex-col gap-2">
          <label
            htmlFor="email"
            className="text-label-lg text-on-surface"
          >
            E-mail
          </label>

          <input
            id="email"
            name="email"
            type="email"
            defaultValue={user.email}
            required
            className="w-full h-12 px-4 rounded-xl bg-surface border border-outline-variant text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* ENDEREÇO */}
        <div className="flex flex-col gap-2">
          <label
            htmlFor="address"
            className="text-label-lg text-on-surface"
          >
            Endereço
          </label>

          <input
            id="address"
            name="address"
            type="text"
            defaultValue={user.address ?? ""}
            placeholder="Digite seu endereço"
            className="w-full h-12 px-4 rounded-xl bg-surface border border-outline-variant text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* NOVA SENHA */}
        <div className="flex flex-col gap-2">
          <label
            htmlFor="password"
            className="text-label-lg text-on-surface"
          >
            Nova senha
          </label>

          <input
            id="password"
            name="password"
            type="password"
            placeholder="Deixe em branco para não alterar"
            className="w-full h-12 px-4 rounded-xl bg-surface border border-outline-variant text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />

          <p className="text-xs text-on-surface-variant">
            Preencha somente se quiser alterar sua senha.
          </p>
        </div>

        {/* SUCESSO */}
        {message && (
          <div className="flex items-center gap-2 rounded-xl bg-primary/10 px-4 py-3 text-sm text-primary">
            <span className="material-symbols-outlined text-[20px]">
              check_circle
            </span>

            <span>{message}</span>
          </div>
        )}

        {/* ERRO */}
        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-error-container px-4 py-3 text-sm text-error">
            <span className="material-symbols-outlined text-[20px]">
              error
            </span>

            <span>{error}</span>
          </div>
        )}

        {/* BOTÃO */}
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={loading}
            className="h-12 px-6 rounded-full bg-primary text-on-primary text-action-lg hover:bg-primary-container transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-[18px] mr-2 align-middle">
              {loading ? "hourglass_empty" : "save"}
            </span>

            {loading
              ? "Salvando..."
              : "Salvar alterações"}
          </button>
        </div>

      </form>
    </section>
  );
}