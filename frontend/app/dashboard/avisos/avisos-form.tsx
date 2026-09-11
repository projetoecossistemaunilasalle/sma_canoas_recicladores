"use client";

import { useRef, useState, useTransition } from "react";
import { createAnnouncementAction, updateAnnouncementAction, deleteAnnouncementAction } from "./actions";
import { toBase64Image, ImageValidationError } from "@/lib/image-upload";
import { relativeTime } from "@/lib/format";
import type { Announcement, AnnouncementType } from "@/lib/types";

const TYPES: { value: AnnouncementType; label: string }[] = [
  { value: "aviso", label: "Aviso" },
  { value: "noticia", label: "Notícia" },
];

function ImageField({
  label,
  value,
  onChange,
  onError,
}: {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  onError: (message: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      onChange(await toBase64Image(file));
    } catch (err) {
      onError(err instanceof ImageValidationError ? err.message : "Não foi possível carregar a imagem.");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-label-lg text-on-surface-variant">{label}</p>
      {value ? (
        <div className="relative w-32 h-32">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="w-32 h-32 object-cover rounded-xl" />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-surface-container-lowest shadow border border-outline-variant/40 flex items-center justify-center"
            aria-label="Remover imagem"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-32 h-32 rounded-xl border-2 border-dashed border-outline-variant/50 flex flex-col items-center justify-center gap-1 text-on-surface-variant hover:border-primary hover:text-primary transition-colors"
        >
          <span className="material-symbols-outlined text-[24px]">add_photo_alternate</span>
          <span className="text-label-lg">Até 1MB</span>
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
    </div>
  );
}

export function AvisosForm({ recentPosts }: { recentPosts: Announcement[] }) {
  const [type, setType] = useState<AnnouncementType>("aviso");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [mainImage, setMainImage] = useState<string | null>(null);
  const [subImage1, setSubImage1] = useState<string | null>(null);
  const [subImage2, setSubImage2] = useState<string | null>(null);
  const [posts, setPosts] = useState(recentPosts);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const [deletePending, startDeleteTransition] = useTransition();

  function reset() {
    setType("aviso");
    setTitle("");
    setBody("");
    setMainImage(null);
    setSubImage1(null);
    setSubImage2(null);
    setEditingId(null);
  }

  function startEdit(post: Announcement) {
    setStatus(null);
    setType(post.type);
    setTitle(post.title ?? "");
    setBody(post.body);
    setMainImage(post.mainImage);
    setSubImage1(post.subImage1);
    setSubImage2(post.subImage2);
    setEditingId(post.id);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    const data = {
      type,
      title: title.trim() || undefined,
      body,
      mainImage,
      subImage1,
      subImage2,
    };
    startTransition(async () => {
      const { result, error } = editingId
        ? await updateAnnouncementAction(editingId, data)
        : await createAnnouncementAction(data);
      if (error) {
        setStatus({ type: "error", message: error });
      } else if (result) {
        setStatus({ type: "success", message: editingId ? "Alterações salvas." : "Publicado com sucesso." });
        setPosts((prev) => (editingId ? prev.map((p) => (p.id === result.id ? result : p)) : [result, ...prev]));
        reset();
      }
    });
  }

  function handleDelete(id: string) {
    setStatus(null);
    setDeletingId(id);
    startDeleteTransition(async () => {
      const { error } = await deleteAnnouncementAction(id);
      if (error) {
        setStatus({ type: "error", message: error });
      } else {
        setPosts((prev) => prev.filter((p) => p.id !== id));
        if (editingId === id) reset();
      }
      setDeletingId(null);
    });
  }

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start">
      <form onSubmit={handleSubmit} className="flex-1 min-w-0 w-full flex flex-col gap-6 bg-surface-container rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col gap-2">
          <p className="text-label-lg text-on-surface-variant">Tipo</p>
          <div className="flex gap-2">
            {TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setType(t.value)}
                className={`h-10 px-5 rounded-full text-label-lg transition-colors ${
                  type === t.value
                    ? "bg-primary text-on-primary"
                    : "bg-surface-container-highest text-on-surface-variant"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-label-lg text-on-surface-variant" htmlFor="aviso-title">
            Título (opcional)
          </label>
          <input
            id="aviso-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            className="w-full bg-surface-container-highest text-on-surface rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-label-lg text-on-surface-variant" htmlFor="aviso-body">
            Texto
          </label>
          <textarea
            id="aviso-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            rows={6}
            className="w-full bg-surface-container-highest text-on-surface rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary resize-y"
          />
        </div>

        <div className="flex flex-wrap gap-4 sm:gap-6">
          <ImageField
            label="Imagem principal"
            value={mainImage}
            onChange={setMainImage}
            onError={(message) => setStatus({ type: "error", message })}
          />
          <ImageField
            label="Imagem extra 1"
            value={subImage1}
            onChange={setSubImage1}
            onError={(message) => setStatus({ type: "error", message })}
          />
          <ImageField
            label="Imagem extra 2"
            value={subImage2}
            onChange={setSubImage2}
            onError={(message) => setStatus({ type: "error", message })}
          />
        </div>

        {status ? (
          <p className={`text-label-lg ${status.type === "error" ? "text-error" : "text-primary"}`} role="status">
            {status.message}
          </p>
        ) : null}

        <div className="pt-2 flex items-center gap-3">
          <button
            type="submit"
            disabled={pending || !body.trim()}
            className="w-full sm:w-auto h-12 px-10 bg-primary text-on-primary text-action-lg rounded-full hover:bg-primary-container transition-all disabled:opacity-70"
          >
            {pending ? "Salvando..." : editingId ? "Salvar alterações" : "Publicar"}
          </button>
          {editingId ? (
            <button
              type="button"
              onClick={reset}
              className="h-12 px-5 text-on-surface-variant hover:text-on-surface transition-colors text-label-lg"
            >
              Cancelar edição
            </button>
          ) : null}
        </div>
      </form>

      <div className="w-full lg:w-2/5 min-w-0 flex flex-col gap-3 lg:sticky lg:top-6">
        <p className="text-label-lg text-on-surface-variant uppercase tracking-wider">Publicações recentes</p>
        {posts.map((p) => (
          <div
            key={p.id}
            className={`bg-surface-container-lowest rounded-2xl p-4 shadow-sm border ${
              editingId === p.id ? "border-primary" : "border-outline-variant/30"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-label-lg text-primary">{p.type === "noticia" ? "Notícia" : "Aviso"}</span>
              <span className="text-label-lg text-on-surface-variant">{relativeTime(p.createdAt)}</span>
            </div>
            {p.title ? <p className="text-title-lg text-on-surface mt-1 break-words">{p.title}</p> : null}
            <p className="text-body-md text-on-surface whitespace-pre-wrap break-words mt-1">{p.body}</p>
            <div className="flex items-center gap-1 mt-2 -mb-1 -mr-1 justify-end">
              <button
                type="button"
                onClick={() => startEdit(p)}
                className="w-9 h-9 flex items-center justify-center shrink-0 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-full transition-colors"
                aria-label="Editar"
                title="Editar"
              >
                <span className="material-symbols-outlined text-[20px]">edit</span>
              </button>
              <button
                type="button"
                onClick={() => handleDelete(p.id)}
                disabled={deletePending && deletingId === p.id}
                className="w-9 h-9 flex items-center justify-center shrink-0 text-on-surface-variant hover:text-error hover:bg-error-container rounded-full transition-colors disabled:opacity-50"
                aria-label="Excluir"
                title="Excluir"
              >
                <span className="material-symbols-outlined text-[20px]">delete</span>
              </button>
            </div>
          </div>
        ))}
        {posts.length === 0 ? <p className="text-body-md text-on-surface-variant">Nenhuma publicação ainda.</p> : null}
      </div>
    </div>
  );
}
