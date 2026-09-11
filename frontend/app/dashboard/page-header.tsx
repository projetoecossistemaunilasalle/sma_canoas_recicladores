import type { ReactNode } from "react";

/** Eyebrow + title (+ optional description/action) repeated at the top of every dashboard page. */
export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      <div className="flex flex-col gap-2">
        <span className="text-label-lg text-primary uppercase tracking-wider">{eyebrow}</span>
        <h1 className="text-display-lg text-on-surface">{title}</h1>
        {description ? <p className="text-body-lg text-on-surface-variant">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

/** Centered placeholder card shown instead of a list when it's empty. */
export function EmptyListCard({ message }: { message: string }) {
  return (
    <div className="bg-surface-container rounded-2xl p-12 text-center">
      <p className="text-body-lg text-on-surface-variant">{message}</p>
    </div>
  );
}
