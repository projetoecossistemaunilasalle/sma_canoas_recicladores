"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { pickStreetAction, previewRouteAction, saveRouteAction, type SaveRouteState } from "../actions";
import { MapSkeleton } from "@/app/map-skeleton";
import { DAYS_OF_WEEK, SHIFTS } from "@/lib/format";
import { lineLengthMeters } from "@/lib/geo";
import { RouteLegend } from "../route-legend";
import { ROUTE_COLORS } from "../route-style";
import type { Street, Vehicle, DayOfWeek, Shift, RoutePreviewSegment, CollectionSide, RouteStopInput } from "@/lib/types";

const RouteMap = dynamic(() => import("../route-map").then((m) => m.RouteMap), {
  ssr: false,
  loading: () => <MapSkeleton className="w-full h-full min-h-64" />,
});

const initialState: SaveRouteState = {};
const UNDO_MS = 10_000;

/** A picked stop plus what's collected on it: which side and which stretch (0..1 along the segment). */
export interface StopDraft {
  street: Street;
  side: CollectionSide;
  startFraction: number;
  endFraction: number;
}

// A stable identity per stop, so React keeps the right row (and its focus)
// when the list is reordered.
type Stop = StopDraft & { uid: number };
let lastUid = 0;
function withUid(stop: StopDraft): Stop {
  return { ...stop, uid: ++lastUid };
}

// "Left"/"right" are from the driver's seat, driving the way the stop's
// marker points on the map — i.e. the segment's own geometry direction,
// which is how the backend stores them (see route_streets.side).
const SIDE_OPTIONS: { value: CollectionSide; label: string }[] = [
  { value: "both", label: "Os dois lados" },
  { value: "left", label: "Só a esquerda" },
  { value: "right", label: "Só a direita" },
];

function isWholeStretch(stop: StopDraft) {
  return stop.startFraction <= 0 && stop.endFraction >= 1;
}

function streetName(street: Street) {
  return street.name ?? "Rua sem nome";
}

function stopSummary(stop: StopDraft): string {
  const side =
    stop.side === "both" ? "Coleta dos dois lados" : stop.side === "left" ? "Só o lado esquerdo" : "Só o lado direito";
  return `${side} · ${isWholeStretch(stop) ? "quarteirão todo" : "um pedaço do quarteirão"}`;
}

