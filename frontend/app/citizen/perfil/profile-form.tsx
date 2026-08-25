"use client";

import { useState, useTransition } from "react";
import { AddressSearch } from "@/app/address-search";
import { updateProfileAction } from "../actions";
import { subscribeToPush, unsubscribeFromPush } from "@/lib/push";
import type { CurrentUser, GeocodeResult } from "@/lib/types";

export function ProfileForm({ user }: { user: CurrentUser }) {
  const [name, setName] = useState(user.name);
  const [password, setPassword] = useState("");
  const [address, setAddress] = useState<GeocodeResult | null>(
    user.address && user.addressLat != null && user.addressLng != null
      ? { label: user.address, lat: user.addressLat, lng: user.addressLng }
      : null
  );
  const [notifyOn, setNotifyOn] = useState(user.notifyProximity);
  const [notifyPending, setNotifyPending] = useState(false);
  const [notifyError, setNotifyError] = useState<string | null>(null);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    startTransition(async () => {
      const { result, error } = await updateProfileAction({
        name,
        password: password || undefined,
        address: address?.label,
        lat: address?.lat,
        lng: address?.lng,
      });
      if (error) {
        setStatus({ type: "error", message: error });
      } else if (result) {
        setStatus({ type: "success", message: "Perfil atualizado." });
        setPassword("");
      }
    });
  }

  async function handleToggleNotify() {
    setNotifyError(null);
    setNotifyPending(true);
    try {
      if (notifyOn) {
        await unsubscribeFromPush();
        await updateProfileAction({ notifyProximity: false });
        setNotifyOn(false);
      } else {
        const ok = await subscribeToPush();
        if (ok) {
          await updateProfileAction({ notifyProximity: true });
          setNotifyOn(true);
        } else {
          setNotifyError("Ative as notificações do navegador pra usar esse recurso.");
        }
      }
    } finally {
      setNotifyPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="text-label-lg text-on-surface-variant mb-1 block" htmlFor="profile-name">
            Nome
          </label>
          <input
            id="profile-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-surface-container-lowest text-on-surface text-body-md rounded-xl px-4 py-3 outline-none border-2 border-transparent focus:border-primary"
          />
        </div>

        <div>
          <p className="text-label-lg text-on-surface-variant mb-1">Endereço da coleta</p>
          <AddressSearch
            onSelect={setAddress}
            onClear={() => setAddress(null)}
            selectedLabel={address?.label ?? null}
          />
        </div>

        <div>
          <label className="text-label-lg text-on-surface-variant mb-1 block" htmlFor="profile-password">
            Nova senha (opcional)
          </label>
          <input
            id="profile-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Deixe em branco pra manter a atual"
            minLength={6}
            className="w-full bg-surface-container-lowest text-on-surface text-body-md rounded-xl px-4 py-3 outline-none border-2 border-transparent focus:border-primary placeholder:text-on-surface-variant/50"
          />
        </div>

        {status ? (
          <p className={`text-label-lg ${status.type === "error" ? "text-error" : "text-primary"}`} role="status">
            {status.message}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="h-12 bg-primary text-on-primary text-action-lg rounded-xl disabled:opacity-70"
        >
          {pending ? "Salvando..." : "Salvar alterações"}
        </button>
      </form>

      <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-sm border border-outline-variant/30 flex items-center justify-between gap-3">
        <div>
          <p className="text-label-lg text-on-surface">Avisar proximidade</p>
          <p className="text-body-md text-on-surface-variant">
            Receba um aviso quando o caminhão estiver a 5 minutos da sua rua.
          </p>
          {notifyError ? <p className="text-error text-label-lg mt-1">{notifyError}</p> : null}
        </div>
        <button
          type="button"
          onClick={handleToggleNotify}
          disabled={notifyPending}
          aria-pressed={notifyOn}
          className={`shrink-0 w-12 h-7 rounded-full transition-colors relative disabled:opacity-60 ${
            notifyOn ? "bg-primary" : "bg-outline-variant"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${
              notifyOn ? "translate-x-5" : ""
            }`}
          />
        </button>
      </div>
    </div>
  );
}
