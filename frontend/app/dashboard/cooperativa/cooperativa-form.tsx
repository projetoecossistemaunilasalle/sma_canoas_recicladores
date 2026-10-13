"use client";

import { useState, useTransition } from "react";
import { AddressSearch } from "@/app/address-search";
import AddressPinMap from "@/app/address-pin-map-client";
import { updateCooperativeAction } from "./actions";
import type { Cooperative, GeocodeResult, LatLng } from "@/lib/types";

export function CooperativaForm({ cooperative }: { cooperative: Cooperative }) {
  const [name, setName] = useState(cooperative.name);
  const [cnpj, setCnpj] = useState(cooperative.cnpj ?? "");
  const [phone, setPhone] = useState(cooperative.phone ?? "");
  const [instagram, setInstagram] = useState(cooperative.instagram ?? "");
  const [website, setWebsite] = useState(cooperative.website ?? "");
  // The saved address comes back as one label with the number already in it
  // (road: null); a freshly searched street is street-only (road set), so the
  // number field and the label composed from it only apply to the latter.
  const saved: GeocodeResult | null =
    cooperative.address && cooperative.lat != null && cooperative.lng != null
      ? { label: cooperative.address, lat: cooperative.lat, lng: cooperative.lng, road: null, neighborhoods: [], crossStreet: null }
      : null;
  const [street, setStreet] = useState(saved);
  const [pin, setPin] = useState<LatLng | null>(saved ? { lat: saved.lat, lng: saved.lng } : null);
  const [number, setNumber] = useState("");
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function selectStreet(result: GeocodeResult) {
    setStreet(result);
    // Starts on the street itself; tapping the map moves it onto the building.
    setPin({ lat: result.lat, lng: result.lng });
    setNumber("");
  }

  function clearStreet() {
    setStreet(null);
    setPin(null);
    setNumber("");
  }

  const addressLabel = street && street.road && number.trim() ? `${street.label}, ${number.trim()}` : street?.label;

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
        address: addressLabel,
        lat: pin?.lat,
        lng: pin?.lng,
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
          <AddressSearch
            onSelect={selectStreet}
            onClear={clearStreet}
            selectedLabel={street?.label ?? null}
            placeholder="Rua e bairro da cooperativa"
          />
          {street ? (
            <>
              <AddressPinMap
                focus={{ lat: street.lat, lng: street.lng }}
                pin={pin}
                streetLine={null}
                side={null}
                onPick={(lat, lng) => setPin({ lat, lng })}
              />
              <p className="flex items-start gap-2 text-body-md text-on-surface-variant">
                <span className="material-symbols-outlined text-[18px] text-primary mt-0.5 shrink-0">touch_app</span>
                <span>Toque no mapa em cima da cooperativa para marcar o local exato.</span>
              </p>
              {street.road ? (
                <div>
                  <label className="text-label-lg text-on-surface-variant mb-1 block" htmlFor="coop-address-number">
                    Número (opcional)
                  </label>
                  <input
                    id="coop-address-number"
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    inputMode="numeric"
                    maxLength={20}
                    placeholder="Ex.: 123"
                    className="w-40 bg-surface-container-highest text-on-surface rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              ) : null}
            </>
          ) : null}
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
