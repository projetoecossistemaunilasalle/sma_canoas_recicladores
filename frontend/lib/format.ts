import type { DayOfWeek, Shift } from "./types";

export const DAYS_OF_WEEK: { value: DayOfWeek; label: string }[] = [
  { value: "seg", label: "Seg" },
  { value: "ter", label: "Ter" },
  { value: "qua", label: "Qua" },
  { value: "qui", label: "Qui" },
  { value: "sex", label: "Sex" },
  { value: "sab", label: "Sáb" },
  { value: "dom", label: "Dom" },
];

export const SHIFTS: { value: Shift; label: string }[] = [
  { value: "manha", label: "Manhã" },
  { value: "tarde", label: "Tarde" },
  { value: "noite", label: "Noite" },
];

export function dayOfWeekLabel(value: string): string {
  return DAYS_OF_WEEK.find((d) => d.value === value)?.label ?? value;
}

export function shiftLabel(value: string): string {
  return SHIFTS.find((s) => s.value === value)?.label ?? value;
}

export function parseWktPoint(wkt: string): { lat: number; lng: number } | null {
  const match = /POINT\(\s*(-?[\d.]+)\s+(-?[\d.]+)\s*\)/i.exec(wkt);
  if (!match) return null;
  const [, lng, lat] = match;
  return { lat: Number(lat), lng: Number(lng) };
}

export function parseWktLineString(wkt: string): [number, number][] {
  const match = /LINESTRING\(([^)]+)\)/i.exec(wkt);
  if (!match) return [];
  return match[1]
    .split(",")
    .map((pair) => {
      const [lng, lat] = pair.trim().split(/\s+/).map(Number);
      return [lat, lng] as [number, number];
    })
    .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng));
}

export function relativeTime(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const diffMin = Math.round(diffMs / 60_000);
  if (diffMin < 1) return "agora mesmo";
  if (diffMin < 60) return `há ${diffMin} min`;
  const diffHours = Math.round(diffMin / 60);
  if (diffHours < 24) return `há ${diffHours}h`;
  const diffDays = Math.round(diffHours / 24);
  return `há ${diffDays}d`;
}

const routeStatusLabels: Record<string, string> = {
  planned: "Planejada",
  active: "Em andamento",
  completed: "Concluída",
  cancelled: "Cancelada",
};

export function routeStatusLabel(status: string): string {
  return routeStatusLabels[status] ?? status;
}

// Every route sits at status "active" from creation onward (there's no
// start/stop action in this app), so routeStatusLabel("active") alone reads
// as "Em andamento" for routes that aren't actually running right now —
// the same ambiguity as the raw status. Callers with `isRunningNow` (the
// backend's real schedule-based signal) should use this instead so only the
// route genuinely running now gets that label.
export function routeLiveStatusLabel(route: { status: string; isRunningNow: boolean }): string {
  if (route.isRunningNow) return "Rodando agora";
  if (route.status === "active") return "Agendada";
  return routeStatusLabel(route.status);
}

// "09:12:00" -> "09:12"
export function formatTime(time: string): string {
  return time.slice(0, 5);
}

const WEEKDAY_FULL = [
  "domingo",
  "segunda-feira",
  "terça-feira",
  "quarta-feira",
  "quinta-feira",
  "sexta-feira",
  "sábado",
];

// Display-only label for "how many days from today" — the authoritative
// scheduling decision (daysAhead) already comes from the backend using
// Postgres's clock; this just picks a human day name for it.
export function weekdayLabelFromOffset(daysAhead: number): string {
  if (daysAhead === 1) return "amanhã";
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return WEEKDAY_FULL[d.getDay()];
}
