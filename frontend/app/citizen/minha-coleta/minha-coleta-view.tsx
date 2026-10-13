"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PublicMapClient from "@/app/public-map-client";
import { CollectionPanel } from "@/app/collection-panel";
import { useCollectionTracking } from "@/lib/use-collection-tracking";
import { userAddressPoint } from "@/lib/address-point";
import { useProximityNotifications } from "@/lib/push";
import type { CurrentUser, Cooperative } from "@/lib/types";

export function MinhaColeta({ user, cooperatives = [] }: { user: CurrentUser; cooperatives?: Cooperative[] }) {
  const router = useRouter();
  const addressPoint = userAddressPoint(user);

  const [followTruck, setFollowTruck] = useState(true);
  const notify = useProximityNotifications(user.notifyProximity);

  const { result, truckPosition, heading, vehicle, path, stops } = useCollectionTracking(addressPoint);
  const addressPosition = addressPoint ? { lat: addressPoint.lat, lng: addressPoint.lng } : null;

  if (!addressPoint) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-8 pb-28">
        <h1 className="text-display-lg text-on-surface mb-2">Minha Coleta</h1>
        <p className="text-body-lg text-on-surface-variant mb-6">
          Cadastre seu endereço no Perfil — marcando sua casa no mapa e o lado da rua — pra acompanhar a coleta.
        </p>
        <button
          type="button"
          onClick={() => router.push("/citizen/perfil")}
          className="h-12 px-5 bg-primary text-on-primary text-action-lg rounded-xl"
        >
          Ir para o Perfil
        </button>
      </main>
    );
  }

  return (
    <div className="relative w-full h-screen pb-20">
      <PublicMapClient
        addressPosition={addressPosition}
        truckPosition={truckPosition}
        truckHeading={heading}
        vehicle={vehicle}
        followTruck={followTruck}
        onManualPan={() => setFollowTruck(false)}
        onResumeFollow={() => setFollowTruck(true)}
        path={path}
        stops={stops}
        cooperatives={cooperatives.map((c) => ({
          id: c.id,
          name: c.name,
          address: c.address,
          phone: c.phone,
          instagram: c.instagram,
          lat: c.lat as number,
          lng: c.lng as number,
        }))}
      />

      <div className="absolute top-4 right-4 z-[900] flex flex-col items-end gap-2">
        <button
          type="button"
          onClick={notify.toggle}
          disabled={notify.pending}
          className="flex items-center gap-2 bg-surface-container-lowest rounded-2xl shadow-lg border border-outline-variant/30 px-4 py-2.5 text-label-lg text-on-surface disabled:opacity-60"
        >
          <span className="material-symbols-outlined text-[20px] text-primary">
            {notify.on ? "notifications_active" : "notifications"}
          </span>
          Avisar proximidade
        </button>
        {notify.error ? (
          <p className="text-error text-label-lg bg-surface-container-lowest rounded-xl px-3 py-1.5 shadow-md max-w-[220px] text-right">
            {notify.error}
          </p>
        ) : null}
      </div>

      {result ? (
        <div className="absolute top-4 left-4 z-[900] w-full max-w-sm">
          <CollectionPanel
            address={user.address ?? "Meu endereço"}
            result={result}
            onReset={() => router.push("/citizen/perfil")}
            mobileBottomClass="bottom-20"
          />
        </div>
      ) : null}
    </div>
  );
}
