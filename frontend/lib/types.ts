export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  cooperativeId: string | null;
  address: string | null;
  addressLat: number | null;
  addressLng: number | null;
  notifyProximity: boolean;
}

export interface Cooperative {
  id: string;
  name: string;
  cnpj: string | null;
  phone: string | null;
  address: string | null;
  instagram: string | null;
  website: string | null;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type VehicleType = "caminhao" | "bicicleta";

export interface Vehicle {
  id: string;
  plate: string | null;
  model: string | null;
  color: string | null;
  type: VehicleType;
  cooperativeId: string | null;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface VehiclePosition {
  id: string;
  vehicleId: string;
  location: string; // WKT, e.g. "POINT(lng lat)"
  recordedAt: string;
}

export type DayOfWeek = "seg" | "ter" | "qua" | "qui" | "sex" | "sab" | "dom";
export type Shift = "manha" | "tarde" | "noite";

export interface CollectionRoute {
  id: string;
  vehicleId: string | null;
  cooperativeId: string | null;
  status: string;
  totalDistanceKm: number | null;
  totalDurationSeconds: number | null;
  scheduledDate: string | null;
  daysOfWeek: DayOfWeek[] | null;
  shift: Shift | null;
  startTime: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt?: string;
}

export interface Street {
  id: number;
  name: string | null;
  geom: string; // WKT LineString
  highwayType: string | null;
  requiresCollection: boolean | null;
  lengthKm: number | null;
  source: number | null;
  target: number | null;
}

export interface RouteStreet {
  id: string;
  routeId: string;
  streetId: number;
  stopOrder: number;
  direction: string;
  distanceFromPreviousKm: number | null;
  durationFromPreviousSeconds: number | null;
}

export interface RoutePreviewSegment {
  streetId: number;
  isStop: boolean;
  name: string | null;
  geom: string;
}

export interface RouteStop {
  streetId: number;
  stopOrder: number;
  name: string | null;
  geom: string; // WKT LineString
}

// Public home (unauthenticated) tracking — see backend/src/routes/public-tracking.

export interface GeocodeResult {
  label: string;
  lat: number;
  lng: number;
}

export interface PublicVehicleSummary {
  id: string;
  plate: string | null;
  model: string | null;
  color: string | null;
  type: VehicleType;
}

export interface PublicVehiclePosition {
  lat: number;
  lng: number;
  recordedAt: string;
}

export interface LatLng {
  lat: number;
  lng: number;
}

export type CollectionCheckResult =
  | { status: "no_route"; street?: string | null }
  | {
      status: "scheduled_future";
      street: string | null;
      daysAhead: number;
      startTime: string;
      vehicle: PublicVehicleSummary;
    }
  | {
      status: "scheduled_today";
      street: string | null;
      startTime: string;
      vehicle: PublicVehicleSummary;
    }
  | {
      status: "arriving";
      street: string | null;
      etaStatus: "na_rua" | "chegando";
      etaSeconds: number;
      etaText: string;
      distanceKm: number;
      vehicle: PublicVehicleSummary;
      position: PublicVehiclePosition | null;
      path: LatLng[];
      stops: { streetId: number; name: string | null; lat: number; lng: number }[];
    }
  | {
      status: "passed";
      street: string | null;
      vehicle: PublicVehicleSummary;
      passedApproxAt: string | null;
    };
