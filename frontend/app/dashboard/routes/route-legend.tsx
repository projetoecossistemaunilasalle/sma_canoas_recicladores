import { ROUTE_COLORS } from "./route-style";

function LineSwatch({ color }: { color: string }) {
  return (
    <svg width="32" height="12" viewBox="0 0 32 12" aria-hidden="true" className="shrink-0">
      <line x1="2" y1="6" x2="30" y2="6" stroke={ROUTE_COLORS.casing} strokeWidth="9" strokeLinecap="round" />
      <line x1="2" y1="6" x2="30" y2="6" stroke={color} strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

function PinSwatch({ color, icon, label }: { color: string; icon: string; label: string }) {
  return (
    <span
      className="inline-flex items-center gap-0.5 rounded-full pl-1 pr-2 h-6 text-[12px] font-semibold text-white shrink-0"
      style={{ background: color }}
      aria-hidden="true"
    >
      <span className="material-symbols-outlined text-[16px]">{icon}</span>
      {label}
    </span>
  );
}

function StopSwatch() {
  return (
    <span
      className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-[12px] font-bold text-on-surface shrink-0"
      style={{ border: `3px solid ${ROUTE_COLORS.collect}` }}
      aria-hidden="true"
    >
      1
    </span>
  );
}

function ArrowSwatch() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" className="shrink-0 rotate-90">
      <path d="M12 2 L20 20 L12 15 L4 20 Z" fill="#ffffff" stroke={ROUTE_COLORS.pass} strokeWidth="2" />
    </svg>
  );
}

/** What each color and symbol on the route map means, in plain words. */
export function RouteLegend() {
  const items = [
    { swatch: <PinSwatch color={ROUTE_COLORS.start} icon="play_arrow" label="Início" />, text: "Onde o caminhão começa" },
    { swatch: <PinSwatch color={ROUTE_COLORS.end} icon="sports_score" label="Fim" />, text: "Última parada" },
    { swatch: <LineSwatch color={ROUTE_COLORS.collect} />, text: "Rua com coleta" },
    { swatch: <LineSwatch color={ROUTE_COLORS.pass} />, text: "Só passa, sem coletar" },
    { swatch: <StopSwatch />, text: "Ordem das paradas" },
    { swatch: <ArrowSwatch />, text: "Sentido do caminhão" },
  ];

  return (
    <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/40 px-4 py-3">
      <p className="text-label-lg text-on-surface mb-2 flex items-center gap-1.5">
        <span className="material-symbols-outlined text-[18px] text-primary">info</span>
        O que cada cor significa
      </p>
      <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-4 gap-y-2">
        {items.map((item) => (
          <li key={item.text} className="flex items-center gap-2 text-body-md text-on-surface">
            <span className="w-16 flex justify-center">{item.swatch}</span>
            {item.text}
          </li>
        ))}
      </ul>
    </div>
  );
}
