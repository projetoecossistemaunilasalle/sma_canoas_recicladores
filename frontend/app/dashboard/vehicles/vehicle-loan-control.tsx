"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { loanVehicleAction, returnVehicleLoanAction, type LoanFormState } from "./actions";
import type { Cooperative, ConflictingRoute, Vehicle } from "@/lib/types";

const initialLoanState: LoanFormState = {};

export function VehicleLoanControl({
  vehicle,
  lendTargets,
  borrowerName,
}: {
  vehicle: Vehicle;
  lendTargets: Cooperative[];
  borrowerName?: string;
}) {
  const isLoaned = Boolean(vehicle.loanedToCooperativeId);

  const dialogRef = useRef<HTMLDialogElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  const [cooperativeId, setCooperativeId] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [loanedAtOpen, setLoanedAtOpen] = useState(isLoaned);
  const [unlinkedRoutes, setUnlinkedRoutes] = useState<ConflictingRoute[]>([]);
  const headingId = useId();
  const selectId = useId();

  const action = loanedAtOpen ? returnVehicleLoanAction.bind(null, vehicle.id) : loanVehicleAction.bind(null, vehicle.id);
  const [state, formAction, pending] = useActionState(action, initialLoanState);

  const showSuccess = attempted && state.success;
  const showConflict = attempted && !state.success && (state.conflictRoutes?.length ?? 0) > 0;
  const showError = attempted && !state.success && !showConflict && Boolean(state.error);

  if (showConflict && state.conflictRoutes && state.conflictRoutes !== unlinkedRoutes) {
    setUnlinkedRoutes(state.conflictRoutes);
  }

  useEffect(() => {
    if ((showConflict || showSuccess) && alertRef.current) {
      alertRef.current.focus();
    }
  }, [showConflict, showSuccess]);

  function openDialog() {
    setLoanedAtOpen(isLoaned);
    setAttempted(false);
    setCooperativeId("");
    setUnlinkedRoutes([]);
    dialogRef.current?.showModal();
  }

  function closeDialog() {
    dialogRef.current?.close();
  }

  function handleDialogClose() {
    setAttempted(false);
    setCooperativeId("");
    setUnlinkedRoutes([]);
  }

  return (
    <>
      <button
        className={`flex items-center gap-1.5 px-3 h-10 rounded-full text-label-lg transition-colors shrink-0 ${
          isLoaned
            ? "bg-error-container text-on-error-container hover:opacity-90"
            : "bg-secondary-container text-on-secondary-container hover:opacity-90"
        }`}
        onClick={openDialog}
        type="button"
        aria-haspopup="dialog"
      >
        <span className="material-symbols-outlined text-[18px]">
          {isLoaned ? "assignment_return" : "sync_alt"}
        </span>
        {isLoaned ? "Devolver empréstimo" : "Emprestar"}
      </button>

      <dialog
        ref={dialogRef}
        onClose={handleDialogClose}
        aria-labelledby={headingId}
        className="bg-surface-container-lowest text-on-surface rounded-2xl p-0 shadow-lg backdrop:bg-black/50 max-w-md w-[calc(100%-2rem)] m-auto"
      >
        {showSuccess ? (
          <div className="p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-[28px]" aria-hidden="true">
                check_circle
              </span>
              <h2 id={headingId} className="text-title-lg text-on-surface" ref={alertRef} tabIndex={-1}>
                {loanedAtOpen ? "Empréstimo encerrado" : "Veículo emprestado"}
              </h2>
            </div>
            <p className="text-body-md text-on-surface-variant" role="status">
              {loanedAtOpen
                ? "O veículo voltou a ficar disponível apenas para a sua cooperativa."
                : "O veículo já aparece na frota da cooperativa que recebeu o empréstimo."}
              {unlinkedRoutes.length > 0
                ? ` Ele foi removido ${unlinkedRoutes.length > 1 ? "das rotas" : "da rota"}: ${unlinkedRoutes
                    .map((r) => r.label)
                    .join(", ")}.`
                : ""}
            </p>
            <button
              className="self-end px-5 h-11 bg-primary text-on-primary text-action-lg rounded-full hover:bg-primary-container transition-colors"
              onClick={closeDialog}
              type="button"
            >
              Fechar
            </button>
          </div>
        ) : (
          <form action={formAction} onSubmit={() => setAttempted(true)} className="p-6 flex flex-col gap-4">
            <h2 id={headingId} className="text-title-lg text-on-surface">
              {loanedAtOpen ? "Devolver empréstimo" : "Emprestar veículo"}
            </h2>

            {!loanedAtOpen ? (
              <p className="text-body-md text-on-surface-variant">
                {vehicle.plate ?? "Este veículo"} passa a aparecer também na frota da cooperativa escolhida, até
                você encerrar o empréstimo.
              </p>
            ) : (
              <p className="text-body-md text-on-surface-variant">
                Encerrar o empréstimo remove {vehicle.plate ?? "o veículo"} da frota de{" "}
                {borrowerName ?? "outra cooperativa"} e ele volta a ficar disponível só para a sua.
              </p>
            )}

            {!loanedAtOpen && !showConflict ? (
              <div className="flex flex-col gap-2">
                <label className="text-label-lg text-on-surface-variant" htmlFor={selectId}>
                  Cooperativa de destino
                </label>
                <select
                  className="bg-surface-container-highest text-on-surface rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary"
                  id={selectId}
                  name="cooperativeId"
                  value={cooperativeId}
                  onChange={(e) => setCooperativeId(e.target.value)}
                  required
                >
                  <option value="">Selecione uma cooperativa...</option>
                  {lendTargets.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {lendTargets.length === 0 ? (
                  <p className="text-label-lg text-on-surface-variant">
                    Não há outra cooperativa ativa cadastrada para emprestar este veículo.
                  </p>
                ) : null}
              </div>
            ) : null}

            {showConflict ? (
              <div
                ref={alertRef}
                role="alert"
                tabIndex={-1}
                className="bg-error-container text-on-error-container rounded-xl p-4 flex flex-col gap-2"
              >
                <p className="text-label-lg font-semibold flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                    warning
                  </span>
                  Este veículo está em {state.conflictRoutes!.length > 1 ? "rotas ativas" : "uma rota ativa"}
                </p>
                <p className="text-body-md">
                  {loanedAtOpen ? "Devolver o empréstimo" : "Emprestar o veículo"} vai remover{" "}
                  {state.conflictRoutes!.length > 1 ? "essas rotas" : "essa rota"} do veículo:
                </p>
                <ul className="list-disc list-inside text-body-md">
                  {state.conflictRoutes!.map((r) => (
                    <li key={r.id}>{r.label}</li>
                  ))}
                </ul>
                <p className="text-body-md">
                  Prefere manter a rota como está? Cancele e escolha outro veículo para emprestar.
                </p>
                {!loanedAtOpen ? <input type="hidden" name="cooperativeId" value={cooperativeId} /> : null}
                <input type="hidden" name="confirmUnlink" value="true" />
              </div>
            ) : null}

            {showError ? (
              <p className="text-error text-label-lg" role="alert">
                {state.error}
              </p>
            ) : null}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                className="h-11 px-5 text-on-surface-variant hover:text-on-surface transition-colors text-label-lg"
                onClick={closeDialog}
                type="button"
              >
                Cancelar
              </button>
              <button
                className="h-11 px-6 bg-primary text-on-primary text-action-lg rounded-full hover:bg-primary-container transition-all disabled:opacity-70"
                disabled={pending || (!loanedAtOpen && !showConflict && (lendTargets.length === 0 || !cooperativeId))}
                type="submit"
              >
                {pending
                  ? "Enviando..."
                  : showConflict
                    ? "Confirmar mesmo assim"
                    : loanedAtOpen
                      ? "Confirmar devolução"
                      : "Emprestar"}
              </button>
            </div>
          </form>
        )}
      </dialog>
    </>
  );
}
