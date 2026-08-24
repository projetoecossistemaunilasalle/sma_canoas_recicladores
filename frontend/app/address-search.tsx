"use client";

import { useEffect, useRef, useState } from "react";
import { geocodeAddress } from "@/lib/public-api";
import type { GeocodeResult } from "@/lib/types";

export interface AddressSearchProps {
  onSelect: (result: GeocodeResult) => void;
  onClear: () => void;
  selectedLabel: string | null;
}

export function AddressSearch({ onSelect, onClear, selectedLabel }: AddressSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodeResult[]>([]);
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
    onClear();
  }

  const showSuggestions = expanded && (results.length > 0 || loading) && !selectedLabel;

  return (
    <div className="w-full max-w-sm">
      <div className="flex items-center gap-2 bg-surface-container-lowest rounded-2xl shadow-lg border border-outline-variant/30 px-4 py-3">
        <span className="material-symbols-outlined text-on-surface-variant text-[20px]">search</span>
        <input
          value={selectedLabel ?? query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onFocus={() => setExpanded(true)}
          placeholder="Onde você mora?"
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
          ) : (
            results.map((result, i) => (
              <button
                key={`${result.lat}-${result.lng}-${i}`}
                type="button"
                onClick={() => handleSelect(result)}
                className="w-full text-left px-4 py-3 text-body-md text-on-surface hover:bg-surface-container-low border-b border-outline-variant/20 last:border-b-0 flex items-start gap-2"
              >
                <span className="material-symbols-outlined text-[18px] text-on-surface-variant mt-0.5">
                  location_on
                </span>
                <span className="line-clamp-2">{result.label}</span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
