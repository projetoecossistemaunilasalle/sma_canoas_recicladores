"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { pickStreetAction, previewRouteAction, createAndPlanRoute, type CreateRouteState } from "../actions";
import { DAYS_OF_WEEK, SHIFTS } from "@/lib/format";
import type { Street, Vehicle, DayOfWeek, Shift, RoutePreviewSegment } from "@/lib/types";

const RouteMap = dynamic(() => import("../route-map").then((m) => m.RouteMap), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-64 rounded-xl bg-surface-container-highest animate-pulse" />
  ),
});

const initialState: CreateRouteState = {};

export interface RouteBuilderInitial {
  routeId?: string;
  vehicleId?: string;
  daysOfWeek?: DayOfWeek[];
  shift?: Shift;
  startTime?: string;
  stops?: Street[];
}

export function RouteBuilder({
  vehicles,
  initial,
}: {
  vehicles: Vehicle[];
  initial?: RouteBuilderInitial;
}) {
  const action = createAndPlanRoute.bind(null, initial?.routeId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [stops, setStops] = useState<Street[]>(initial?.stops ?? []);
  const [previewSegments, setPreviewSegments] = useState<RoutePreviewSegment[]>(
    (initial?.stops ?? []).map((s) => ({ streetId: s.id, isStop: true, name: s.name, geom: s.geom }))
  );
  const [previewing, setPreviewing] = useState(false);
  const [drawMode, setDrawMode] = useState(true);
  const [picking, setPicking] = useState(false);
  const [pickError, setPickError] = useState<string | null>(null);
  const [days, setDays] = useState<DayOfWeek[]>(initial?.daysOfWeek ?? []);

  const queueRef = useRef<{ lat: number; lng: number }[]>([]);
  const processingRef = useRef(false);

  // Recomputes the connected path (stops + auto-filled connector streets)
  // shortly after `stops` settles, so the map always shows the real route
  // — not just the picked stops with gaps between them.
  useEffect(() => {
    if (stops.length === 0) {
      setPreviewSegments([]);
      return;
    }
    if (stops.length === 1) {
      setPreviewSegments([{ streetId: stops[0].id, isStop: true, name: stops[0].name, geom: stops[0].geom }]);
      return;
    }
    setPreviewing(true);
    const timeout = setTimeout(async () => {
      const segments = await previewRouteAction(stops.map((s) => s.id));
      if (segments) {
        setPreviewSegments(segments);
        setPickError(null);
      } else {
        setPickError("Não foi possível conectar esses pontos — tente um caminho diferente.");
      }
      setPreviewing(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, [stops]);

  function enqueuePoint(lat: number, lng: number) {
    queueRef.current.push({ lat, lng });
    void processQueue();
  }

  async function processQueue() {
    if (processingRef.current) return;
    processingRef.current = true;
    setPicking(true);
    setPickError(null);
    let sawMiss = false;
    while (queueRef.current.length > 0) {
      const point = queueRef.current.shift()!;
      const street = await pickStreetAction(point.lat, point.lng);
      if (street) {
        setStops((prev) => {
          if (prev.length > 0 && prev[prev.length - 1].id === street.id) return prev;
          return [...prev, street];
        });
      } else {
        sawMiss = true;
      }
    }
    if (sawMiss) setPickError("Alguns pontos não tinham rua próxima e foram ignorados.");
    setPicking(false);
    processingRef.current = false;
  }

  function removeStop(index: number) {
    setStops((prev) => prev.filter((_, i) => i !== index));
  }

  function clearStops() {
    setStops([]);
  }

  function toggleDay(day: DayOfWeek) {
    setDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  }

  return (
    <form action={formAction} className="flex flex-col lg:flex-row gap-6 lg:h-[calc(100vh-260px)]">
      <input type="hidden" name="streetIds" value={stops.map((s) => s.id).join(",")} />
      {days.map((d) => (
        <input key={d} type="hidden" name="daysOfWeek" value={d} />
      ))}

      <div className="flex-1 flex flex-col gap-3 min-h-[320px]">
        <div className="flex items-center justify-between">
          <button
            className={`flex items-center gap-2 px-4 h-10 rounded-full text-label-lg transition-colors ${
              drawMode
                ? "bg-primary text-on-primary"
                : "bg-surface-container-highest text-on-surface-variant"
            }`}
            onClick={() => setDrawMode((v) => !v)}
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">
              {drawMode ? "edit" : "pan_tool"}
            </span>
            {drawMode ? "Desenhando a rota" : "Navegar no mapa"}
          </button>
          {stops.length > 0 ? (
            <button
              className="text-label-lg text-error hover:text-on-error-container transition-colors"
              onClick={clearStops}
              type="button"
            >
              Limpar
            </button>
          ) : null}
        </div>
        <p className="text-label-lg text-on-surface-variant">
          {drawMode
            ? "Clique e arraste sobre as ruas, na ordem da coleta. Toque no botão para navegar/afastar o mapa."
            : "Modo navegação: arraste para mover o mapa. Toque no botão para voltar a desenhar."}
        </p>
        <div className="flex-1 relative min-h-[50vh] lg:min-h-0">
          <RouteMap
            pathGeoms={previewSegments.map((s) => s.geom)}
            stopGeoms={stops.map((s) => s.geom)}
            drawMode={drawMode}
            onPoint={enqueuePoint}
          />
          {picking || previewing ? (
            <div className="absolute top-3 right-3 bg-surface px-3 py-1.5 rounded-full shadow text-label-lg text-on-surface-variant">
              {picking ? "Buscando ruas..." : "Conectando rota..."}
            </div>
          ) : null}
        </div>
        {pickError ? <p className="text-error text-label-lg">{pickError}</p> : null}
      </div>

      <div className="w-full lg:w-96 shrink-0 flex flex-col gap-6 bg-surface-container rounded-2xl p-6 shadow-sm overflow-y-auto">
        <div className="flex flex-col gap-2">
          <label className="text-label-lg text-on-surface-variant" htmlFor="vehicleId">
            Veículo
          </label>
          <select
            className="bg-surface-container-highest text-on-surface rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary"
            id="vehicleId"
            name="vehicleId"
            defaultValue={initial?.vehicleId ?? ""}
            required
          >
            <option value="">Selecione um veículo...</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.plate ?? "Sem placa"}
                {v.model ? ` · ${v.model}` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-label-lg text-on-surface-variant">Dias da semana</span>
          <div className="flex flex-wrap gap-2">
            {DAYS_OF_WEEK.map((day) => (
              <button
                key={day.value}
                className={`px-3 h-9 rounded-full text-label-lg transition-colors ${
                  days.includes(day.value)
                    ? "bg-primary text-on-primary"
                    : "bg-surface-container-highest text-on-surface-variant"
                }`}
                onClick={() => toggleDay(day.value)}
                type="button"
              >
                {day.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-label-lg text-on-surface-variant" htmlFor="shift">
            Turno
          </label>
          <select
            className="bg-surface-container-highest text-on-surface rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary"
            id="shift"
            name="shift"
            defaultValue={initial?.shift ?? ""}
            required
          >
            <option value="">Selecione o turno...</option>
            {SHIFTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-label-lg text-on-surface-variant" htmlFor="startTime">
            Horário de início
          </label>
          <input
            className="bg-surface-container-highest text-on-surface rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary"
            id="startTime"
            name="startTime"
            type="time"
            defaultValue={initial?.startTime ?? ""}
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-label-lg text-on-surface-variant">
            Paradas selecionadas ({stops.length})
          </span>
          {stops.length === 0 ? (
            <p className="text-body-md text-on-surface-variant py-4 text-center bg-surface rounded-xl">
              Desenhe no mapa para adicionar a primeira rua.
            </p>
          ) : (
            <ol className="flex flex-col gap-2">
              {stops.map((street, i) => (
                <li key={`${street.id}-${i}`} className="flex items-center gap-3 bg-surface rounded-xl p-3">
                  <span className="w-6 h-6 rounded-full bg-primary text-on-primary text-xs flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <span className="flex-1 text-body-md text-on-surface truncate">
                    {street.name ?? `Rua #${street.id}`}
                  </span>
                  <button
                    className="flex items-center justify-center w-10 h-10 -m-1 rounded-full text-on-surface-variant hover:text-error hover:bg-error-container/40 transition-colors shrink-0"
                    onClick={() => removeStop(i)}
                    type="button"
                    aria-label="Remover"
                  >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                </li>
              ))}
            </ol>
          )}
        </div>

        {previewSegments.length > stops.length ? (
          <div className="flex flex-col gap-2">
            <span className="text-label-lg text-on-surface-variant">
              Trajeto completo ({previewSegments.length} ruas)
            </span>
            <ol className="flex flex-col gap-1 max-h-48 overflow-y-auto bg-surface rounded-xl p-3">
              {previewSegments.map((seg, i) => (
                <li
                  key={`${seg.streetId}-${i}`}
                  className={`flex items-center gap-2 text-body-md ${
                    seg.isStop ? "text-on-surface font-semibold" : "text-on-surface-variant"
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px] shrink-0">
                    {seg.isStop ? "location_on" : "remove"}
                  </span>
                  <span className="truncate">{seg.name ?? `Rua #${seg.streetId}`}</span>
                </li>
              ))}
            </ol>
          </div>
        ) : null}

        {state.error ? (
          <p className="text-error text-label-lg" role="alert">
            {state.error}
          </p>
        ) : null}

        <button
          className="w-full h-12 bg-primary text-on-primary text-action-lg rounded-full hover:bg-primary-container transition-all disabled:opacity-70"
          disabled={pending || stops.length === 0}
          type="submit"
        >
          {pending ? "Calculando rota..." : initial?.routeId ? "Salvar Rota" : "Criar Rota"}
        </button>
      </div>
    </form>
  );
}
