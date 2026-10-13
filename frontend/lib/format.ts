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

function dayOfWeekLabel(value: string): string {
  return DAYS_OF_WEEK.find((d) => d.value === value)?.label ?? value;
}

function shiftLabel(value: string): string {
  return SHIFTS.find((s) => s.value === value)?.label ?? value;
}

/** "Seg, Qua · Manhã · 08:00" — days in week order, whatever order they were picked in. */
export function routeScheduleLabel(route: {
  daysOfWeek: string[] | null;
  shift: string | null;
  startTime?: string | null;
}): string {
  const order = DAYS_OF_WEEK.map((d) => d.value as string);
  const days = [...(route.daysOfWeek ?? [])].sort((a, b) => order.indexOf(a) - order.indexOf(b));
  return [
    days.map(dayOfWeekLabel).join(", ") || "Sem dias",
    route.shift ? shiftLabel(route.shift) : "Sem turno",
    ...(route.startTime ? [formatTime(route.startTime)] : []),
  ].join(" · ");
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

// `isRunningNow` is the backend's schedule-based signal: today is one of the
// route's days and the time is inside its shift.
export function routeLiveStatusLabel(route: { isRunningNow: boolean }): string {
  return route.isRunningNow ? "Rodando agora" : "Agendada";
}

// ["Centro"] -> "Centro"; ["Centro", "Fátima"] -> "Centro e Fátima";
// a long avenue's 6 bairros -> "Centro, Fátima e mais 4"
export function neighborhoodsLabel(names: string[]): string {
  if (names.length <= 2) return names.join(" e ");
  return `${names.slice(0, 2).join(", ")} e mais ${names.length - 2}`;
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
