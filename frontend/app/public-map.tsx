"use client";

import { useEffect, useMemo } from "react";
import { Marker, Tooltip, Popup, Polyline, CircleMarker, useMap, useMapEvents } from "react-leaflet";
import { BaseMap } from "./base-map";
import { computeBearing, distanceMeters } from "@/lib/geo";
import { arrowDivIcon, cooperativeIcon, homeIcon, vehicleDivIcon } from "@/lib/map-icons";
import { HouseSideHighlight } from "./street-side-line";
import type { HouseSide, LatLng, LatLngTuple, PublicVehicleSummary, PublicCooperativeSummary } from "@/lib/types";

// Places a small arrow every ~90m of real (not straight-line) distance along
// the path, pointing in the direction of travel at that point — a
// serpentine collection route can double back on the same block more than
// once, and without a direction cue the drawn line alone doesn't say which
// pass comes first.
const ARROW_SPACING_METERS = 90;

function sampleDirectionArrows(path: LatLng[]): { position: LatLng; heading: number }[] {
  if (path.length < 2) return [];
  const arrows: { position: LatLng; heading: number }[] = [];
  let distSinceLast = ARROW_SPACING_METERS;
  for (let i = 1; i < path.length; i++) {
    distSinceLast += distanceMeters(path[i - 1], path[i]);
    if (distSinceLast >= ARROW_SPACING_METERS) {
      arrows.push({ position: path[i], heading: computeBearing(path[i - 1], path[i]) });
      distSinceLast = 0;
    }
  }
  return arrows;
}

function ManualPanDetector({ onManualPan }: { onManualPan: () => void }) {
  // Only dragstart counts as "the user moved the map" — recentering via
  // setView/panTo (RecenterOnAddress, FollowTruck) never fires this event,
  // so programmatic moves never accidentally cancel follow mode.
  useMapEvents({ dragstart: onManualPan });
  return null;
}

function RecenterOnAddress({ position, zoom }: { position: { lat: number; lng: number } | null; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.setView([position.lat, position.lng], zoom);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, position?.lat, position?.lng]);
  return null;
}

function MapClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function FollowTruck({
  position,
  follow,
}: {
  position: { lat: number; lng: number } | null;
  follow: boolean;
}) {
  const map = useMap();
  useEffect(() => {
    if (position && follow) map.panTo([position.lat, position.lng], { animate: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, position?.lat, position?.lng, follow]);
  return null;
}

export interface PublicMapProps {
  addressPosition: { lat: number; lng: number } | null;
  /** Where to recenter when it changes (e.g. the searched street) — defaults to addressPosition. */
  focusPosition?: { lat: number; lng: number } | null;
  /** Set while the citizen is placing their house pin: every map tap goes here. */
  onMapClick?: (lat: number, lng: number) => void;
  /** The segment the pin landed on and the side the citizen confirmed, drawn highlighted. */
  pickedStreet?: { line: LatLngTuple[]; side: HouseSide | null } | null;
  truckPosition: { lat: number; lng: number } | null;
  truckHeading: number | null;
  vehicle: PublicVehicleSummary | null;
  followTruck: boolean;
  onManualPan: () => void;
  onResumeFollow: () => void;
  path?: LatLng[];
  stops?: { streetId: number; name: string | null; lat: number; lng: number }[];
  cooperatives?: PublicCooperativeSummary[];
}

export function PublicMap({
  addressPosition,
  focusPosition,
  onMapClick,
  pickedStreet,
  truckPosition,
  truckHeading,
  vehicle,
  followTruck,
  onManualPan,
  onResumeFollow,
  path = [],
  stops = [],
  cooperatives = [],
}: PublicMapProps) {
  const directionArrows = useMemo(() => sampleDirectionArrows(path), [path]);
  // Leaflet's SVG renderer clips/simplifies polylines against the current
  // viewport per-render for performance. In testing, that pipeline dropped
  // a real interior vertex of a path that both extends far off-screen (the
  // reconnection leg) and loops tightly within the visible area (a street
  // walked, then immediately walked back) — even with smoothFactor={0}, a
  // single long polyline still turned that into a straight line cutting
  // across a block that was never actually driven. Passing the path as many
  // independent 2-point segments (Leaflet's native multi-part Polyline)
  // leaves no "interior" for any clip/simplify pass to discard — each
  // segment is either drawn whole or dropped whole.
  const pathSegments = useMemo<[number, number][][]>(
    () => path.slice(1).map((p, i) => [[path[i].lat, path[i].lng], [p.lat, p.lng]]),
    [path]
  );

  return (
    <div className="relative w-full h-full">
      <BaseMap zoom={14} scrollWheelZoom zoomControl={false} className="w-full h-full z-0">
        <ManualPanDetector onManualPan={onManualPan} />
        {!truckPosition ? (
          // Closer in while picking, so the citizen can tell which side of the street their house is.
          <RecenterOnAddress position={focusPosition ?? addressPosition} zoom={onMapClick ? 18 : 16} />
        ) : null}
        <FollowTruck position={truckPosition} follow={followTruck} />
        {onMapClick ? <MapClickHandler onClick={onMapClick} /> : null}
        {pickedStreet ? <HouseSideHighlight line={pickedStreet.line} side={pickedStreet.side} /> : null}

        {pathSegments.length > 0 ? (
          <>
            <Polyline
              positions={pathSegments}
              pathOptions={{ color: "#ffffff", weight: 7, opacity: 0.9 }}
              smoothFactor={0}
            />
            <Polyline
              positions={pathSegments}
              pathOptions={{ color: "#6A2C91", weight: 4, opacity: 0.95 }}
              smoothFactor={0}
            />
          </>
        ) : null}

        {directionArrows.map((arrow, index) => (
          <Marker
            key={index}
            position={[arrow.position.lat, arrow.position.lng]}
            icon={arrowDivIcon(arrow.heading)}
            interactive={false}
          />
        ))}

        {stops.map((stop, index) => (
          <CircleMarker
            key={`${stop.streetId}-${index}`}
            center={[stop.lat, stop.lng]}
            radius={4}
            pathOptions={{ color: "#ffffff", weight: 2, fillColor: "#6A2C91", fillOpacity: 1 }}
          >
            {stop.name ? <Tooltip direction="top">{stop.name}</Tooltip> : null}
          </CircleMarker>
        ))}

        {cooperatives.map((coop) => (
          <Marker key={coop.id} position={[coop.lat, coop.lng]} icon={cooperativeIcon}>
            <Popup>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 160 }}>
                <strong>{coop.name}</strong>
                {coop.address ? <span>{coop.address}</span> : null}
                <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                  {coop.phone ? <a href={`tel:${coop.phone}`}>Contato</a> : null}
                  {coop.instagram ? (
                    <a href={coop.instagram} target="_blank" rel="noreferrer">
                      Instagram
                    </a>
                  ) : null}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {addressPosition ? <Marker position={[addressPosition.lat, addressPosition.lng]} icon={homeIcon} /> : null}

        {truckPosition ? (
          <Marker
            position={[truckPosition.lat, truckPosition.lng]}
            icon={vehicleDivIcon({
              color: vehicle?.color ?? null,
              type: vehicle?.type ?? "caminhao",
              heading: truckHeading,
              size: 40,
            })}
          >
            <Tooltip permanent direction="top" offset={[0, -22]} className="truck-tooltip">
              🚛 Coleta{vehicle?.plate ? ` • ${vehicle.plate}` : ""}
            </Tooltip>
          </Marker>
        ) : null}
      </BaseMap>

      {truckPosition && !followTruck ? (
        <button
          type="button"
          onClick={onResumeFollow}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-2 bg-surface-container-lowest text-on-surface text-label-lg px-4 py-2.5 rounded-full shadow-lg border border-outline-variant/40 hover:bg-surface-container-low transition-colors"
        >
          <span className="material-symbols-outlined text-[18px] text-primary">navigation</span>
          Seguir caminhão
        </button>
      ) : null}
    </div>
  );
}
