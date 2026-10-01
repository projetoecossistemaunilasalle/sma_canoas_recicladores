"use client";

import { useState } from "react";
import Link from "next/link";
import { RECYCLING_CATEGORIES } from "./categories";

export function EducationList() {
  const [query, setQuery] = useState("");

  const filtered = RECYCLING_CATEGORIES.filter((category) =>
    category.label
      .toLowerCase()
      .includes(query.trim().toLowerCase())
  );

  return (
    <div className="flex flex-col gap-4">
      {/* BUSCA */}
      <div className="flex items-center gap-2 bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/30 px-4 py-3">
        <span className="material-symbols-outlined text-on-surface-variant text-[20px]">
          search
        </span>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="O que você quer reciclar?"
          className="flex-1 bg-transparent outline-none text-body-md text-on-surface placeholder:text-on-surface-variant"
        />
      </div>

      {/* CATEGORIAS */}
      <div className="grid grid-cols-2 gap-3">
        {filtered.map((category) => (
          <div
            key={category.id}
            className="col-span-2 sm:col-span-1 flex flex-col gap-3 rounded-2xl p-4 shadow-sm border border-outline-variant/30 bg-surface-container-lowest"
          >
            {/* CABEÇALHO */}
            <div className="flex items-center gap-2">
              <span
                className="material-symbols-outlined text-[22px] rounded-full p-1.5"
                style={{
                  backgroundColor: `${category.color}22`,
                  color: category.color,
                }}
              >
                {category.icon}
              </span>

              <span className="text-label-lg text-on-surface">
                {category.label}
              </span>
            </div>

            {/* DESCRIÇÃO */}
            <p className="text-body-md text-on-surface-variant">
              {category.guidance}
            </p>

            {/* SAIBA MAIS */}
            <Link
              href={`/citizen/educacao/${category.id}`}
              className="text-sm font-semibold mt-1 inline-flex items-center gap-1 hover:underline"
              style={{ color: category.color }}
            >
              Saiba mais
              <span className="material-symbols-outlined text-[18px]">
                arrow_forward
              </span>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}