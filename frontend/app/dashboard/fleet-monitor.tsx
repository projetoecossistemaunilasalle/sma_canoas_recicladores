"use client";

import { useMemo } from "react";
import FleetMapClient from "./fleet-map-client";
import { useFleetTracking } from "@/lib/use-fleet-tracking";
import { vehicleColorHex, vehicleTypeIcon, vehicleTypeLabel } from "@/lib/vehicle-options";
import { relativeTime } from "@/lib/format";
import type { VehicleType } from "@/lib/types";
import type { FleetMapPoint } from "./fleet-map";

export interface FleetVehicleInfo {
  id: string;
  plate: string | null;
  model: string | null;
  color: string | null;
  type: VehicleType;
  active: boolean;
  initialLat: number | null;
  initialLng: number | null;
  initialRecordedAt: string | null;
}

// Owns the one live-tracking WebSocket for the whole dashboard (see
// lib/use-fleet-tracking.ts) and feeds the same up-to-date positions into
// both the map and the vehicle list below it, so neither one goes stale
// relative to the other.
export function FleetMonitor({ vehicles }: { vehicles: FleetVehicleInfo[] }) {
  const vehicleIds = useMemo(() => vehicles.map((v) => v.id), [vehicles]);
  const livePositions = useFleetTracking(vehicleIds);

  const merged = vehicles.map((v) => {
    const live = livePositions[v.id];
    return {
      ...v,
      lat: live?.lat ?? v.initialLat,
      lng: live?.lng ?? v.initialLng,
      recordedAt: live?.recordedAt ?? v.initialRecordedAt,
    };
  });

  const mapPoints: FleetMapPoint[] = merged.flatMap((v) => {
    if (v.lat == null || v.lng == null) return [];
    return [
      {
        id: v.id,
        label: `${v.plate ?? "Sem placa"}${v.model ? ` · ${v.model}` : ""}`,
        sublabel: v.recordedAt ? `Atualizado ${relativeTime(v.recordedAt)}` : "Sem posição registrada",
        lat: v.lat,
        lng: v.lng,
        color: v.color,
        type: v.type,
      },
    ];
  });

  return (
    <>
      <FleetMapClient points={mapPoints} />
      {vehicles.length === 0 ? (
        <p className="text-body-md text-on-surface-variant py-6 text-center">
          Nenhum veículo cadastrado ainda.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {merged.map((v) => (
            <div key={v.id} className="bg-surface p-3 rounded-xl flex items-center gap-4">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-white"
                style={{ backgroundColor: vehicleColorHex(v.color) }}
                title={vehicleTypeLabel(v.type)}
              >
                <span className="material-symbols-outlined text-[20px]">{vehicleTypeIcon(v.type)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-label-lg text-on-surface truncate">
                  {v.plate ?? "Sem placa"}
                  {v.model ? ` · ${v.model}` : ""}
                </p>
                <p className="text-body-md text-xs text-on-surface-variant truncate">
                  {v.lat != null && v.lng != null
                    ? `${v.lat.toFixed(4)}, ${v.lng.toFixed(4)}${v.recordedAt ? ` · ${relativeTime(v.recordedAt)}` : ""}`
                    : "Sem posição registrada"}
                </p>
              </div>
              <span
                className={`text-[10px] uppercase px-2 py-0.5 rounded-full shrink-0 ${
                  v.active ? "text-primary bg-primary/10" : "text-on-surface-variant bg-surface-variant"
                }`}
              >
                {v.active ? "Ativo" : "Inativo"}
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
