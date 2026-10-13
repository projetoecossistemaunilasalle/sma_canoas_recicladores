"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { pickStreetAction, previewRouteAction, saveRouteAction, type SaveRouteState } from "../actions";
import { MapSkeleton } from "@/app/map-skeleton";
import { DAYS_OF_WEEK, SHIFTS } from "@/lib/format";
import { lineLengthMeters } from "@/lib/geo";
import type { Street, Vehicle, DayOfWeek, Shift, RoutePreviewSegment, CollectionSide, RouteStopInput } from "@/lib/types";

const RouteMap = dynamic(() => import("../route-map").then((m) => m.RouteMap), {
  ssr: false,
  loading: () => <MapSkeleton className="w-full h-full min-h-64" />,
});

const initialState: SaveRouteState = {};

/** A picked stop plus what's collected on it: which side and which stretch (0..1 along the segment). */
export interface StopDraft {
  street: Street;
  side: CollectionSide;
  startFraction: number;
  endFraction: number;
}

// "Left"/"right" are from the driver's seat, driving the direction of the
// orange arrow on the map — i.e. the segment's own geometry direction,
// which is how the backend stores them (see route_streets.side).
const SIDE_OPTIONS: { value: CollectionSide; label: string }[] = [
  { value: "both", label: "Os dois" },
  { value: "left", label: "Esquerda" },
  { value: "right", label: "Direita" },
];

function isWholeStretch(stop: StopDraft) {
  return stop.startFraction <= 0 && stop.endFraction >= 1;
}

function stopSummary(stop: StopDraft): string {
  const side = stop.side === "both" ? "Os dois lados" : stop.side === "left" ? "Lado esquerdo" : "Lado direito";
  return `${side} · ${isWholeStretch(stop) ? "quarteirão inteiro" : "parte do quarteirão"}`;
}

function toStopInput(stop: StopDraft): RouteStopInput {
  return {
    streetId: stop.street.id,
    side: stop.side,
    startFraction: stop.startFraction,
    endFraction: stop.endFraction,
  };
}

export interface RouteBuilderInitial {
  routeId?: string;
  vehicleId?: string;
  daysOfWeek?: DayOfWeek[];
  shift?: Shift;
  startTime?: string;
  stops?: StopDraft[];
}

