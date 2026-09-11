// Small floating brand mark — deliberately not a full-width navbar (the map
// stays the dominant element). Two-line lockup (matches the sidebar treatment
// in dashboard/layout.tsx) so the full project name fits this tight pill
// without forcing extra width on narrow screens.
export function BrandHeader() {
  return (
    <div className="flex items-center gap-2 bg-surface-container-lowest rounded-2xl shadow-lg border border-outline-variant/30 px-4 py-2.5">
      <span className="material-symbols-outlined text-primary text-[24px]">recycling</span>
      <div className="flex flex-col leading-none whitespace-nowrap">
        <span className="text-title-lg text-primary tracking-tight">Canoas Recicla</span>
        <span className="text-[11px] text-secondary tracking-widest uppercase">com a Gente</span>
      </div>
    </div>
  );
}
