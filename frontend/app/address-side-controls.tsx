"use client";

import type { AddressPinState } from "@/lib/use-address-pin";

/**
 * The text + buttons under/over the map that walk the citizen from "street
 * searched" to "house pinned, side confirmed". Shared by the profile
 * form (AddressPicker) and the public home's big map.
 */
export function AddressSideControls({ state }: { state: AddressPinState }) {
  const { search, pin, street, side, resolving, error, flipSide } = state;
  if (!search) return null;

  if (!pin) {
    return (
      <Hint icon="touch_app">
        Agora toque no mapa <strong>em cima da sua casa</strong> (não no meio da rua).
      </Hint>
    );
  }
  if (resolving) return <Hint icon="progress_activity">Conferindo a rua…</Hint>;
  if (error) return <p className="text-label-lg text-error">{error}</p>;
  if (!street) return null;

  const streetName = street.name ?? "Rua sem nome";

  if (!side) {
    return (
      <div className="flex flex-col gap-2">
        <Hint icon="help">
          O marcador ficou no meio da <strong>{streetName}</strong>, então não dá pra saber de que lado fica sua
          casa. Toque de novo em cima da casa, ou escolha o lado:
        </Hint>
        <button
          type="button"
          onClick={flipSide}
          className="self-start h-9 px-4 rounded-full bg-surface-container-highest text-label-lg text-on-surface"
        >
          Escolher o lado
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Hint icon="home">
        Sua casa fica na <strong>{streetName}</strong>, no lado marcado em roxo no mapa.
      </Hint>
      <button
        type="button"
        onClick={flipSide}
        className="self-start flex items-center gap-1.5 h-9 px-4 rounded-full bg-surface-container-highest text-label-lg text-on-surface"
      >
        <span className="material-symbols-outlined text-[18px]">swap_horiz</span>
        Minha casa fica do outro lado
      </button>
    </div>
  );
}

function Hint({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2 text-body-md text-on-surface-variant">
      <span className="material-symbols-outlined text-[18px] text-primary mt-0.5 shrink-0">{icon}</span>
      <span>{children}</span>
    </p>
  );
}
