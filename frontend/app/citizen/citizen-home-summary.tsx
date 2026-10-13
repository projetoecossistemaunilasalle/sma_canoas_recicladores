"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { checkCollectionForAddress } from "@/lib/public-api";
import type { AddressPoint, CollectionCheckResult } from "@/lib/types";
import { formatTime, weekdayLabelFromOffset } from "@/lib/format";

function summaryText(result: CollectionCheckResult): string {
  switch (result.status) {
    case "no_route":
      return "Nenhuma rota de coleta encontrada para o seu endereço.";
    case "other_side_only":
      return "A coleta passa na sua rua, mas só do outro lado.";
    case "scheduled_future":
      return `Próxima coleta ${weekdayLabelFromOffset(result.daysAhead)} às ${formatTime(result.startTime)}.`;
    case "scheduled_today":
      return `Coleta hoje às ${formatTime(result.startTime)}.`;
    case "arriving":
      return result.etaStatus === "na_rua"
        ? "O caminhão está passando agora!"
        : `Caminhão a caminho — chega em ${result.etaText}.`;
    case "passed":
      return "A coleta de hoje já passou pela sua rua.";
  }
}

export function CitizenHomeSummary({ point }: { point: AddressPoint }) {
  const [result, setResult] = useState<CollectionCheckResult | null>(null);
  const { lat, lng, streetId, side } = point;

  useEffect(() => {
    checkCollectionForAddress({ lat, lng, streetId, side })
      .then(setResult)
      .catch(() => setResult(null));
  }, [lat, lng, streetId, side]);

  if (!result) return null;

  return (
    <Link
      href="/citizen/minha-coleta"
      className="block bg-primary-container text-on-primary-container rounded-2xl p-5 shadow-md hover:shadow-lg transition-shadow"
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="material-symbols-outlined">local_shipping</span>
        <span className="text-label-lg">Sua coleta</span>
      </div>
      <p className="text-title-lg">{summaryText(result)}</p>
    </Link>
  );
}
