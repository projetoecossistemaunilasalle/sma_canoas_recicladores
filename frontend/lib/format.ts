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
