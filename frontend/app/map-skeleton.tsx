/** The placeholder shown while a map's Leaflet bundle loads. */
export function MapSkeleton({ className = "w-full h-full" }: { className?: string }) {
  return <div className={`${className} rounded-xl bg-surface-container-highest animate-pulse`} />;
}
