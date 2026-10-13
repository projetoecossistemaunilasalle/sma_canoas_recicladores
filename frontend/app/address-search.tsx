"use client";

import { useEffect, useRef, useState } from "react";
import { neighborhoodsLabel } from "@/lib/format";
import { geocodeAddress } from "@/lib/public-api";
import type { GeocodeResult } from "@/lib/types";

export interface AddressSearchProps {
  onSelect: (result: GeocodeResult) => void;
  onClear: () => void;
  selectedLabel: string | null;
  placeholder?: string;
}

/** "Mathias Velho · esquina com Rua X" — what tells same-named streets apart. */
function resultHint(result: GeocodeResult): string | null {
  const parts: string[] = [];
  if (result.neighborhoods?.length) parts.push(neighborhoodsLabel(result.neighborhoods));
  if (result.crossStreet) parts.push(`esquina com ${result.crossStreet}`);
  return parts.length > 0 ? parts.join(" · ") : null;
}

/** Street search, optionally with the bairro (no house numbers) — the exact spot is then tapped on a map. */
export function AddressSearch({
  onSelect,
  onClear,
  selectedLabel,
  placeholder = "Digite sua rua e bairro",
}: AddressSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [noMatch, setNoMatch] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup-only: cancels a pending debounced lookup on unmount.
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function handleQueryChange(value: string) {
    setQuery(value);
    setNoMatch(false);
    if (selectedLabel) onClear();

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length < 3) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const found = await geocodeAddress(value);
        setResults(found);
        setNoMatch(found.length === 0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }

  function handleSelect(result: GeocodeResult) {
    setQuery(result.label);
    setResults([]);
    setExpanded(false);
    onSelect(result);
  }

  function handleClear() {
    setQuery("");
    setResults([]);
    setNoMatch(false);
    onClear();
  }

  const showSuggestions = expanded && (results.length > 0 || loading || noMatch) && !selectedLabel;

  return (
    <div className="w-full max-w-sm">
      <div className="flex items-center gap-2 bg-surface-container-lowest rounded-2xl shadow-lg border border-outline-variant/30 px-4 py-3">
        <span className="material-symbols-outlined text-on-surface-variant text-[20px]">search</span>
        <input
          value={selectedLabel ?? query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onFocus={() => setExpanded(true)}
          placeholder={placeholder}
          className="flex-1 bg-transparent outline-none text-body-md text-on-surface placeholder:text-on-surface-variant min-w-0"
        />
        {selectedLabel || query ? (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Limpar"
            className="text-on-surface-variant hover:text-on-surface"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        ) : null}
      </div>

      {showSuggestions ? (
        <div className="mt-2 bg-surface-container-lowest rounded-2xl shadow-lg border border-outline-variant/30 overflow-hidden">
          {loading ? (
            <div className="px-4 py-3 text-body-md text-on-surface-variant">Buscando…</div>
          ) : noMatch ? (
            <div className="px-4 py-3 text-body-md text-on-surface-variant">
              Nenhuma rua com esse nome em Canoas. Tente só uma parte do nome, sem o número (o bairro pode ficar).
            </div>
          ) : (
            results.map((result, i) => {
              const hint = resultHint(result);
              return (
                <button
                  key={`${result.lat}-${result.lng}-${i}`}
                  type="button"
                  onClick={() => handleSelect(result)}
                  className="w-full text-left px-4 py-3 text-body-md text-on-surface hover:bg-surface-container-low border-b border-outline-variant/20 flex items-start gap-2"
                >
                  <span className="material-symbols-outlined text-[18px] text-on-surface-variant mt-0.5">
                    location_on
                  </span>
                  <span className="flex flex-col min-w-0">
                    <span className="line-clamp-2">{result.label}</span>
                    {hint ? <span className="text-label-lg text-on-surface-variant line-clamp-1">{hint}</span> : null}
                  </span>
                </button>
              );
            })
          )}
          <p className="px-4 py-1.5 text-[11px] text-on-surface-variant">
            Ruas ©{" "}
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              colaboradores do OpenStreetMap
            </a>
          </p>
        </div>
      ) : null}
    </div>
  );
}
