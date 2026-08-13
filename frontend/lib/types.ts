export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  cooperativeId: string | null;
  address: string | null;
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

export interface Vehicle {
  id: string;
  plate: string | null;
  model: string | null;
  color: string | null;
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

export type EtaStatus = "sem_rota" | "na_rua" | "passou" | "nao_esta_na_rota" | "chegando";

export interface EtaResult {
  status: EtaStatus;
  etaSeconds: number;
  etaText: string;
  distanceKm: number;
  streetsRemaining: number;
  currentStreet: string | null;
  citizenStreet: string | null;
}
