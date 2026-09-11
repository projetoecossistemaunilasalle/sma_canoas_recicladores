"use client";

import { useState, useTransition } from "react";
import { AddressSearch } from "@/app/address-search";
import { updateCooperativeAction } from "./actions";
import type { Cooperative, GeocodeResult } from "@/lib/types";

export function CooperativaForm({ cooperative }: { cooperative: Cooperative }) {
  const [name, setName] = useState(cooperative.name);
  const [cnpj, setCnpj] = useState(cooperative.cnpj ?? "");
  const [phone, setPhone] = useState(cooperative.phone ?? "");
  const [instagram, setInstagram] = useState(cooperative.instagram ?? "");
  const [website, setWebsite] = useState(cooperative.website ?? "");
  const [address, setAddress] = useState<GeocodeResult | null>(
    cooperative.address && cooperative.lat != null && cooperative.lng != null
      ? { label: cooperative.address, lat: cooperative.lat, lng: cooperative.lng }
      : null
  );
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    startTransition(async () => {
      const { result, error } = await updateCooperativeAction(cooperative.id, {
        name,
        cnpj: cnpj || undefined,
        phone: phone || undefined,
        instagram: instagram || undefined,
        website: website || undefined,
        address: address?.label,
        lat: address?.lat,
        lng: address?.lng,
      });
      if (error) {
        setStatus({ type: "error", message: error });
      } else if (result) {
        setStatus({ type: "success", message: "Informações da cooperativa atualizadas." });
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 bg-surface-container rounded-2xl p-6 sm:p-8 shadow-sm w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
        <div className="flex flex-col gap-2 sm:col-span-2 xl:col-span-3">
          <label className="text-label-lg text-on-surface-variant" htmlFor="coop-name">
            Nome da cooperativa
          </label>
          <input
            id="coop-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-surface-container-highest text-on-surface rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="flex flex-col gap-2 sm:col-span-2 xl:col-span-3">
          <p className="text-label-lg text-on-surface-variant">Endereço (aparece no mapa do cidadão)</p>
          <AddressSearch onSelect={setAddress} onClear={() => setAddress(null)} selectedLabel={address?.label ?? null} />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-label-lg text-on-surface-variant" htmlFor="coop-cnpj">
            CNPJ
          </label>
          <input
            id="coop-cnpj"
            value={cnpj}
            onChange={(e) => setCnpj(e.target.value)}
            placeholder="00.000.000/0000-00"
            className="w-full bg-surface-container-highest text-on-surface rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-label-lg text-on-surface-variant" htmlFor="coop-phone">
            Telefone
          </label>
          <input
            id="coop-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="51 99999-9999"
            className="w-full bg-surface-container-highest text-on-surface rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-label-lg text-on-surface-variant" htmlFor="coop-instagram">
            Instagram
          </label>
          <input
            id="coop-instagram"
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
            placeholder="https://instagram.com/..."
            className="w-full bg-surface-container-highest text-on-surface rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-label-lg text-on-surface-variant" htmlFor="coop-website">
            Site
          </label>
          <input
            id="coop-website"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://..."
            className="w-full bg-surface-container-highest text-on-surface rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {status ? (
        <p className={`text-label-lg ${status.type === "error" ? "text-error" : "text-primary"}`} role="status">
          {status.message}
        </p>
      ) : null}

      <div className="pt-2">
        <button
          type="submit"
          disabled={pending}
          className="h-12 px-10 bg-primary text-on-primary text-action-lg rounded-full hover:bg-primary-container transition-all disabled:opacity-70"
        >
          {pending ? "Salvando..." : "Salvar alterações"}
        </button>
      </div>
    </form>
  );
}
