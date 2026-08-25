// Small floating brand mark — deliberately not a full-width navbar (the map
// stays the dominant element). Mirrors the logo treatment already used on
// the login page (icon "recycling" + "Canoas Coleta+") for consistency.
export function BrandHeader() {
  return (
    <div className="flex items-center gap-2 bg-surface-container-lowest rounded-2xl shadow-lg border border-outline-variant/30 px-4 py-2.5">
      <span className="material-symbols-outlined text-primary text-[24px]">recycling</span>
      <span className="text-title-lg text-primary tracking-tight whitespace-nowrap">Canoas Coleta+</span>
    </div>
  );
}