export function RouteBuilder({
  vehicles,
  initial,
}: {
  vehicles: Vehicle[];
  initial?: RouteBuilderInitial;
}) {
  const action = saveRouteAction.bind(null, initial?.routeId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [stops, setStops] = useState<StopDraft[]>(initial?.stops ?? []);
  const [fetchedPreview, setFetchedPreview] = useState<RoutePreviewSegment[]>(
    (initial?.stops ?? []).map((s) => ({ streetId: s.street.id, isStop: true, name: s.street.name, line: s.street.line }))
  );
  const [previewing, setPreviewing] = useState(false);
  const [drawMode, setDrawMode] = useState(true);
  const [selectedStop, setSelectedStop] = useState<number | null>(null);
  const [picking, setPicking] = useState(false);
  const [pickError, setPickError] = useState<string | null>(null);
  const [days, setDays] = useState<DayOfWeek[]>(initial?.daysOfWeek ?? []);

  const queueRef = useRef<{ lat: number; lng: number }[]>([]);
  const processingRef = useRef(false);
  // Street-id sequence fetchedPreview was computed for. Side and stretch
  // edits change `stops` too, but not the path the truck drives — this lets
  // the effect below skip re-running pgRouting for them.
  const previewedKeyRef = useRef<string | null>(null);

  // With 0 or 1 stops there's nothing to connect, so the path is just the
  // stops themselves; from 2 on it's the pgRouting result fetched below.
  const previewSegments: RoutePreviewSegment[] =
    stops.length === 0
      ? []
      : stops.length === 1
        ? [{ streetId: stops[0].street.id, isStop: true, name: stops[0].street.name, line: stops[0].street.line }]
        : fetchedPreview;

  // Recomputes the connected path (stops + auto-filled connector streets)
  // shortly after `stops` settles, so the map always shows the real route
  // — not just the picked stops with gaps between them.
  useEffect(() => {
    if (stops.length < 2) return;
    const streetIds = stops.map((s) => s.street.id);
    const key = streetIds.join(",");
    if (key === previewedKeyRef.current) return;

    const timeout = setTimeout(async () => {
      previewedKeyRef.current = key;
      setPreviewing(true);
      const segments = await previewRouteAction(streetIds);
      if (segments) {
        setFetchedPreview(segments);
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
          if (prev.length > 0 && prev[prev.length - 1].street.id === street.id) return prev;
          return [...prev, { street, side: "both", startFraction: 0, endFraction: 1 }];
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
    setSelectedStop((sel) => (sel === null || sel === index ? null : sel > index ? sel - 1 : sel));
  }

  function clearStops() {
    setStops([]);
    setSelectedStop(null);
  }

  // Editing a stop's side/stretch happens with the map in navigation mode —
  // in draw mode every click would add another stop instead.
  function selectStop(index: number) {
    setSelectedStop((sel) => (sel === index ? null : index));
    setDrawMode(false);
  }

  function toggleDrawMode() {
    setDrawMode((on) => !on);
    setSelectedStop(null);
  }

  function updateStop(index: number, patch: Partial<Omit<StopDraft, "street">>) {
    setStops((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function toggleDay(day: DayOfWeek) {
    setDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  }

  return (
    <form action={formAction} className="flex flex-col lg:flex-row gap-6 lg:h-[calc(100vh-260px)]">
      <input type="hidden" name="stops" value={JSON.stringify(stops.map(toStopInput))} />
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
            onClick={toggleDrawMode}
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
            : "Modo navegação: arraste para mover o mapa. Toque numa parada (na lista ou na linha laranja) pra escolher o lado e o trecho coletado."}
        </p>
        <div className="flex-1 relative min-h-[50vh] lg:min-h-0">
          <RouteMap
            pathLines={previewSegments.map((s) => s.line)}
            stops={stops.map((s) => ({
              line: s.street.line,
              side: s.side,
              startFraction: s.startFraction,
              endFraction: s.endFraction,
            }))}
            selectedStop={selectedStop}
            onSelectStop={selectStop}
            onStretchChange={(index, startFraction, endFraction) => updateStop(index, { startFraction, endFraction })}
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
              {stops.map((stop, i) => (
                <li
                  key={`${stop.street.id}-${i}`}
                  className={`bg-surface rounded-xl ${i === selectedStop ? "ring-2 ring-primary" : ""}`}
                >
                  <div className="flex items-center gap-3 p-3">
                    <span className="w-6 h-6 rounded-full bg-primary text-on-primary text-xs flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => selectStop(i)}
                      className="flex-1 min-w-0 text-left"
                      aria-expanded={i === selectedStop}
                    >
                      <span className="block text-body-md text-on-surface truncate">
                        {stop.street.name ?? `Rua #${stop.street.id}`}
                      </span>
                      <span className="block text-label-lg text-on-surface-variant truncate">{stopSummary(stop)}</span>
                    </button>
                    <button
                      className="flex items-center justify-center w-10 h-10 -m-1 rounded-full text-on-surface-variant hover:text-error hover:bg-error-container/40 transition-colors shrink-0"
                      onClick={() => removeStop(i)}
                      type="button"
                      aria-label="Remover"
                    >
                      <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                  </div>
                  {i === selectedStop ? <StopEditor stop={stop} onChange={(patch) => updateStop(i, patch)} /> : null}
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

function StopEditor({
  stop,
  onChange,
}: {
  stop: StopDraft;
  onChange: (patch: Partial<Omit<StopDraft, "street">>) => void;
}) {
  const lengthMeters = lineLengthMeters(stop.street.line);
  const collectedMeters = Math.round((stop.endFraction - stop.startFraction) * lengthMeters);

  return (
    <div className="flex flex-col gap-4 px-3 pb-3">
      <div className="flex flex-col gap-1.5">
        <span className="text-label-lg text-on-surface-variant">Lado coletado</span>
        <div className="flex gap-1 bg-surface-container-highest rounded-full p-1">
          {SIDE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange({ side: opt.value })}
              aria-pressed={stop.side === opt.value}
              className={`flex-1 h-9 rounded-full text-label-lg transition-colors ${
                stop.side === opt.value ? "bg-primary text-on-primary" : "text-on-surface-variant"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className="text-label-lg text-on-surface-variant">
          Esquerda e direita de quem dirige no sentido da seta laranja no mapa.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-label-lg text-on-surface-variant">Trecho coletado</span>
        <p className="text-body-md text-on-surface">
          {isWholeStretch(stop)
            ? `Quarteirão inteiro (${Math.round(lengthMeters)} m)`
            : `${collectedMeters} m de ${Math.round(lengthMeters)} m do quarteirão`}
        </p>
        <p className="text-label-lg text-on-surface-variant">
          Arraste as bolinhas nas pontas da linha laranja pra cortar onde a coleta começa e termina.
        </p>
        {!isWholeStretch(stop) ? (
          <button
            type="button"
            onClick={() => onChange({ startFraction: 0, endFraction: 1 })}
            className="self-start text-label-lg text-primary hover:underline"
          >
            Usar o quarteirão inteiro
          </button>
        ) : null}
      </div>
    </div>
  );
}
