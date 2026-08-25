"use client";

import { useState } from "react";
import { RECYCLING_CATEGORIES } from "./categories";

export function EducationList() {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = RECYCLING_CATEGORIES.filter((c) =>
    c.label.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/30 px-4 py-3">
        <span className="material-symbols-outlined text-on-surface-variant text-[20px]">search</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="O que você quer reciclar?"
          className="flex-1 bg-transparent outline-none text-body-md text-on-surface placeholder:text-on-surface-variant"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {filtered.map((category) => {
          const isOpen = expanded === category.id;
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => setExpanded(isOpen ? null : category.id)}
              className={`text-left col-span-2 sm:col-span-1 flex flex-col gap-2 rounded-2xl p-4 shadow-sm border transition-shadow ${
                isOpen ? "border-primary shadow-md" : "border-outline-variant/30 hover:shadow-md"
              } bg-surface-container-lowest`}
            >
              <div className="flex items-center gap-2">
                <span
                  className="material-symbols-outlined text-[22px] rounded-full p-1.5"
                  style={{ backgroundColor: `${category.color}22`, color: category.color }}
                >
                  {category.icon}
                </span>
                <span className="text-label-lg text-on-surface">{category.label}</span>
              </div>
              {isOpen ? (
                <p className="text-body-md text-on-surface-variant">{category.guidance}</p>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
