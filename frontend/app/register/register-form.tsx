"use client";

import { useActionState, useState } from "react";
import { register, type RegisterState } from "./actions";
import { AddressSearch } from "../address-search";
import type { GeocodeResult } from "@/lib/types";

const initialState: RegisterState = {};

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(register, initialState);
  const [showPassword, setShowPassword] = useState(false);
  const [address, setAddress] = useState<GeocodeResult | null>(null);

  return (
    <form action={formAction} className="space-y-4">
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-on-surface-variant group-focus-within:text-primary transition-colors">
          <span className="material-symbols-outlined">person</span>
        </div>
        <input
          className="w-full bg-surface-container-lowest text-on-surface text-body-md rounded-xl pl-12 pr-4 py-4 outline-none border-2 border-transparent focus:border-primary transition-all shadow-sm placeholder:text-on-surface-variant/50"
          id="name"
          name="name"
          placeholder="Nome completo"
          required
          type="text"
          autoComplete="name"
        />
      </div>

      <div className="relative group">
        <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-on-surface-variant group-focus-within:text-primary transition-colors">
          <span className="material-symbols-outlined">mail</span>
        </div>
        <input
          className="w-full bg-surface-container-lowest text-on-surface text-body-md rounded-xl pl-12 pr-4 py-4 outline-none border-2 border-transparent focus:border-primary transition-all shadow-sm placeholder:text-on-surface-variant/50"
          id="email"
          name="email"
          placeholder="E-mail"
          required
          type="email"
          autoComplete="email"
        />
      </div>

      <div className="relative group">
        <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-on-surface-variant group-focus-within:text-primary transition-colors">
          <span className="material-symbols-outlined">lock</span>
        </div>
        <input
          className="w-full bg-surface-container-lowest text-on-surface text-body-md rounded-xl pl-12 pr-12 py-4 outline-none border-2 border-transparent focus:border-primary transition-all shadow-sm placeholder:text-on-surface-variant/50"
          id="password"
          name="password"
          placeholder="Senha (mín. 6 caracteres)"
          required
          minLength={6}
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
        />
        <button
          className="absolute inset-y-0 right-0 flex items-center pr-4 text-on-surface-variant hover:text-primary transition-colors"
          onClick={() => setShowPassword((v) => !v)}
          type="button"
          aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
        >
          <span className="material-symbols-outlined">
            {showPassword ? "visibility" : "visibility_off"}
          </span>
        </button>
      </div>

      <div>
        <p className="text-label-lg text-on-surface-variant mb-2">
          Onde você mora? (opcional — necessário pra acompanhar sua coleta)
        </p>
        <AddressSearch
          onSelect={setAddress}
          onClear={() => setAddress(null)}
          selectedLabel={address?.label ?? null}
        />
      </div>
      <input type="hidden" name="address" value={address?.label ?? ""} />
      <input type="hidden" name="lat" value={address?.lat ?? ""} />
      <input type="hidden" name="lng" value={address?.lng ?? ""} />

      {state.error ? (
        <p className="text-error text-label-lg" role="alert">
          {state.error}
        </p>
      ) : null}

      <button
        className="w-full h-14 bg-primary text-on-primary text-action-lg rounded-xl shadow-md shadow-primary/20 hover:bg-primary-container hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:pointer-events-none"
        disabled={pending}
        type="submit"
      >
        {pending ? (
          <span className="material-symbols-outlined animate-spin">autorenew</span>
        ) : (
          <>
            Criar conta
            <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
          </>
        )}
      </button>
    </form>
  );
}
