"use client";

import { useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { checkEtaAction } from "./actions";
import type { EtaResult, Vehicle } from "@/lib/types";

const TrackingMap = dynamic(() => import("./tracking-map").then((m) => m.TrackingMap), {
  ssr: false,
  loading: () => (
    <div className="w-full h-64 rounded-xl bg-surface-container-highest animate-pulse" />
  ),
});

const statusStyles: Record<EtaResult["status"], { icon: string; className: string }> = {
  chegando: { icon: "directions_car", className: "bg-primary/10 text-primary" },
  na_rua: { icon: "location_on", className: "bg-primary/10 text-primary" },
  passou: { icon: "check_circle", className: "bg-surface-variant text-on-surface-variant" },
  nao_esta_na_rota: { icon: "info", className: "bg-secondary/10 text-secondary" },
  sem_rota: { icon: "event_busy", className: "bg-surface-variant text-on-surface-variant" },
};

export function TrackingWidget({ vehicles }: { vehicles: Vehicle[] }) {
  const [vehicleId, setVehicleId] = useState("");
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [result, setResult] = useState<EtaResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function useMyLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      setPosition([pos.coords.latitude, pos.coords.longitude]);
    });
  }

  function checkEta() {
    if (!vehicleId || !position) return;
    setError(null);
    setResult(null);
    startTransition(async () => {
      const res = await checkEtaAction(vehicleId, position[0], position[1]);
      if (res.error) setError(res.error);
      else if (res.result) setResult(res.result);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-surface-container rounded-2xl p-6 shadow-sm flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-label-lg text-on-surface-variant" htmlFor="vehicleId">
            Caminhão
          </label>
          <select
            className="bg-surface-container-highest text-on-surface rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary"
            id="vehicleId"
            value={vehicleId}
            onChange={(e) => setVehicleId(e.target.value)}
          >
            <option value="">Selecione um caminhão...</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.plate ?? "Sem placa"}
                {v.model ? ` · ${v.model}` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-label-lg text-on-surface-variant">
              Sua localização (clique no mapa)
            </span>
            <button
              className="text-label-lg text-primary hover:text-primary-container transition-colors flex items-center gap-1"
              onClick={useMyLocation}
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">my_location</span>
              Usar minha localização
            </button>
          </div>
          <TrackingMap position={position} onPick={(lat, lng) => setPosition([lat, lng])} />
        </div>

        <button
          className="w-full h-12 bg-primary text-on-primary text-action-lg rounded-full hover:bg-primary-container transition-all disabled:opacity-70"
          disabled={!vehicleId || !position || pending}
          onClick={checkEta}
          type="button"
        >
          {pending ? "Verificando..." : "Verificar"}
        </button>
      </div>

      {error ? (
        <div className="bg-error-container text-on-error-container rounded-2xl p-4 text-body-md">
          {error}
        </div>
      ) : null}

      {result ? (
        <div className="bg-surface-container rounded-2xl p-6 shadow-sm flex items-center gap-4">
          <div
            className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 ${statusStyles[result.status].className}`}
          >
            <span className="material-symbols-outlined text-[28px]">
              {statusStyles[result.status].icon}
            </span>
          </div>
          <div className="flex-1">
            <p className="text-title-lg text-on-surface">{result.etaText}</p>
            {result.citizenStreet ? (
              <p className="text-body-md text-on-surface-variant">
                Sua rua: {result.citizenStreet}
                {result.currentStreet ? ` · Caminhão em: ${result.currentStreet}` : ""}
              </p>
            ) : null}
            {result.streetsRemaining > 0 ? (
              <p className="text-body-md text-on-surface-variant">
                {result.streetsRemaining} rua(s) até chegar
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
