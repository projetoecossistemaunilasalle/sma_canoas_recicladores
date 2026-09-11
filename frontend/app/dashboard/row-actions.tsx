import Link from "next/link";

export function RowActions({
  editHref,
  deleteAction,
}: {
  editHref: string;
  deleteAction: () => Promise<void>;
}) {
  return (
    <>
      <Link
        className="w-10 h-10 flex items-center justify-center shrink-0 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-full transition-colors"
        href={editHref}
        aria-label="Editar"
        title="Editar"
      >
        <span className="material-symbols-outlined">edit</span>
      </Link>
      <form action={deleteAction}>
        <button
          className="w-10 h-10 flex items-center justify-center shrink-0 text-on-surface-variant hover:text-error hover:bg-error-container rounded-full transition-colors"
          type="submit"
          aria-label="Excluir"
          title="Excluir"
        >
          <span className="material-symbols-outlined">delete</span>
        </button>
      </form>
    </>
  );
}
