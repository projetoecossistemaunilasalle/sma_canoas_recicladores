"use client";

import { useState } from "react";
import { relativeTime } from "@/lib/format";
import type { Announcement, AnnouncementType } from "@/lib/types";

const TABS: { value: AnnouncementType; label: string }[] = [
  { value: "noticia", label: "Notícias" },
  { value: "aviso", label: "Avisos" },
];

export function AvisosList({ announcements }: { announcements: Announcement[] }) {
  const [tab, setTab] = useState<AnnouncementType>("noticia");
  const filtered = announcements.filter((a) => a.type === tab);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex bg-surface-container-lowest rounded-full p-1 shadow-sm border border-outline-variant/30">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={`flex-1 h-10 rounded-full text-label-lg transition-colors ${
              tab === t.value ? "bg-primary text-on-primary" : "text-on-surface-variant"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-4">
        {filtered.map((a) => (
          <article
            key={a.id}
            className="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-sm border border-outline-variant/30 flex flex-col"
          >
            {a.mainImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={a.mainImage} alt="" className="w-full max-h-64 object-cover" />
            ) : null}
            <div className="p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-label-lg text-primary">{a.cooperativeName}</span>
                <span className="text-label-lg text-on-surface-variant">{relativeTime(a.createdAt)}</span>
              </div>
              {a.title ? <p className="text-title-lg text-on-surface">{a.title}</p> : null}
              <p className="text-body-md text-on-surface whitespace-pre-wrap break-words">{a.body}</p>
              {a.subImage1 || a.subImage2 ? (
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {a.subImage1 ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.subImage1} alt="" className="w-full h-32 object-cover rounded-xl" />
                  ) : null}
                  {a.subImage2 ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.subImage2} alt="" className="w-full h-32 object-cover rounded-xl" />
                  ) : null}
                </div>
              ) : null}
            </div>
          </article>
        ))}
        {filtered.length === 0 ? (
          <p className="text-body-md text-on-surface-variant">
            Nenhum{tab === "aviso" ? " aviso" : "a notícia"} publicad{tab === "aviso" ? "o" : "a"} ainda.
          </p>
        ) : null}
      </div>
    </div>
  );
}
