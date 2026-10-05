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
    <section className="rounded-3xl bg-[#fff8df] border border-[#f1df9b] p-5 md:p-7">

      {/* TÍTULO */}

      <div className="mb-5">
        <p className="text-sm font-semibold text-[#55733c] uppercase tracking-wide">
          Informação
        </p>

        <h2 className="text-2xl font-bold text-on-surface mt-1">
          Como reciclar?
        </h2>

        <p className="text-body-md text-on-surface-variant mt-2">
          Veja como separar e descartar corretamente cada tipo de material.
        </p>
      </div>

      {/* BUSCA */}

      <div className="flex items-center gap-2 bg-white rounded-2xl border border-[#e8dfc4] px-4 py-3 shadow-sm mb-5">

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

      {/* 8 MATERIAIS */}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {filtered.map((category) => (
          <article
            key={category.id}
            className="bg-white rounded-2xl border border-[#eee5c7] p-5 shadow-sm flex flex-col"
          >

            {/* ÍCONE */}

            <div
              className="w-11 h-11 rounded-full flex items-center justify-center mb-4"
              style={{
                backgroundColor: `${category.color}18`,
                color: category.color,
              }}
            >
              <span className="material-symbols-outlined text-[22px]">
                {category.icon}
              </span>
            </div>

            {/* NOME */}

            <h3 className="text-lg font-bold text-on-surface">
              {category.label}
            </h3>

            {/* DESCRIÇÃO */}

            <p className="text-sm text-on-surface-variant mt-3 leading-6 flex-1">
              {category.guidance}
            </p>

            {/* LINK */}

            <Link
              href={`/citizen/educacao/${category.id}`}
              className="mt-4 text-sm font-semibold inline-flex items-center gap-1"
              style={{
                color: "#55733c",
              }}
            >
              Saiba mais
              <span className="text-lg">
                →
              </span>
            </Link>

          </article>
        ))}

      </div>

    </section>
  );
}