function formatDistance(meters: number) {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km`;
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
  const [stops, setStops] = useState<Stop[]>(() => (initial?.stops ?? []).map(withUid));
  const [fetchedPreview, setFetchedPreview] = useState<RoutePreviewSegment[]>(
    (initial?.stops ?? []).map((s) => ({ streetId: s.street.id, isStop: true, name: s.street.name, line: s.street.line }))
  );
  const [previewing, setPreviewing] = useState(false);
  // A new route starts out drawing; an existing one opens ready to look around.
  const [drawMode, setDrawMode] = useState(!initial?.stops?.length);
  const [selectedStop, setSelectedStop] = useState<number | null>(null);
  const [picking, setPicking] = useState(false);
  const [pickError, setPickError] = useState<string | null>(null);
  const [days, setDays] = useState<DayOfWeek[]>(initial?.daysOfWeek ?? []);
  // What "Desfazer" puts back after a removal or "Apagar tudo".
  const [undo, setUndo] = useState<{ stops: Stop[]; message: string } | null>(null);
  // Drag-and-drop reordering: the row being dragged and where it would land
  // (an insertion index, 0..stops.length).
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dropAt, setDropAt] = useState<number | null>(null);

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
  const totalMeters = previewSegments.reduce((sum, s) => sum + lineLengthMeters(s.line), 0);

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
        setPickError("Não foi possível ligar essas ruas — tente outra ordem ou outro caminho.");
      }
      setPreviewing(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, [stops]);

  useEffect(() => {
    if (!undo) return;
    const timeout = setTimeout(() => setUndo(null), UNDO_MS);
    return () => clearTimeout(timeout);
  }, [undo]);

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
        // A snapshot from before this stop would drop it if put back.
        setUndo(null);
        setStops((prev) => {
          if (prev.length > 0 && prev[prev.length - 1].street.id === street.id) return prev;
          return [...prev, withUid({ street, side: "both", startFraction: 0, endFraction: 1 })];
        });
      } else {
        sawMiss = true;
      }
    }
    if (sawMiss) setPickError("Alguns pontos não estavam em cima de uma rua e foram ignorados.");
    setPicking(false);
    processingRef.current = false;
  }

  function removeStop(index: number) {
    setUndo({ stops, message: `${streetName(stops[index].street)} saiu da rota.` });
    setStops((prev) => prev.filter((_, i) => i !== index));
    setSelectedStop((sel) => (sel === null || sel === index ? null : sel > index ? sel - 1 : sel));
  }

  function clearStops() {
    setUndo({ stops, message: "Todas as paradas foram apagadas." });
    setStops([]);
    setSelectedStop(null);
  }

  function undoLast() {
    if (!undo) return;
    setStops(undo.stops);
    setSelectedStop(null);
    setUndo(null);
  }

  function moveStop(from: number, to: number) {
    if (to < 0 || to >= stops.length || from === to) return;
    setStops((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    setSelectedStop((sel) => {
      if (sel === null) return null;
      if (sel === from) return to;
      if (from < sel && sel <= to) return sel - 1;
      if (to <= sel && sel < from) return sel + 1;
      return sel;
    });
  }

  function endDrag() {
    setDragFrom(null);
    setDropAt(null);
  }

  // Editing a stop's side/stretch happens with the map in navigation mode —
  // in draw mode every click would add another stop instead.
  function selectStop(index: number) {
    setSelectedStop((sel) => (sel === index ? null : index));
    setDrawMode(false);
  }

  function setMode(draw: boolean) {
    setDrawMode(draw);
    if (draw) setSelectedStop(null);
  }

  function updateStop(index: number, patch: Partial<Omit<StopDraft, "street">>) {
    setStops((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function toggleDay(day: DayOfWeek) {
    setDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  }

  const hint = drawMode
    ? stops.length === 0
      ? "Clique e arraste o mouse em cima das ruas, na ordem em que o caminhão vai coletar. Comece pela primeira rua."
      : "Continue arrastando sobre as próximas ruas. A última rua que você marcar é onde a rota termina."
    : selectedStop !== null
      ? "Escolha o lado da rua na lista ao lado. Para coletar só um pedaço da rua, arraste as bolinhas brancas no mapa."
      : "Arraste para olhar o mapa. Clique num número laranja para escolher o lado da rua daquela parada.";

  return (
    <form action={formAction} className="flex flex-col lg:flex-row lg:items-start gap-6">
      <input type="hidden" name="stops" value={JSON.stringify(stops.map(toStopInput))} />
      {days.map((d) => (
        <input key={d} type="hidden" name="daysOfWeek" value={d} />
      ))}

      {/* ---- Map ---- */}
      <section className="flex-1 min-w-0 flex flex-col gap-3">
        <StepTitle n={1} title="Desenhe o caminho no mapa" />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex bg-surface-container-high rounded-full p-1" role="group" aria-label="O que fazer no mapa">
            <ModeButton active={drawMode} icon="draw" label="Desenhar rota" onClick={() => setMode(true)} />
            <ModeButton active={!drawMode} icon="pan_tool" label="Mover o mapa" onClick={() => setMode(false)} />
          </div>
          {stops.length > 0 ? (
            <button
              className="flex items-center gap-1.5 h-11 px-4 rounded-full text-label-lg text-error hover:bg-error-container/50 transition-colors"
              onClick={clearStops}
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]">delete_sweep</span>
              Apagar tudo
            </button>
          ) : null}
        </div>

        <p className="flex items-start gap-2 bg-secondary-container text-on-secondary-container rounded-2xl px-4 py-3 text-body-md">
          <span className="material-symbols-outlined text-[22px] shrink-0">lightbulb</span>
          {hint}
        </p>

        <div className="relative h-[60vh] min-h-[380px] rounded-2xl shadow-sm">
          <RouteMap
            path={previewSegments.map((s) => ({ line: s.line, isStop: s.isStop }))}
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
            <div className="absolute top-3 right-3 z-[1000] flex items-center gap-2 bg-surface px-3 py-2 rounded-full shadow text-label-lg text-on-surface">
              <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
              {picking ? "Achando as ruas..." : "Ligando as ruas..."}
            </div>
          ) : null}
        </div>

        {pickError ? (
          <p className="flex items-center gap-2 text-error text-label-lg" role="alert">
            <span className="material-symbols-outlined text-[20px]">error</span>
            {pickError}
          </p>
        ) : null}

        <RouteLegend />
      </section>

      {/* ---- Side panel ---- */}
      <aside className="w-full lg:w-[400px] shrink-0 flex flex-col bg-surface-container rounded-3xl shadow-sm lg:sticky lg:top-6 lg:max-h-[calc(100vh-48px)]">
        <div className="flex-1 flex flex-col gap-6 p-5 lg:overflow-y-auto">
          <section className="flex flex-col gap-3">
            <StepTitle n={2} title="Confira as paradas" />

            {stops.length > 0 ? (
              <RouteSummary
                stopCount={stops.length}
                distance={formatDistance(totalMeters)}
                first={streetName(stops[0].street)}
                last={streetName(stops[stops.length - 1].street)}
              />
            ) : null}

            {stops.length === 0 ? (
              <div className="flex flex-col items-center text-center gap-2 py-8 px-4 bg-surface-container-lowest rounded-2xl border-2 border-dashed border-outline-variant">
                <span className="material-symbols-outlined text-primary text-[44px]">route</span>
                <p className="text-body-md font-semibold text-on-surface">Nenhuma parada ainda</p>
                <p className="text-body-md text-on-surface-variant">
                  Com <strong>Desenhar rota</strong> ligado, passe o mouse em cima das ruas no mapa, na ordem da coleta.
                  Cada rua vira uma parada aqui.
                </p>
              </div>
            ) : (
              <>
                <p className="text-body-md text-on-surface-variant">
                  Para mudar a ordem, segure em{" "}
                  <span className="material-symbols-outlined text-[18px] align-text-bottom">drag_indicator</span> e
                  arraste. Clique numa parada para escolher o lado da rua.
                </p>
                <ol className="flex flex-col gap-2" onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDropAt(null);
                }}>
                  {stops.map((stop, i) => {
                    const isSelected = i === selectedStop;
                    const showDropBefore = dropAt === i && dragFrom !== null && dropAt !== dragFrom && dropAt !== dragFrom + 1;
                    const showDropAfter =
                      i === stops.length - 1 && dropAt === stops.length && dragFrom !== null && dragFrom !== stops.length - 1;
                    return (
                      <li
                        key={stop.uid}
                        className={`relative rounded-2xl bg-surface-container-lowest border-2 transition-[border-color,opacity,box-shadow] ${
                          isSelected ? "border-primary shadow-md" : "border-transparent shadow-sm"
                        } ${dragFrom === i ? "opacity-40" : ""}`}
                        onDragOver={(e) => {
                          if (dragFrom === null) return;
                          e.preventDefault();
                          e.dataTransfer.dropEffect = "move";
                          const rect = e.currentTarget.getBoundingClientRect();
                          setDropAt(e.clientY < rect.top + rect.height / 2 ? i : i + 1);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (dragFrom !== null && dropAt !== null) {
                            moveStop(dragFrom, dropAt > dragFrom ? dropAt - 1 : dropAt);
                          }
                          endDrag();
                        }}
                      >
                        {showDropBefore ? <DropLine position="top" /> : null}
                        {showDropAfter ? <DropLine position="bottom" /> : null}

                        <div className="flex items-center gap-1 p-1.5">
                          <button
                            type="button"
                            draggable
                            onDragStart={(e) => {
                              const row = e.currentTarget.closest("li");
                              if (row) e.dataTransfer.setDragImage(row, 24, 28);
                              e.dataTransfer.effectAllowed = "move";
                              e.dataTransfer.setData("text/plain", String(i));
                              setDragFrom(i);
                            }}
                            onDragEnd={endDrag}
                            onKeyDown={(e) => {
                              if (e.key === "ArrowUp") {
                                e.preventDefault();
                                moveStop(i, i - 1);
                              } else if (e.key === "ArrowDown") {
                                e.preventDefault();
                                moveStop(i, i + 1);
                              }
                            }}
                            className="w-9 h-12 shrink-0 flex items-center justify-center rounded-xl text-on-surface-variant hover:bg-surface-container-high cursor-grab active:cursor-grabbing"
                            aria-label={`Mudar a ordem: ${streetName(stop.street)}. Arraste, ou use as setas do teclado.`}
                            title="Segure e arraste para mudar a ordem"
                          >
                            <span className="material-symbols-outlined">drag_indicator</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => selectStop(i)}
                            className="flex-1 min-w-0 flex items-center gap-3 text-left py-1.5 pr-1 rounded-xl"
                            aria-expanded={isSelected}
                          >
                            <StopNumber n={i + 1} selected={isSelected} />
                            <span className="flex-1 min-w-0">
                              <span className="block text-body-md font-semibold text-on-surface truncate">
                                {streetName(stop.street)}
                              </span>
                              <span className="block text-label-lg font-normal text-on-surface-variant">
                                {stopSummary(stop)}
                              </span>
                              {i === 0 || i === stops.length - 1 ? (
                                <span className="flex flex-wrap gap-1 mt-1">
                                  {i === 0 ? <EndTag kind="start" /> : null}
                                  {i === stops.length - 1 ? <EndTag kind="end" /> : null}
                                </span>
                              ) : null}
                            </span>
                            <span className="material-symbols-outlined text-on-surface-variant shrink-0">
                              {isSelected ? "expand_less" : "tune"}
                            </span>
                          </button>

                          <button
                            className="w-11 h-11 shrink-0 flex items-center justify-center rounded-full text-on-surface-variant hover:text-error hover:bg-error-container/50 transition-colors"
                            onClick={() => removeStop(i)}
                            type="button"
                            aria-label={`Tirar ${streetName(stop.street)} da rota`}
                            title="Tirar da rota"
                          >
                            <span className="material-symbols-outlined text-[22px]">delete</span>
                          </button>
                        </div>

                        {isSelected ? (
                          <StopEditor
                            stop={stop}
                            index={i}
                            count={stops.length}
                            onChange={(patch) => updateStop(i, patch)}
                            onMove={(to) => moveStop(i, to)}
                            onClose={() => setSelectedStop(null)}
                          />
                        ) : null}
                      </li>
                    );
                  })}
                </ol>
              </>
            )}

            {previewSegments.length > stops.length ? (
              <details className="group bg-surface-container-lowest rounded-2xl">
                <summary className="flex items-center gap-2 cursor-pointer list-none px-4 py-3 text-label-lg text-on-surface">
                  <span className="material-symbols-outlined text-[20px] text-primary">alt_route</span>
                  <span className="flex-1">Ver todas as ruas do caminho ({previewSegments.length})</span>
                  <span className="material-symbols-outlined text-on-surface-variant group-open:rotate-180 transition-transform">
                    expand_more
                  </span>
                </summary>
                <ol className="flex flex-col gap-1.5 max-h-64 overflow-y-auto px-4 pb-4">
                  {previewSegments.map((seg, i) => (
                    <li key={`${seg.streetId}-${i}`} className="flex items-center gap-2 text-body-md">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ background: seg.isStop ? ROUTE_COLORS.collect : ROUTE_COLORS.pass }}
                        aria-hidden="true"
                      />
                      <span className={`truncate ${seg.isStop ? "text-on-surface font-semibold" : "text-on-surface-variant"}`}>
                        {seg.name ?? "Rua sem nome"}
                      </span>
                      <span className="ml-auto text-label-lg font-normal text-on-surface-variant shrink-0">
                        {seg.isStop ? "coleta" : "só passa"}
                      </span>
                    </li>
                  ))}
                </ol>
              </details>
            ) : null}
          </section>

          <section className="flex flex-col gap-4">
            <StepTitle n={3} title="Caminhão e horário" />

            <div className="flex flex-col gap-1.5">
              <label className="text-label-lg text-on-surface" htmlFor="vehicleId">
                Qual caminhão faz esta rota?
              </label>
              <select
                className="h-12 bg-surface-container-lowest text-on-surface text-body-md rounded-xl px-3 border-2 border-transparent focus:outline-none focus:border-primary"
                id="vehicleId"
                name="vehicleId"
                defaultValue={initial?.vehicleId ?? ""}
                required
              >
                <option value="">Escolha um veículo...</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.plate ?? "Sem placa"}
                    {v.model ? ` · ${v.model}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <fieldset className="flex flex-col gap-1.5">
              <legend className="text-label-lg text-on-surface mb-1.5">Em quais dias?</legend>
              <div className="flex flex-wrap gap-2">
                {DAYS_OF_WEEK.map((day) => {
                  const on = days.includes(day.value);
                  return (
                    <button
                      key={day.value}
                      className={`min-w-12 px-3 h-11 rounded-full text-label-lg transition-colors border-2 ${
                        on
                          ? "bg-primary text-on-primary border-primary"
                          : "bg-surface-container-lowest text-on-surface-variant border-outline-variant hover:border-primary"
                      }`}
                      onClick={() => toggleDay(day.value)}
                      type="button"
                      aria-pressed={on}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-label-lg text-on-surface" htmlFor="shift">
                  Turno
                </label>
                <select
                  className="h-12 bg-surface-container-lowest text-on-surface text-body-md rounded-xl px-3 border-2 border-transparent focus:outline-none focus:border-primary"
                  id="shift"
                  name="shift"
                  defaultValue={initial?.shift ?? ""}
                  required
                >
                  <option value="">Escolha...</option>
                  {SHIFTS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-label-lg text-on-surface" htmlFor="startTime">
                  Hora de saída
                </label>
                <input
                  className="h-12 bg-surface-container-lowest text-on-surface text-body-md rounded-xl px-3 border-2 border-transparent focus:outline-none focus:border-primary"
                  id="startTime"
                  name="startTime"
                  type="time"
                  defaultValue={initial?.startTime ?? ""}
                  required
                />
              </div>
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-2 p-5 pt-4 border-t border-outline-variant/60">
          {state.error ? (
            <p className="flex items-center gap-2 text-error text-label-lg" role="alert">
              <span className="material-symbols-outlined text-[20px]">error</span>
              {state.error}
            </p>
          ) : stops.length === 0 ? (
            <p className="text-label-lg font-normal text-on-surface-variant text-center">
              Marque pelo menos uma rua no mapa para salvar.
            </p>
          ) : null}
          <button
            className="w-full h-14 flex items-center justify-center gap-2 bg-primary text-on-primary text-action-lg rounded-full shadow-md shadow-primary/20 hover:bg-primary-container transition-colors disabled:opacity-60 disabled:shadow-none"
            disabled={pending || stops.length === 0}
            type="submit"
          >
            <span className={`material-symbols-outlined ${pending ? "animate-spin" : ""}`}>
              {pending ? "progress_activity" : "check_circle"}
            </span>
            {pending ? "Salvando..." : initial?.routeId ? "Salvar alterações" : "Salvar rota"}
          </button>
        </div>
      </aside>

      {undo ? (
        <div
          role="status"
          className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-[1100] flex items-center gap-3 bg-inverse-surface text-inverse-on-surface rounded-2xl pl-5 pr-2 py-2 shadow-xl max-w-[calc(100vw-32px)]"
        >
          <span className="text-body-md">{undo.message}</span>
          <button
            type="button"
            onClick={undoLast}
            className="flex items-center gap-1 h-11 px-4 rounded-xl text-label-lg text-inverse-primary hover:bg-white/10 shrink-0"
          >
            <span className="material-symbols-outlined text-[20px]">undo</span>
            Desfazer
          </button>
        </div>
      ) : null}
    </form>
  );
}

function StepTitle({ n, title }: { n: number; title: string }) {
  return (
    <h2 className="flex items-center gap-2.5 text-title-lg text-on-surface">
      <span className="w-8 h-8 rounded-full bg-primary text-on-primary text-label-lg flex items-center justify-center shrink-0">
        {n}
      </span>
      {title}
    </h2>
  );
}

function ModeButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center gap-2 h-11 px-4 rounded-full text-label-lg transition-colors ${
        active ? "bg-primary text-on-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface"
      }`}
    >
      <span className="material-symbols-outlined text-[20px]">{icon}</span>
      {label}
    </button>
  );
}

/** The same numbered disc as on the map, so list and map read as one. */
function StopNumber({ n, selected }: { n: number; selected: boolean }) {
  return (
    <span
      className="w-8 h-8 rounded-full flex items-center justify-center text-label-lg font-bold shrink-0"
      style={{
        border: `3px solid ${ROUTE_COLORS.collect}`,
        background: selected ? ROUTE_COLORS.collect : "#ffffff",
        color: selected ? "#ffffff" : "#1f1720",
      }}
    >
      {n}
    </span>
  );
}

function EndTag({ kind }: { kind: "start" | "end" }) {
  const start = kind === "start";
  return (
    <span
      className="inline-flex items-center gap-0.5 rounded-full pl-1 pr-2 h-6 text-[12px] font-semibold text-white"
      style={{ background: start ? ROUTE_COLORS.start : ROUTE_COLORS.end }}
    >
      <span className="material-symbols-outlined text-[16px]">{start ? "play_arrow" : "sports_score"}</span>
      {start ? "Começa aqui" : "Termina aqui"}
    </span>
  );
}

function DropLine({ position }: { position: "top" | "bottom" }) {
  return (
    <span
      aria-hidden="true"
      className={`absolute left-2 right-2 h-1 rounded-full bg-primary pointer-events-none ${
        position === "top" ? "-top-[7px]" : "-bottom-[7px]"
      }`}
    />
  );
}

function RouteSummary({
  stopCount,
  distance,
  first,
  last,
}: {
  stopCount: number;
  distance: string;
  first: string;
  last: string;
}) {
  return (
    <div className="bg-surface-container-lowest rounded-2xl p-4 flex flex-col gap-3 shadow-sm">
      <div className="flex gap-6">
        <div>
          <p className="text-headline-lg text-on-surface">{stopCount}</p>
          <p className="text-label-lg font-normal text-on-surface-variant">{stopCount === 1 ? "parada" : "paradas"}</p>
        </div>
        <div>
          <p className="text-headline-lg text-on-surface">{distance}</p>
          <p className="text-label-lg font-normal text-on-surface-variant">de caminho no total</p>
        </div>
      </div>
      <div className="flex flex-col gap-1.5 text-body-md">
        <p className="flex items-center gap-2 min-w-0">
          <span className="w-3 h-3 rounded-full shrink-0" style={{ background: ROUTE_COLORS.start }} aria-hidden="true" />
          <span className="text-on-surface-variant shrink-0">Começa:</span>
          <span className="font-semibold text-on-surface truncate">{first}</span>
        </p>
        <p className="flex items-center gap-2 min-w-0">
          <span className="w-3 h-3 rounded-full shrink-0" style={{ background: ROUTE_COLORS.end }} aria-hidden="true" />
          <span className="text-on-surface-variant shrink-0">Termina:</span>
          <span className="font-semibold text-on-surface truncate">{last}</span>
        </p>
      </div>
    </div>
  );
}

/** A road seen from above with the truck driving up it; the collected side(s) in orange. */
function SideIcon({ side }: { side: CollectionSide }) {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" aria-hidden="true">
      <rect x="11" y="2" width="14" height="32" rx="3" fill="#8e99a8" />
      <path d="M18 9 L23 19 L18 16.5 L13 19 Z" fill="#ffffff" />
      {side !== "right" ? <rect x="4" y="2" width="4.5" height="32" rx="2.25" fill={ROUTE_COLORS.collect} /> : null}
      {side !== "left" ? <rect x="27.5" y="2" width="4.5" height="32" rx="2.25" fill={ROUTE_COLORS.collect} /> : null}
    </svg>
  );
}

function StopEditor({
  stop,
  index,
  count,
  onChange,
  onMove,
  onClose,
}: {
  stop: StopDraft;
  index: number;
  count: number;
  onChange: (patch: Partial<Omit<StopDraft, "street">>) => void;
  onMove: (to: number) => void;
  onClose: () => void;
}) {
  const lengthMeters = lineLengthMeters(stop.street.line);
  const collectedMeters = Math.round((stop.endFraction - stop.startFraction) * lengthMeters);

  return (
    <div className="flex flex-col gap-5 px-4 pb-4 pt-2 border-t border-outline-variant/40">
      <div className="flex flex-col gap-2">
        <span className="text-label-lg text-on-surface">De que lado da rua é a coleta?</span>
        <div className="grid grid-cols-3 gap-2">
          {SIDE_OPTIONS.map((opt) => {
            const on = stop.side === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange({ side: opt.value })}
                aria-pressed={on}
                className={`flex flex-col items-center gap-1 rounded-xl py-2.5 px-1 text-label-lg border-2 transition-colors ${
                  on
                    ? "border-primary bg-primary-fixed text-on-primary-fixed"
                    : "border-outline-variant bg-surface text-on-surface-variant hover:border-primary"
                }`}
              >
                <SideIcon side={opt.value} />
                {opt.label}
              </button>
            );
          })}
        </div>
        <p className="text-label-lg font-normal text-on-surface-variant">
          Esquerda e direita de quem está dirigindo o caminhão, no sentido das setas brancas em cima da rua no mapa.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-label-lg text-on-surface">Quanto da rua?</span>
        <p className="text-body-md text-on-surface">
          {isWholeStretch(stop)
            ? `O quarteirão todo (${Math.round(lengthMeters)} m)`
            : `Só ${collectedMeters} m dos ${Math.round(lengthMeters)} m do quarteirão`}
        </p>
        <p className="text-label-lg font-normal text-on-surface-variant">
          Para coletar só um pedaço, arraste as bolinhas brancas nas pontas da linha laranja no mapa.
        </p>
        {!isWholeStretch(stop) ? (
          <button
            type="button"
            onClick={() => onChange({ startFraction: 0, endFraction: 1 })}
            className="self-start flex items-center gap-1 h-10 text-label-lg text-primary hover:underline"
          >
            <span className="material-symbols-outlined text-[18px]">restart_alt</span>
            Voltar para o quarteirão todo
          </button>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-label-lg text-on-surface">Ordem na rota</span>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onMove(index - 1)}
            disabled={index === 0}
            className="flex items-center justify-center gap-1 h-11 rounded-xl border-2 border-outline-variant bg-surface text-label-lg text-on-surface hover:border-primary disabled:opacity-40 disabled:hover:border-outline-variant"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_upward</span>
            Vir antes
          </button>
          <button
            type="button"
            onClick={() => onMove(index + 1)}
            disabled={index === count - 1}
            className="flex items-center justify-center gap-1 h-11 rounded-xl border-2 border-outline-variant bg-surface text-label-lg text-on-surface hover:border-primary disabled:opacity-40 disabled:hover:border-outline-variant"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_downward</span>
            Vir depois
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="h-11 rounded-full bg-primary text-on-primary text-label-lg hover:bg-primary-container transition-colors"
      >
        Pronto
      </button>
    </div>
  );
}
