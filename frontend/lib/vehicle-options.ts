import type { VehicleType } from "./types";

export const VEHICLE_TYPES: { value: VehicleType; label: string; icon: string }[] = [
  { value: "caminhao", label: "Caminhão", icon: "local_shipping" },
  { value: "bicicleta", label: "Bicicleta", icon: "pedal_bike" },
];

export const VEHICLE_COLORS: { value: string; label: string; hex: string }[] = [
  { value: "branco", label: "Branco", hex: "#F5F5F5" },
  { value: "preto", label: "Preto", hex: "#212121" },
  { value: "cinza", label: "Cinza", hex: "#9E9E9E" },
  { value: "prata", label: "Prata", hex: "#BDBDBD" },
  { value: "azul", label: "Azul", hex: "#1E88E5" },
  { value: "verde", label: "Verde", hex: "#43A047" },
  { value: "amarelo", label: "Amarelo", hex: "#FDD835" },
  { value: "laranja", label: "Laranja", hex: "#FB8C00" },
  { value: "vermelho", label: "Vermelho", hex: "#E53935" },
  { value: "roxo", label: "Roxo", hex: "#8E24AA" },
];

const DEFAULT_COLOR_HEX = "#43A047";

export function vehicleColorHex(color: string | null | undefined): string {
  return VEHICLE_COLORS.find((c) => c.value === color)?.hex ?? DEFAULT_COLOR_HEX;
}

export function vehicleTypeIcon(type: string | null | undefined): string {
  return VEHICLE_TYPES.find((t) => t.value === type)?.icon ?? "local_shipping";
}

export function vehicleTypeLabel(type: string | null | undefined): string {
  return VEHICLE_TYPES.find((t) => t.value === type)?.label ?? "Caminhão";
}

export function vehicleColorLabel(color: string | null | undefined): string | null {
  return VEHICLE_COLORS.find((c) => c.value === color)?.label ?? color ?? null;
}

function hexLuminance(hex: string): number {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16) / 255;
  const g = parseInt(c.substring(2, 4), 16) / 255;
  const b = parseInt(c.substring(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Light marker fills (branco, amarelo, prata...) need a dark glyph to stay readable.
export function vehicleIconTextColor(color: string | null | undefined): string {
  return hexLuminance(vehicleColorHex(color)) > 0.6 ? "#1F1F1F" : "#FFFFFF";
}
