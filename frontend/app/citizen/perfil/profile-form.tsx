"use client";

import { useState, useTransition } from "react";
import { AddressPicker } from "@/app/address-picker";
import { updateProfileAction } from "../actions";
import { useProximityNotifications } from "@/lib/push";
import { useAddressPin } from "@/lib/use-address-pin";
import type { CitizenAddress, CurrentUser } from "@/lib/types";

export function ProfileForm({ user, initialAddress }: { user: CurrentUser; initialAddress: CitizenAddress | null }) {
  const [name, setName] = useState(user.name);
  const addressPin = useAddressPin(initialAddress);
  const notify = useProximityNotifications(user.notifyProximity);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    if (addressPin.incomplete) {
      setStatus({ type: "error", message: "Marque sua casa no mapa e confirme o lado da rua." });
      return;
    }
    const address = addressPin.value;
    startTransition(async () => {
      const { result, error } = await updateProfileAction({
        name,
        ...(address
          ? {
              address: address.label,
              lat: address.lat,
              lng: address.lng,
              addressNumber: address.number,
              addressStreetId: address.streetId,
              addressSide: address.side,
            }
          : {}),
      });
      if (error) {
        setStatus({ type: "error", message: error });
      } else if (result) {
        setStatus({ type: "success", message: "Perfil atualizado." });
      }
    });
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
          <AddressPicker state={addressPin} />
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
          {notify.error ? <p className="text-error text-label-lg mt-1">{notify.error}</p> : null}
        </div>
        <button
          type="button"
          onClick={notify.toggle}
          disabled={notify.pending}
          aria-pressed={notify.on}
          className={`shrink-0 w-12 h-7 rounded-full transition-colors relative disabled:opacity-60 ${
            notify.on ? "bg-primary" : "bg-outline-variant"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${
              notify.on ? "translate-x-5" : ""
            }`}
          />
        </button>
      </div>
    </div>
  );
}
