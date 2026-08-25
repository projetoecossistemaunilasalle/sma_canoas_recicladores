"use client";

import type { CollectionCheckResult } from "@/lib/types";
import { formatTime, relativeTime, weekdayLabelFromOffset } from "@/lib/format";

export interface CollectionPanelProps {
  address: string;
  result: CollectionCheckResult;
  onReset: () => void;
  // Mobile bottom-sheet offset from the viewport edge — the public home has
  // nothing else docked to the bottom (bottom-0), but the citizen area has a
  // persistent tab bar the sheet needs to sit above instead of under.
  mobileBottomClass?: string;
}

function StatusRow({ dot, children }: { dot: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-body-md text-on-surface">
      <span>{dot}</span>
      <span>{children}</span>
    </div>
  );
}

export function CollectionPanel({ address, result, onReset, mobileBottomClass = "bottom-0" }: CollectionPanelProps) {
  return (
    <div
      className={`fixed inset-x-0 ${mobileBottomClass} z-[1000] rounded-t-3xl md:static md:rounded-3xl md:w-full bg-surface-container-lowest shadow-2xl border border-outline-variant/30 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="text-label-lg text-on-surface-variant">Coleta na sua rua</p>
          <p className="text-title-lg text-on-surface truncate">{address}</p>
        </div>
        <button
          type="button"
          onClick={onReset}
          aria-label="Buscar outro endereço"
          className="shrink-0 text-on-surface-variant hover:text-on-surface"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>

      {result.status === "no_route" ? (
        <div className="space-y-4">
          <p className="text-body-md text-on-surface-variant">
            Nenhuma rota de coleta encontrada para este endereço.
          </p>
          <button
            type="button"
            onClick={onReset}
            className="text-label-lg text-primary hover:underline"
          >
            Ver outro endereço
          </button>
        </div>
      ) : null}

      {result.status === "scheduled_future" ? (
        <div className="space-y-1">
          <p className="text-body-md text-on-surface-variant">Próxima coleta</p>
          <p className="text-title-lg text-on-surface capitalize">
            {weekdayLabelFromOffset(result.daysAhead)} às {formatTime(result.startTime)}
          </p>
        </div>
      ) : null}

      {result.status === "scheduled_today" ? (
        <div className="space-y-3">
          <div>
            <p className="text-body-md text-on-surface-variant">Próxima coleta</p>
            <p className="text-title-lg text-on-surface">Hoje às {formatTime(result.startTime)}</p>
          </div>
          <StatusRow dot="🟡">Aguardando passagem</StatusRow>
        </div>
      ) : null}

      {result.status === "arriving" ? (
        <div className="space-y-3">
          <div>
            <p className="text-body-md text-on-surface-variant">Previsão</p>
            <p className="text-title-lg text-on-surface">
              {result.etaStatus === "na_rua" ? "Passando agora" : `Chega em ${result.etaText}`}
            </p>
          </div>
          <StatusRow dot="🚛">Caminhão a caminho</StatusRow>
        </div>
      ) : null}

      {result.status === "passed" ? (
        <div className="space-y-1">
          <p className="text-title-lg text-on-surface">Coleta realizada</p>
          <p className="text-body-md text-on-surface-variant">
            {result.passedApproxAt
              ? `Passou por aqui ${relativeTime(result.passedApproxAt)}`
              : "O caminhão já passou pela sua rua hoje"}
          </p>
        </div>
      ) : null}
    </div>
  );
}
