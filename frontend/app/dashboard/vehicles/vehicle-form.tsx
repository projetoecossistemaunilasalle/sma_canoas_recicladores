"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { createVehicleAction, updateVehicleAction, type VehicleFormState } from "./actions";
import type { Cooperative, Vehicle, VehicleType } from "@/lib/types";
import {
  VEHICLE_COLORS,
  VEHICLE_TYPES,
  vehicleColorHex,
  vehicleIconTextColor,
  vehicleTypeIcon,
} from "@/lib/vehicle-options";

const initialState: VehicleFormState = {};

export function VehicleForm({
  vehicle,
  cooperatives,
}: {
  vehicle?: Vehicle;
  cooperatives?: Cooperative[];
}) {
  const action = vehicle ? updateVehicleAction.bind(null, vehicle.id) : createVehicleAction;
  const [state, formAction, pending] = useActionState(action, initialState);

  const [plate, setPlate] = useState(vehicle?.plate ?? "");
  const [model, setModel] = useState(vehicle?.model ?? "");
  const [type, setType] = useState<VehicleType>(vehicle?.type ?? "caminhao");
  const [color, setColor] = useState(vehicle?.color ?? "");
  const [active, setActive] = useState(vehicle?.active ?? true);
  const cooperativeName = cooperatives?.find((c) => c.id === vehicle?.cooperativeId)?.name;

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      <form
        action={formAction}
        className="flex-1 w-full flex flex-col gap-6 bg-surface-container rounded-2xl p-6 sm:p-8 shadow-sm"
      >
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-label-lg text-on-surface-variant" htmlFor="plate">
              Placa
            </label>
            <input
              className="bg-surface-container-highest text-on-surface rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary uppercase"
              id="plate"
              name="plate"
              placeholder="ABC1D23"
              value={plate}
              onChange={(e) => setPlate(e.target.value)}
              maxLength={10}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-label-lg text-on-surface-variant" htmlFor="model">
              Modelo
            </label>
            <input
              className="bg-surface-container-highest text-on-surface rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary"
              id="model"
              name="model"
              placeholder="Ex: Fiorino"
              value={model}
              onChange={(e) => setModel(e.target.value)}
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-label-lg text-on-surface-variant" htmlFor="type">
              Tipo
            </label>
            <select
              className="bg-surface-container-highest text-on-surface rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary"
              id="type"
              name="type"
              value={type}
              onChange={(e) => setType(e.target.value as VehicleType)}
            >
              {VEHICLE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-label-lg text-on-surface-variant" htmlFor="color">
              Cor
            </label>
            <select
              className="bg-surface-container-highest text-on-surface rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary"
              id="color"
              name="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
            >
              <option value="">Selecione a cor...</option>
              {VEHICLE_COLORS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {cooperatives ? (
          <div className="flex flex-col gap-2 sm:max-w-[calc(50%-0.75rem)]">
            <label className="text-label-lg text-on-surface-variant" htmlFor="cooperativeId">
              Cooperativa
            </label>
            <select
              className="bg-surface-container-highest text-on-surface rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary"
              id="cooperativeId"
              name="cooperativeId"
              defaultValue={vehicle?.cooperativeId ?? ""}
            >
              <option value="">Sem cooperativa</option>
              {cooperatives.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <label className="flex items-center gap-3 cursor-pointer select-none">
          <input
            className="w-5 h-5 rounded accent-primary"
            type="checkbox"
            name="active"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
          />
          <span className="text-label-lg text-on-surface">Veículo ativo</span>
        </label>

        {state.error ? (
          <p className="text-error text-label-lg" role="alert">
            {state.error}
          </p>
        ) : null}

        <div className="flex items-center gap-3 pt-2">
          <button
            className="flex-1 sm:flex-none sm:px-10 h-12 bg-primary text-on-primary text-action-lg rounded-full hover:bg-primary-container transition-all disabled:opacity-70"
            disabled={pending}
            type="submit"
          >
            {pending ? "Salvando..." : vehicle ? "Salvar Veículo" : "Criar Veículo"}
          </button>
          <Link
            className="h-12 px-6 flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors"
            href="/dashboard/vehicles"
          >
            Cancelar
          </Link>
        </div>
      </form>

      <aside className="w-full lg:w-80 shrink-0 flex flex-col gap-4">
        <div className="bg-surface-container rounded-2xl p-6 shadow-sm flex flex-col items-center gap-4 text-center">
          <span className="text-label-lg text-on-surface-variant uppercase tracking-wider self-start">
            Pré-visualização
          </span>
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center shadow-sm"
            style={{ backgroundColor: vehicleColorHex(color) }}
          >
            <span
              className="material-symbols-outlined text-[40px]"
              style={{ color: vehicleIconTextColor(color) }}
            >
              {vehicleTypeIcon(type)}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-title-lg text-on-surface">
              {plate.trim() ? plate.toUpperCase() : "Sem placa"}
              {model.trim() ? ` · ${model}` : ""}
            </p>
            <p className="text-body-md text-on-surface-variant">
              {VEHICLE_TYPES.find((t) => t.value === type)?.label}
              {color ? ` · ${VEHICLE_COLORS.find((c) => c.value === color)?.label}` : ""}
            </p>
            {cooperativeName ? (
              <p className="text-body-md text-on-surface-variant">{cooperativeName}</p>
            ) : null}
          </div>
          <span
            className={`text-[10px] uppercase px-2 py-0.5 rounded-full ${
              active
                ? "text-secondary bg-secondary/10"
                : "text-on-surface-variant bg-surface-variant"
            }`}
          >
            {active ? "Ativo" : "Inativo"}
          </span>
        </div>
        <p className="text-body-md text-on-surface-variant px-2">
          É assim que o veículo vai aparecer na lista e no mapa de frota.
        </p>
      </aside>
    </div>
  );
}
